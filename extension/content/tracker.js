// ─── Interaction Tracking Module ───────────────────────────────────────────
// Collects raw attention signals per DOM element.
// Populates window.__aiSignals = Map<Element, SignalData>

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const MIN_ELEMENT_HEIGHT = 80;   // px — ignore tiny elements
  const MIN_ELEMENT_WIDTH  = 100;  // px
  const SCROLL_PAUSE_THRESHOLD_MS = 600; // ms of stillness = a scroll pause
  const TRACK_INTERVAL_MS = 500;   // how often viewport time ticks

  // Structural tags we don't adapt (they're always present)
  const SKIP_TAGS = new Set(['HTML','BODY','HEAD','SCRIPT','STYLE','NOSCRIPT','SVG']);

  // ── State ────────────────────────────────────────────────────────────────
  window.__aiSignals = new Map();  // Element → SignalData
  window.__aiEnabled = false;      // toggled by service worker message

  function makeSignal() {
    return {
      hoverMs:      0,
      viewportMs:   0,
      clickCount:   0,
      scrollPauses: 0,
      revisits:     0,
      _hoverStart:  null,
      _inViewport:  false,
      _viewStart:   null,
      _wasInView:   false   // for revisit detection
    };
  }

  // ── Element Selection ────────────────────────────────────────────────────
  function isTrackable(el) {
    if (SKIP_TAGS.has(el.tagName)) return false;
    const rect = el.getBoundingClientRect();
    // Use offsetHeight/offsetWidth to avoid 0 before layout
    const h = el.offsetHeight || rect.height;
    const w = el.offsetWidth  || rect.width;
    return h >= MIN_ELEMENT_HEIGHT && w >= MIN_ELEMENT_WIDTH;
  }

  function getTrackedElements() {
    const candidates = document.querySelectorAll(
      'article, section, p, h1, h2, h3, h4, aside, div, li, blockquote, figure, table'
    );
    return Array.from(candidates).filter(isTrackable);
  }

  function ensureSignal(el) {
    if (!window.__aiSignals.has(el)) {
      window.__aiSignals.set(el, makeSignal());
    }
    return window.__aiSignals.get(el);
  }

  // ── Hover Tracking ───────────────────────────────────────────────────────
  function attachHoverListeners(el) {
    el.addEventListener('mouseenter', () => {
      if (!window.__aiEnabled) return;
      const sig = ensureSignal(el);
      sig._hoverStart = Date.now();
    }, { passive: true });

    el.addEventListener('mouseleave', () => {
      if (!window.__aiEnabled) return;
      const sig = window.__aiSignals.get(el);
      if (sig && sig._hoverStart !== null) {
        sig.hoverMs += Date.now() - sig._hoverStart;
        sig._hoverStart = null;
      }
    }, { passive: true });
  }

  // ── Click Tracking ───────────────────────────────────────────────────────
  function attachClickListener(el) {
    el.addEventListener('click', () => {
      if (!window.__aiEnabled) return;
      ensureSignal(el).clickCount += 1;
    }, { passive: true });
  }

  // ── Viewport (IntersectionObserver) ─────────────────────────────────────
  const viewportObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!window.__aiEnabled) return;
      const el  = entry.target;
      const sig = ensureSignal(el);

      if (entry.isIntersecting) {
        sig._inViewport = true;
        sig._viewStart  = Date.now();
        if (sig._wasInView) {
          sig.revisits += 1;
        }
      } else {
        if (sig._inViewport && sig._viewStart !== null) {
          sig.viewportMs += Date.now() - sig._viewStart;
          sig._viewStart  = null;
        }
        sig._inViewport = false;
        sig._wasInView  = true;
      }
    });
  }, { threshold: 0.3 }); // element must be 30% visible

  // ── Scroll Pause Tracking ────────────────────────────────────────────────
  let scrollTimer = null;
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (!window.__aiEnabled) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      // Scroll paused — find all elements currently in viewport
      window.__aiSignals.forEach((sig, el) => {
        if (sig._inViewport) {
          sig.scrollPauses += 1;
        }
      });
    }, SCROLL_PAUSE_THRESHOLD_MS);
  }, { passive: true });

  // ── Periodic Viewport Time Tick ──────────────────────────────────────────
  // Accumulates viewportMs for elements currently in view (handles long reads)
  setInterval(() => {
    if (!window.__aiEnabled) return;
    const now = Date.now();
    window.__aiSignals.forEach((sig) => {
      if (sig._inViewport && sig._viewStart !== null) {
        sig.viewportMs += now - sig._viewStart;
        sig._viewStart  = now; // reset tick start
      }
    });
  }, TRACK_INTERVAL_MS);

  // ── Initialise Tracking on All Elements ─────────────────────────────────
  function initTracking() {
    const elements = getTrackedElements();
    elements.forEach((el) => {
      ensureSignal(el);
      attachHoverListeners(el);
      attachClickListener(el);
      viewportObserver.observe(el);
    });
    console.log(`[Tracker] Tracking ${elements.length} elements.`);
  }

  // ── Handle Dynamic Pages (SPAs) ──────────────────────────────────────────
  const mutationObserver = new MutationObserver(() => {
    // Re-run tracking for any new elements added to DOM
    const elements = getTrackedElements();
    elements.forEach((el) => {
      if (!window.__aiSignals.has(el)) {
        ensureSignal(el);
        attachHoverListeners(el);
        attachClickListener(el);
        viewportObserver.observe(el);
      }
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  // ── Per-task scroll tracking ─────────────────────────────────────────────
  // Stores scrollY at task start so we can compute delta scroll per task
  window.__aiTaskScrollStart = 0;
  window.__aiTaskClickStart  = 0; // total clicks at task start

  function getTotalClicks() {
    let total = 0;
    window.__aiSignals.forEach((sig) => { total += sig.clickCount; });
    return total;
  }

  // ── Expose per-task metrics ──────────────────────────────────────────────
  window.__aiGetTaskMetrics = function () {
    const totalClicks   = getTotalClicks();
    const deltaClicks   = totalClicks - window.__aiTaskClickStart;
    const scrollDelta   = Math.abs(window.scrollY - window.__aiTaskScrollStart);

    // Attention focus ratio: time on HIGH-scored elements / total viewport time
    let highMs = 0, totalMs = 0;
    if (window.__aiScores) {
      window.__aiScores.forEach((score, el) => {
        const sig = window.__aiSignals.get(el);
        if (!sig) return;
        totalMs += sig.viewportMs;
        if (score.label === 'HIGH') highMs += sig.viewportMs;
      });
    }
    const focusRatio = totalMs > 0 ? (highMs / totalMs) : 0;

    return {
      deltaClicks,
      scrollDeltaPx: Math.round(scrollDelta),
      attentionFocusRatio: parseFloat(focusRatio.toFixed(3)),
      topElements: typeof window.__aiGetTopElements === 'function'
        ? window.__aiGetTopElements(3) : []
    };
  };

  // ── Reset all signals (called at start of each task) ─────────────────────
  window.__aiResetSignals = function () {
    window.__aiSignals.forEach((sig) => {
      sig.hoverMs      = 0;
      sig.viewportMs   = 0;
      sig.clickCount   = 0;
      sig.scrollPauses = 0;
      sig.revisits     = 0;
      sig._hoverStart  = null;
      sig._viewStart   = sig._inViewport ? Date.now() : null;
      sig._wasInView   = false;
    });
    window.__aiTaskScrollStart = window.scrollY;
    window.__aiTaskClickStart  = 0;
    console.log('[Tracker] Signals reset for new task.');
  };

  // ── Listen for toggle from service worker ────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ADAPTIVE_TOGGLED') {
      window.__aiEnabled = message.value;
      if (message.value) {
        console.log('[Tracker] Enabled — collecting signals.');
      } else {
        console.log('[Tracker] Disabled.');
      }
    }
    if (message.type === 'RESET_SIGNALS') {
      window.__aiResetSignals();
    }
  });

  // ── Boot ─────────────────────────────────────────────────────────────────
  // Check persisted state on load
  chrome.storage.local.get(['adaptiveEnabled'], (data) => {
    window.__aiEnabled = data.adaptiveEnabled || false;
    initTracking();
  });

})();
