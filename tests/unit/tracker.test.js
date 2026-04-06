/**
 * tests/unit/tracker.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the Interaction Tracking Module (extension/content/tracker.js).
 *
 * What is being tested
 * ─────────────────────
 * tracker.js collects five raw attention signals per DOM element and exposes
 * three key window globals:
 *   • window.__aiSignals           — Map<Element, SignalData>
 *   • window.__aiResetSignals()    — zeroes all signals for a new task
 *   • window.__aiGetTaskMetrics()  — returns per-task delta metrics
 *
 * Test strategy
 * ─────────────
 * 1. Pure-logic tests (no DOM): verify signal accumulation maths, reset
 *    correctness, and metric derivations directly using the mirrored helper
 *    functions.
 * 2. Integration tests: load the actual tracker.js into jsdom, then
 *    synthesise signal data and invoke the window globals to assert behaviour.
 *
 * Coverage targets
 * ─────────────────
 * • makeSignal() shape and defaults
 * • isTrackable() size / tag filters
 * • Signal accumulation helpers (hover, click, viewport, scroll)
 * • __aiResetSignals() zeroes all fields, preserves _inViewport
 * • __aiGetTaskMetrics() — deltaClicks, scrollDeltaPx, attentionFocusRatio
 * • ADAPTIVE_TOGGLED message listener toggles window.__aiEnabled
 * • RESET_SIGNALS message listener calls __aiResetSignals()
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — Pure logic: signal shape and accumulation maths
   ══════════════════════════════════════════════════════════════════════════ */

/* Mirrors the makeSignal() factory from tracker.js */
function makeSignal(overrides = {}) {
  return {
    hoverMs:      0,
    viewportMs:   0,
    clickCount:   0,
    scrollPauses: 0,
    revisits:     0,
    _hoverStart:  null,
    _inViewport:  false,
    _viewStart:   null,
    _wasInView:   false,
    ...overrides,
  };
}

/* Mirrors getTotalClicks() from tracker.js */
function getTotalClicks(signalMap) {
  let total = 0;
  signalMap.forEach((sig) => { total += sig.clickCount; });
  return total;
}

/* Mirrors the attentionFocusRatio computation from __aiGetTaskMetrics() */
function computeFocusRatio(signalMap, scoreMap) {
  let highMs = 0, totalMs = 0;
  scoreMap.forEach((score, el) => {
    const sig = signalMap.get(el);
    if (!sig) return;
    totalMs += sig.viewportMs;
    if (score.label === 'HIGH') highMs += sig.viewportMs;
  });
  return totalMs > 0 ? parseFloat((highMs / totalMs).toFixed(3)) : 0;
}

describe('Tracker — signal data shape', () => {
  test('makeSignal() creates the correct fields at zero', () => {
    const sig = makeSignal();
    expect(sig.hoverMs).toBe(0);
    expect(sig.viewportMs).toBe(0);
    expect(sig.clickCount).toBe(0);
    expect(sig.scrollPauses).toBe(0);
    expect(sig.revisits).toBe(0);
    expect(sig._hoverStart).toBeNull();
    expect(sig._inViewport).toBe(false);
    expect(sig._viewStart).toBeNull();
    expect(sig._wasInView).toBe(false);
  });

  test('makeSignal() accepts overrides for individual fields', () => {
    const sig = makeSignal({ hoverMs: 1500, clickCount: 3 });
    expect(sig.hoverMs).toBe(1500);
    expect(sig.clickCount).toBe(3);
    expect(sig.viewportMs).toBe(0); // untouched defaults remain 0
  });
});

describe('Tracker — click counting maths', () => {
  test('getTotalClicks() returns 0 for empty map', () => {
    expect(getTotalClicks(new Map())).toBe(0);
  });

  test('getTotalClicks() sums clicks across all elements', () => {
    const sigMap = new Map([
      [document.createElement('p'),   makeSignal({ clickCount: 3 })],
      [document.createElement('div'), makeSignal({ clickCount: 7 })],
    ]);
    expect(getTotalClicks(sigMap)).toBe(10);
  });

  test('deltaClicks = total at stop minus total at start', () => {
    const elA = document.createElement('p');
    const elB = document.createElement('p');
    const sigMap = new Map([
      [elA, makeSignal({ clickCount: 2 })],
      [elB, makeSignal({ clickCount: 3 })],
    ]);
    const clickAtStart = 1; // simulates __aiTaskClickStart snapshotted before
    const delta = getTotalClicks(sigMap) - clickAtStart;
    expect(delta).toBe(4); // 5 total − 1 at start
  });
});

describe('Tracker — attentionFocusRatio maths', () => {
  test('returns 0 when no elements have viewport time', () => {
    const sigMap   = new Map([[document.createElement('p'), makeSignal()]]);
    const scoreMap = new Map();
    expect(computeFocusRatio(sigMap, scoreMap)).toBe(0);
  });

  test('returns 1.0 when all viewport time is on HIGH elements', () => {
    const el     = document.createElement('p');
    const sigMap = new Map([[el, makeSignal({ viewportMs: 10000 })]]);
    const scoreMap = new Map([[el, { label: 'HIGH' }]]);
    expect(computeFocusRatio(sigMap, scoreMap)).toBeCloseTo(1.0, 3);
  });

  test('returns 0 when all viewport time is on LOW elements', () => {
    const el     = document.createElement('p');
    const sigMap = new Map([[el, makeSignal({ viewportMs: 10000 })]]);
    const scoreMap = new Map([[el, { label: 'LOW' }]]);
    expect(computeFocusRatio(sigMap, scoreMap)).toBe(0);
  });

  test('returns 0.5 when high and medium have equal viewport time', () => {
    const elH  = document.createElement('p');
    const elM  = document.createElement('p');
    const sigMap = new Map([
      [elH, makeSignal({ viewportMs: 5000 })],
      [elM, makeSignal({ viewportMs: 5000 })],
    ]);
    const scoreMap = new Map([
      [elH, { label: 'HIGH'   }],
      [elM, { label: 'MEDIUM' }],
    ]);
    expect(computeFocusRatio(sigMap, scoreMap)).toBeCloseTo(0.5, 3);
  });

  test('ratio is clamped to 3 decimal places (toFixed(3))', () => {
    const el     = document.createElement('p');
    const sigMap = new Map([[el, makeSignal({ viewportMs: 7777 })]]);
    const scoreMap = new Map([[el, { label: 'HIGH' }]]);
    const ratio  = computeFocusRatio(sigMap, scoreMap);
    const parts  = ratio.toString().split('.');
    if (parts[1]) expect(parts[1].length).toBeLessThanOrEqual(3);
  });
});

describe('Tracker — signal reset logic', () => {
  /**
   * Mirrors __aiResetSignals() from tracker.js.
   * Elements that are currently in the viewport keep a live _viewStart.
   */
  function resetSignals(sigMap, currentScrollY = 0) {
    const now = Date.now();
    sigMap.forEach((sig) => {
      sig.hoverMs      = 0;
      sig.viewportMs   = 0;
      sig.clickCount   = 0;
      sig.scrollPauses = 0;
      sig.revisits     = 0;
      sig._hoverStart  = null;
      sig._viewStart   = sig._inViewport ? now : null;
      sig._wasInView   = false;
    });
    return currentScrollY; // represents __aiTaskScrollStart = window.scrollY
  }

  test('all numeric signal fields are zeroed after reset', () => {
    const sigMap = new Map([
      [
        document.createElement('div'),
        makeSignal({ hoverMs: 5000, viewportMs: 12000, clickCount: 4, scrollPauses: 6, revisits: 3 }),
      ],
    ]);
    resetSignals(sigMap);
    const sig = sigMap.values().next().value;
    expect(sig.hoverMs).toBe(0);
    expect(sig.viewportMs).toBe(0);
    expect(sig.clickCount).toBe(0);
    expect(sig.scrollPauses).toBe(0);
    expect(sig.revisits).toBe(0);
    expect(sig._wasInView).toBe(false);
    expect(sig._hoverStart).toBeNull();
  });

  test('_viewStart is reset to null if element was NOT in viewport', () => {
    const sig    = makeSignal({ _inViewport: false, _viewStart: 12345 });
    const sigMap = new Map([[document.createElement('p'), sig]]);
    resetSignals(sigMap);
    expect(sigMap.values().next().value._viewStart).toBeNull();
  });

  test('_viewStart is set to ~now if element IS currently in the viewport', () => {
    const before = Date.now();
    const sig    = makeSignal({ _inViewport: true });
    const sigMap = new Map([[document.createElement('p'), sig]]);
    resetSignals(sigMap);
    const after  = Date.now();
    const viewStart = sigMap.values().next().value._viewStart;
    expect(viewStart).toBeGreaterThanOrEqual(before);
    expect(viewStart).toBeLessThanOrEqual(after);
  });

  test('scrollY snapshot is returned as the new task baseline', () => {
    const sigMap = new Map();
    const snap = resetSignals(sigMap, 800);
    expect(snap).toBe(800);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — Integration: load actual tracker.js, test window globals
   ══════════════════════════════════════════════════════════════════════════ */

describe('Tracker — window globals (integration)', () => {
  const TRACKER_PATH = path.resolve(__dirname, '../../extension/content/tracker.js');

  function loadTracker() {
    /* Clear any stale globals */
    window.__aiSignals      = undefined;
    window.__aiEnabled      = undefined;
    window.__aiResetSignals = undefined;
    window.__aiGetTaskMetrics = undefined;

    /* tracker.js reads adaptiveEnabled from chrome.storage.local on boot */
    chrome.storage.local._data.adaptiveEnabled = false;

    const src = fs.readFileSync(TRACKER_PATH, 'utf8');
    // eslint-disable-next-line no-new-func
    new Function(src)();
  }

  beforeEach(() => {
    chrome._reset();
    loadTracker();
  });

  test('window.__aiSignals is a Map after tracker loads', () => {
    expect(window.__aiSignals).toBeInstanceOf(Map);
  });

  test('window.__aiEnabled defaults to false (no stored state)', () => {
    expect(window.__aiEnabled).toBe(false);
  });

  test('window.__aiResetSignals is a function', () => {
    expect(typeof window.__aiResetSignals).toBe('function');
  });

  test('window.__aiGetTaskMetrics is a function', () => {
    expect(typeof window.__aiGetTaskMetrics).toBe('function');
  });

  test('ADAPTIVE_TOGGLED message with value=true sets __aiEnabled=true', () => {
    chrome.runtime.onMessage._trigger({ type: 'ADAPTIVE_TOGGLED', value: true });
    expect(window.__aiEnabled).toBe(true);
  });

  test('ADAPTIVE_TOGGLED message with value=false sets __aiEnabled=false', () => {
    window.__aiEnabled = true;
    chrome.runtime.onMessage._trigger({ type: 'ADAPTIVE_TOGGLED', value: false });
    expect(window.__aiEnabled).toBe(false);
  });

  test('RESET_SIGNALS message invokes __aiResetSignals (clears data)', () => {
    /* Manually populate a signal */
    const el = document.createElement('section');
    document.body.appendChild(el);
    window.__aiSignals.set(el, makeSignal({ clickCount: 5, viewportMs: 3000 }));

    chrome.runtime.onMessage._trigger({ type: 'RESET_SIGNALS' });

    const sig = window.__aiSignals.get(el);
    expect(sig.clickCount).toBe(0);
    expect(sig.viewportMs).toBe(0);

    document.body.removeChild(el);
  });

  test('__aiGetTaskMetrics returns an object with the required fields', () => {
    const metrics = window.__aiGetTaskMetrics();
    expect(metrics).toHaveProperty('deltaClicks');
    expect(metrics).toHaveProperty('scrollDeltaPx');
    expect(metrics).toHaveProperty('attentionFocusRatio');
    expect(metrics).toHaveProperty('topElements');
  });

  test('__aiGetTaskMetrics topElements is an array', () => {
    const metrics = window.__aiGetTaskMetrics();
    expect(Array.isArray(metrics.topElements)).toBe(true);
  });

  test('__aiGetTaskMetrics scrollDeltaPx is a non-negative integer', () => {
    const { scrollDeltaPx } = window.__aiGetTaskMetrics();
    expect(Number.isInteger(scrollDeltaPx)).toBe(true);
    expect(scrollDeltaPx).toBeGreaterThanOrEqual(0);
  });
});
