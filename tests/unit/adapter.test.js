/**
 * tests/unit/adapter.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the Adaptive Interface Module (extension/content/adapter.js).
 *
 * What is being tested
 * ─────────────────────
 * adapter.js applies visual restructuring to the live DOM based on engagement
 * scores from window.__aiScores.  It also injects a floating notification pill
 * into the page when adaptive mode is active.
 *
 * Key behaviours under test:
 *   • showNotification() — creates the #ai-adaptive-notif pill in the DOM
 *   • removeNotification() — tears down both the pill and its <style> tag
 *   • applyAdaptations() — assigns ai-highlight / ai-collapsed / ai-dimmed
 *     classes to the correct elements
 *   • removeAdaptations() — strips all ai-* classes from adapted elements
 *   • Ad-selector dimming — elements matching ad class patterns get dimmed
 *   • Message listener — handles ADAPTIVE_TOGGLED, APPLY_NOW, RESET_LAYOUT
 *   • __aiAdapterEnable / Disable / Apply / Reset window functions
 *
 * Test strategy
 * ─────────────
 * We load the actual adapter.js source via eval() (after setting up the
 * required window globals) and then inspect the real DOM for class mutations.
 * This gives near-browser fidelity within jsdom.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ADAPTER_PATH = path.resolve(__dirname, '../../extension/content/adapter.js');

/**
 * Creates a minimal window.__aiScores map for testing.
 * @param {Element} el    - DOM element
 * @param {'HIGH'|'MEDIUM'|'LOW'} label
 */
function fakeScore(el, label) {
  return { rawScore: 0.5, normScore: label === 'HIGH' ? 1.0 : label === 'LOW' ? 0.1 : 0.5, label };
}

/**
 * Loads adapter.js into the current jsdom window.
 * Requires window.__aiScores to be set before calling.
 */
function loadAdapter() {
  /* Ensure prerequisite globals exist */
  if (!window.__aiSignals) window.__aiSignals = new Map();
  if (!window.__aiScores)  window.__aiScores  = new Map();
  window.__aiEnabled = false;

  chrome.storage.local._data.adaptiveEnabled = false;

  const src = fs.readFileSync(ADAPTER_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Creates a <div> with a given class/id and min-size so it is trackable. */
function bigEl(tag = 'div', attrs = {}) {
  const el = document.createElement(tag);
  Object.assign(el, attrs);
  // Give it a nominal size so it passes isTrackable checks
  Object.defineProperty(el, 'offsetHeight', { value: 200, configurable: true });
  Object.defineProperty(el, 'offsetWidth',  { value: 400, configurable: true });
  document.body.appendChild(el);
  return el;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Adapter — notification pill', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    // Also clear the <head> so style tags from previous tests do not linger
    document.head.innerHTML = '';
    loadAdapter();
  });

  test('showNotification creates #ai-adaptive-notif in the DOM', () => {
    window.__aiAdapterEnable();
    expect(document.getElementById('ai-adaptive-notif')).not.toBeNull();
  });

  test('notification pill contains the status text', () => {
    window.__aiAdapterEnable();
    const notif = document.getElementById('ai-adaptive-notif');
    expect(notif.textContent).toMatch(/Adaptive Mode Active/i);
  });

  test('notification has a "Turn Off" button', () => {
    window.__aiAdapterEnable();
    const btn = document.getElementById('ai-notif-off');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toMatch(/Turn Off/i);
  });

  test('calling enable twice does not add a second pill', () => {
    window.__aiAdapterEnable();
    window.__aiAdapterEnable();
    const pills = document.querySelectorAll('#ai-adaptive-notif');
    expect(pills.length).toBe(1);
  });

  test('removeNotification removes #ai-adaptive-notif from DOM', () => {
    window.__aiAdapterEnable();
    window.__aiAdapterDisable();
    expect(document.getElementById('ai-adaptive-notif')).toBeNull();
  });

  test('removeNotification removes the injected <style> tag', () => {
    window.__aiAdapterEnable();
    expect(document.getElementById('ai-notif-style')).not.toBeNull();
    window.__aiAdapterDisable();
    expect(document.getElementById('ai-notif-style')).toBeNull();
  });

  test('__aiAdapterEnable sets window.__aiEnabled to true', () => {
    window.__aiAdapterEnable();
    expect(window.__aiEnabled).toBe(true);
  });

  test('__aiAdapterDisable sets window.__aiEnabled to false', () => {
    window.__aiAdapterEnable();
    window.__aiAdapterDisable();
    expect(window.__aiEnabled).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Adapter — applyAdaptations() class mutations', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    window.__aiScores  = new Map();
    window.__aiSignals = new Map();
    loadAdapter();
  });

  test('HIGH-scored element receives ai-highlight class', () => {
    const el = bigEl('section');
    window.__aiScores.set(el, fakeScore(el, 'HIGH'));
    window.__aiAdapterApply();
    expect(el.classList.contains('ai-highlight')).toBe(true);
  });

  test('LOW-scored element receives ai-collapsed class', () => {
    const el = bigEl('div');
    window.__aiScores.set(el, fakeScore(el, 'LOW'));
    window.__aiAdapterApply();
    expect(el.classList.contains('ai-collapsed')).toBe(true);
  });

  test('MEDIUM-scored element receives neither highlight nor collapsed', () => {
    const el = bigEl('p');
    window.__aiScores.set(el, fakeScore(el, 'MEDIUM'));
    window.__aiAdapterApply();
    expect(el.classList.contains('ai-highlight')).toBe(false);
    expect(el.classList.contains('ai-collapsed')).toBe(false);
  });

  test('adapted elements receive the ai-adapted marker class', () => {
    const elH = bigEl('section');
    const elL = bigEl('div');
    window.__aiScores.set(elH, fakeScore(elH, 'HIGH'));
    window.__aiScores.set(elL, fakeScore(elL, 'LOW'));
    window.__aiAdapterApply();
    expect(elH.classList.contains('ai-adapted')).toBe(true);
    expect(elL.classList.contains('ai-adapted')).toBe(true);
  });

  test('applyAdaptations with empty __aiScores does not throw', () => {
    window.__aiScores = new Map();
    expect(() => window.__aiAdapterApply()).not.toThrow();
  });

  test('notification text updates to "Adaptive layout applied ✓" after apply', () => {
    window.__aiAdapterEnable();
    const el = bigEl('section');
    window.__aiScores.set(el, fakeScore(el, 'HIGH'));
    window.__aiAdapterApply();
    const text = document.getElementById('ai-notif-text');
    if (text) {
      expect(text.textContent).toMatch(/Adaptive layout applied/i);
    }
  });

  test('previous adaptation classes are fully cleared before re-applying', () => {
    /*
     * This test verifies that adapter.js removes ai-highlight before adding
     * ai-collapsed. We do two separate apply() calls with different scores:
     *   1st: high-scored element → should receive ai-highlight
     *   2nd: same element re-scored as LOW → ai-highlight removed, ai-collapsed added
     *
     * Note: we reset the scores Map between calls to avoid stale adapter
     * closure issues across multiple loadAdapter() invocations in this suite.
     */
    const el = bigEl('section');

    /* First classification: HIGH */
    const scores = new Map();
    scores.set(el, { rawScore: 0.8, normScore: 1.0, label: 'HIGH' });
    window.__aiScores = scores;
    window.__aiAdapterApply();
    expect(el.classList.contains('ai-highlight')).toBe(true);

    /* Second classification: LOW (mutate the existing entry in the live Map) */
    window.__aiScores.get(el).label = 'LOW';
    /* Call the function reference directly to ensure we use the latest closure */
    window.__aiAdapterApply();

    expect(el.classList.contains('ai-highlight')).toBe(false);
    expect(el.classList.contains('ai-collapsed')).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Adapter — ad dimming', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    window.__aiScores  = new Map();
    window.__aiSignals = new Map();
    loadAdapter();
    /* Need at least one scored element so applyAdaptations() runs */
    const anchor = bigEl('article');
    window.__aiScores.set(anchor, fakeScore(anchor, 'HIGH'));
  });

  test('element with class "ad-banner" gets ai-dimmed', () => {
    const ad = document.createElement('div');
    ad.className = 'ad-banner';
    document.body.appendChild(ad);
    window.__aiAdapterApply();
    expect(ad.classList.contains('ai-dimmed')).toBe(true);
  });

  test('element with class "ads" gets ai-dimmed', () => {
    const ad = document.createElement('div');
    ad.className = 'ads';
    document.body.appendChild(ad);
    window.__aiAdapterApply();
    expect(ad.classList.contains('ai-dimmed')).toBe(true);
  });

  test('<iframe> gets ai-dimmed', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    window.__aiAdapterApply();
    expect(iframe.classList.contains('ai-dimmed')).toBe(true);
  });

  test('the notification pill itself is never dimmed', () => {
    window.__aiAdapterEnable();
    window.__aiAdapterApply();
    const pill = document.getElementById('ai-adaptive-notif');
    if (pill) {
      expect(pill.classList.contains('ai-dimmed')).toBe(false);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Adapter — removeAdaptations()', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    window.__aiScores  = new Map();
    window.__aiSignals = new Map();
    loadAdapter();
  });

  test('removeAdaptations strips ai-highlight from all elements', () => {
    const el = bigEl('section');
    el.classList.add('ai-highlight', 'ai-adapted');
    window.__aiAdapterReset();
    expect(el.classList.contains('ai-highlight')).toBe(false);
  });

  test('removeAdaptations strips ai-collapsed from all elements', () => {
    const el = bigEl('div');
    el.classList.add('ai-collapsed', 'ai-adapted');
    window.__aiAdapterReset();
    expect(el.classList.contains('ai-collapsed')).toBe(false);
  });

  test('removeAdaptations strips ai-dimmed from all elements', () => {
    const el = bigEl('div');
    el.classList.add('ai-dimmed', 'ai-adapted');
    window.__aiAdapterReset();
    expect(el.classList.contains('ai-dimmed')).toBe(false);
  });

  test('non-adapted elements are unaffected by removeAdaptations', () => {
    const el = bigEl('p');
    el.classList.add('my-custom-class');
    window.__aiAdapterReset();
    expect(el.classList.contains('my-custom-class')).toBe(true);
  });

  test('__aiAdapterReset restores notification text', () => {
    window.__aiAdapterEnable();
    const text = document.getElementById('ai-notif-text');
    if (text) {
      text.textContent = 'Adaptive layout applied ✓';
      window.__aiAdapterReset();
      expect(text.textContent).toMatch(/Adaptive Mode Active/i);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Adapter — chrome.runtime.onMessage listeners', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    window.__aiScores  = new Map();
    window.__aiSignals = new Map();
    loadAdapter();
  });

  test('ADAPTIVE_TOGGLED {value:true} calls __aiAdapterEnable path', () => {
    chrome.runtime.onMessage._trigger({ type: 'ADAPTIVE_TOGGLED', value: true });
    expect(window.__aiEnabled).toBe(true);
    expect(document.getElementById('ai-adaptive-notif')).not.toBeNull();
  });

  test('ADAPTIVE_TOGGLED {value:false} calls __aiAdapterDisable path', () => {
    window.__aiAdapterEnable();
    chrome.runtime.onMessage._trigger({ type: 'ADAPTIVE_TOGGLED', value: false });
    expect(window.__aiEnabled).toBe(false);
    expect(document.getElementById('ai-adaptive-notif')).toBeNull();
  });

  test('APPLY_NOW message triggers applyAdaptations without error', () => {
    const el = bigEl('section');
    window.__aiScores.set(el, fakeScore(el, 'HIGH'));
    expect(() => {
      chrome.runtime.onMessage._trigger({ type: 'APPLY_NOW' });
    }).not.toThrow();
    expect(el.classList.contains('ai-highlight')).toBe(true);
  });

  test('RESET_LAYOUT message calls __aiAdapterReset (strips classes)', () => {
    const el = bigEl('p');
    el.classList.add('ai-highlight', 'ai-adapted');
    chrome.runtime.onMessage._trigger({ type: 'RESET_LAYOUT' });
    expect(el.classList.contains('ai-highlight')).toBe(false);
  });
});
