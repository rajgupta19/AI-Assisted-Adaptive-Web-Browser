// ─── Adaptive Interface Module ──────────────────────────────────────────────
// Layout changes are ONLY applied on explicit user request (APPLY_NOW message).
// When adaptive mode is enabled, a floating notification is injected on the page.

(function () {
  'use strict';

  const CLASS_HIGH    = 'ai-highlight';
  const CLASS_LOW     = 'ai-collapsed';
  const CLASS_DIMMED  = 'ai-dimmed';
  const CLASS_ADAPTED = 'ai-adapted';
  const NOTIF_ID      = 'ai-adaptive-notif';

  const AD_SELECTORS = [
    '[class*="ad-"]', '[class*="-ad"]', '[class*="ads"]',
    '[id*="ad-"]',    '[id*="-ad"]',    '[id*="ads"]',
    '[class*="banner"]', '[class*="promo"]', '[class*="sponsor"]',
    '[class*="inline-ad"]', '[class*="ad-widget"]',
    'aside[class*="widget"]', 'iframe'
  ];

  // ── Page notification ────────────────────────────────────────────────────
  function showNotification() {
    if (document.getElementById(NOTIF_ID)) return;

    const notif = document.createElement('div');
    notif.id = NOTIF_ID;
    notif.innerHTML = `
      <div id="ai-notif-dot"></div>
      <span id="ai-notif-text">Adaptive Mode Active — observing your browsing</span>
      <button id="ai-notif-off">Turn Off</button>
    `;
    document.body.appendChild(notif);

    // Inject notification styles directly (scoped to this element)
    const style = document.createElement('style');
    style.id = 'ai-notif-style';
    style.textContent = `
      #ai-adaptive-notif {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #0f172a;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        padding: 10px 16px;
        border-radius: 999px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        border: 1px solid #1e3a5f;
        animation: ai-slide-in 0.3s ease;
        user-select: none;
      }
      @keyframes ai-slide-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #ai-notif-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
        flex-shrink: 0;
        animation: ai-pulse 2s infinite;
      }
      @keyframes ai-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      #ai-notif-text { color: #cbd5e1; white-space: nowrap; }
      #ai-notif-off {
        background: #1e293b;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 999px;
        padding: 3px 12px;
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.2s, color 0.2s;
        white-space: nowrap;
      }
      #ai-notif-off:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
    `;
    document.head.appendChild(style);

    document.getElementById('ai-notif-off').addEventListener('click', () => {
      // Tell service worker to turn off adaptive mode
      chrome.runtime.sendMessage({ type: 'SET_ADAPTIVE', value: false });
      removeNotification();
      removeAdaptations();
      window.__aiEnabled = false;
    });
  }

  function removeNotification() {
    const el = document.getElementById(NOTIF_ID);
    if (el) el.remove();
    const st = document.getElementById('ai-notif-style');
    if (st) st.remove();
  }

  // ── Apply layout (called only on explicit APPLY_NOW) ─────────────────────
  function applyAdaptations() {
    if (!window.__aiScores || window.__aiScores.size === 0) {
      console.log('[Adapter] No scores yet — browse the page a little more first.');
      return;
    }

    // 1. Dim known ad/promo elements
    AD_SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.id === NOTIF_ID) return; // never touch our own notification
          el.classList.add(CLASS_DIMMED, CLASS_ADAPTED);
          el.classList.remove(CLASS_HIGH, CLASS_LOW);
        });
      } catch (_) {}
    });

    // 2. Apply score-based classes
    window.__aiScores.forEach((score, el) => {
      if (el.id === NOTIF_ID) return;
      if (el.classList.contains(CLASS_DIMMED)) return;

      el.classList.remove(CLASS_HIGH, CLASS_LOW, CLASS_ADAPTED);

      if (score.label === 'HIGH') {
        el.classList.add(CLASS_HIGH, CLASS_ADAPTED);
      } else if (score.label === 'LOW') {
        el.classList.add(CLASS_LOW, CLASS_ADAPTED);
      }
    });

    // Update notification text to reflect applied state
    const notifText = document.getElementById('ai-notif-text');
    if (notifText) {
      notifText.textContent = 'Adaptive layout applied ✓';
    }

    console.log('[Adapter] Customized layout applied.');
  }

  // ── Reset to original layout ─────────────────────────────────────────────
  function removeAdaptations() {
    document.querySelectorAll('.' + CLASS_ADAPTED).forEach((el) => {
      el.classList.remove(CLASS_HIGH, CLASS_LOW, CLASS_DIMMED, CLASS_ADAPTED);
    });
    console.log('[Adapter] Layout reset to original.');
  }

  // ── Expose functions for direct popup → executeScript calls ─────────────
  window.__aiAdapterEnable = function () {
    window.__aiEnabled = true;
    showNotification();
  };

  window.__aiAdapterDisable = function () {
    window.__aiEnabled = false;
    removeNotification();
    removeAdaptations();
  };

  window.__aiAdapterApply = function () {
    return applyAdaptations();
  };

  window.__aiAdapterReset = function () {
    removeAdaptations();
    const notifText = document.getElementById('ai-notif-text');
    if (notifText) notifText.textContent = 'Adaptive Mode Active — observing your browsing';
  };

  // ── Message listener (fallback for non-file pages) ────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ADAPTIVE_TOGGLED') {
      if (message.value) { window.__aiAdapterEnable(); }
      else                { window.__aiAdapterDisable(); }
    }
    if (message.type === 'APPLY_NOW')    { applyAdaptations(); }
    if (message.type === 'RESET_LAYOUT') { window.__aiAdapterReset(); }
  });

  // ── Boot — restore state if page reloads while adaptive is on ───────────
  chrome.storage.local.get(['adaptiveEnabled'], (data) => {
    if (data.adaptiveEnabled) showNotification();
  });

  console.log('[Adapter] Adaptive interface module ready.');

})();
