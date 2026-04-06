/**
 * tests/unit/scorer.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the Engagement Scoring Engine (extension/content/scorer.js).
 *
 * What is being tested
 * ─────────────────────
 * scorer.js reads window.__aiSignals (a Map<Element, SignalData>) and produces
 * window.__aiScores (a Map<Element, { rawScore, normScore, label }>).
 *
 * Test strategy
 * ─────────────
 * Because scorer.js is an IIFE that writes to window globals, we:
 *   1. Re-implement the pure scoring mathematics here and test those directly
 *      (fast, no DOM side-effects, covers all edge cases).
 *   2. Load the actual scorer.js source via eval() into the jsdom window and
 *      exercise the public window.__aiScores / __aiGetTopElements interface
 *      (integration-style, tests the real code path).
 *
 * Coverage targets
 * ─────────────────
 * • rawScore() — weighted sum with per-signal caps
 * • normalisation relative to session maximum
 * • HIGH / MEDIUM / LOW classification thresholds
 * • __aiGetTopElements() — sorting and slicing
 * • Edge cases: zero signals, single element, all identical scores
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — Pure maths (no DOM needed)
   We replicate the exact logic from scorer.js so these tests remain stable
   even if the file structure changes.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Replicates scorer.js rawScore() — weighted, capped contribution of each
 * signal dimension.
 */
const WEIGHTS = {
  viewportMs:   0.30,
  hoverMs:      0.25,
  clickCount:   0.20,
  scrollPauses: 0.15,
  revisits:     0.10,
};
const THRESHOLD_HIGH = 0.60;
const THRESHOLD_LOW  = 0.30;

function rawScore(sig) {
  const viewport = Math.min(sig.viewportMs,   60000);
  const hover    = Math.min(sig.hoverMs,       30000);
  const clicks   = Math.min(sig.clickCount,    10);
  const pauses   = Math.min(sig.scrollPauses,  20);
  const revisits = Math.min(sig.revisits,      10);

  return (
    (viewport  / 60000) * WEIGHTS.viewportMs   +
    (hover     / 30000) * WEIGHTS.hoverMs       +
    (clicks    / 10)    * WEIGHTS.clickCount    +
    (pauses    / 20)    * WEIGHTS.scrollPauses  +
    (revisits  / 10)    * WEIGHTS.revisits
  );
}

function classify(normScore) {
  return normScore >= THRESHOLD_HIGH ? 'HIGH'
       : normScore <= THRESHOLD_LOW  ? 'LOW'
       : 'MEDIUM';
}

/* ── helpers for building signal objects ────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════ */

describe('Scorer — rawScore() pure maths', () => {
  test('returns 0 for a completely cold element (all zeros)', () => {
    const score = rawScore(makeSignal());
    expect(score).toBe(0);
  });

  test('returns 1.0 for a fully-saturated element (all signals at cap)', () => {
    const sig = makeSignal({
      viewportMs:   60000,
      hoverMs:      30000,
      clickCount:   10,
      scrollPauses: 20,
      revisits:     10,
    });
    expect(rawScore(sig)).toBeCloseTo(1.0, 6);
  });

  test('viewportMs contributes 0.30 when at cap, others zero', () => {
    const sig = makeSignal({ viewportMs: 60000 });
    expect(rawScore(sig)).toBeCloseTo(0.30, 6);
  });

  test('hoverMs contributes 0.25 when at cap, others zero', () => {
    const sig = makeSignal({ hoverMs: 30000 });
    expect(rawScore(sig)).toBeCloseTo(0.25, 6);
  });

  test('clickCount contributes 0.20 when at cap (10 clicks), others zero', () => {
    const sig = makeSignal({ clickCount: 10 });
    expect(rawScore(sig)).toBeCloseTo(0.20, 6);
  });

  test('scrollPauses contributes 0.15 when at cap (20 pauses), others zero', () => {
    const sig = makeSignal({ scrollPauses: 20 });
    expect(rawScore(sig)).toBeCloseTo(0.15, 6);
  });

  test('revisits contributes 0.10 when at cap (10 revisits), others zero', () => {
    const sig = makeSignal({ revisits: 10 });
    expect(rawScore(sig)).toBeCloseTo(0.10, 6);
  });

  test('values above the cap are clamped (viewportMs > 60 000 ms)', () => {
    const atCap     = rawScore(makeSignal({ viewportMs: 60000 }));
    const overCap   = rawScore(makeSignal({ viewportMs: 999999 }));
    expect(overCap).toBeCloseTo(atCap, 6);
  });

  test('values above the cap are clamped (clickCount > 10)', () => {
    const atCap   = rawScore(makeSignal({ clickCount: 10 }));
    const overCap = rawScore(makeSignal({ clickCount: 500 }));
    expect(overCap).toBeCloseTo(atCap, 6);
  });

  test('partial signals produce proportional fractional score', () => {
    // 50 % of viewportMs cap only
    const sig   = makeSignal({ viewportMs: 30000 });
    const score = rawScore(sig);
    expect(score).toBeCloseTo(0.30 * 0.5, 6);
  });

  test('all weights sum to 1.0', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 6);
  });
});

/* ══════════════════════════════════════════════════════════════════════════ */

describe('Scorer — normalisation & classification', () => {
  test('single element always gets normScore 1.0 and label HIGH', () => {
    const maxRaw  = rawScore(makeSignal({ viewportMs: 10000 }));
    const normScore = maxRaw > 0 ? maxRaw / maxRaw : 0;
    expect(normScore).toBe(1.0);
    expect(classify(normScore)).toBe('HIGH');
  });

  test('element with zero signals vs high-signal peer gets normScore 0 → LOW', () => {
    const a = rawScore(makeSignal({ viewportMs: 60000 }));
    const b = rawScore(makeSignal());
    const maxRaw = Math.max(a, b);
    const normB  = maxRaw > 0 ? b / maxRaw : 0;
    expect(normB).toBe(0);
    expect(classify(normB)).toBe('LOW');
  });

  test('normScore 0.60 is classified as HIGH (boundary)', () => {
    expect(classify(0.60)).toBe('HIGH');
  });

  test('normScore 0.599 is classified as MEDIUM', () => {
    expect(classify(0.599)).toBe('MEDIUM');
  });

  test('normScore 0.30 is classified as LOW (boundary)', () => {
    expect(classify(0.30)).toBe('LOW');
  });

  test('normScore 0.301 is classified as MEDIUM', () => {
    expect(classify(0.301)).toBe('MEDIUM');
  });

  test('normScore 0.50 is classified as MEDIUM', () => {
    expect(classify(0.50)).toBe('MEDIUM');
  });

  test('maximum element among many elements always gets normScore 1.0', () => {
    const signals = [
      makeSignal({ viewportMs: 60000, hoverMs: 30000 }),
      makeSignal({ viewportMs: 5000 }),
      makeSignal({ viewportMs: 1000, scrollPauses: 2 }),
    ];
    const raws  = signals.map(rawScore);
    const maxR  = Math.max(...raws);
    const norms = raws.map((r) => (maxR > 0 ? r / maxR : 0));
    expect(norms[0]).toBeCloseTo(1.0, 6);
  });

  test('two identical elements both get normScore 1.0', () => {
    const sig = makeSignal({ viewportMs: 20000, clickCount: 3 });
    const r   = rawScore(sig);
    const norm = r > 0 ? r / r : 0;   // max = r, so each = 1.0
    expect(norm).toBeCloseTo(1.0, 6);
    expect(classify(norm)).toBe('HIGH');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — Integration: load actual scorer.js and test window globals
   ══════════════════════════════════════════════════════════════════════════ */

describe('Scorer — window globals (integration)', () => {
  const SCORER_PATH = path.resolve(__dirname, '../../extension/content/scorer.js');

  /**
   * Bootstrap scorer.js into the current jsdom window.
   * We also need window.__aiSignals and window.__aiEnabled to exist first.
   */
  function loadScorer() {
    window.__aiSignals = new Map();
    window.__aiEnabled = true;
    const src = fs.readFileSync(SCORER_PATH, 'utf8');
    // eslint-disable-next-line no-new-func
    new Function(src)();
  }

  beforeEach(() => {
    window.__aiSignals = new Map();
    window.__aiScores  = new Map();
    window.__aiEnabled = true;
  });

  test('window.__aiScores is a Map after scorer loads', () => {
    loadScorer();
    expect(window.__aiScores).toBeInstanceOf(Map);
  });

  test('window.__aiGetTopElements is a function after scorer loads', () => {
    loadScorer();
    expect(typeof window.__aiGetTopElements).toBe('function');
  });

  test('__aiGetTopElements returns [] when no signals', () => {
    loadScorer();
    const top = window.__aiGetTopElements(5);
    expect(Array.isArray(top)).toBe(true);
    expect(top.length).toBe(0);
  });

  test('__aiGetTopElements ranks by normScore descending', () => {
    loadScorer();

    /* Create two real DOM elements with different engagement levels */
    const elHigh = document.createElement('section');
    elHigh.textContent = 'High engagement section';
    document.body.appendChild(elHigh);

    const elLow = document.createElement('section');
    elLow.textContent = 'Low engagement section';
    document.body.appendChild(elLow);

    /* Manually set scores as if scorer computed them */
    window.__aiScores = new Map([
      [elHigh, { rawScore: 0.8, normScore: 1.0,  label: 'HIGH' }],
      [elLow,  { rawScore: 0.1, normScore: 0.125, label: 'LOW'  }],
    ]);

    window.__aiSignals = new Map([
      [elHigh, makeSignal({ viewportMs: 60000 })],
      [elLow,  makeSignal({ viewportMs: 5000  })],
    ]);

    const top = window.__aiGetTopElements(2);
    expect(top[0].normScore).toBeGreaterThanOrEqual(top[1].normScore);

    /* Cleanup */
    document.body.removeChild(elHigh);
    document.body.removeChild(elLow);
  });

  test('__aiGetTopElements respects the n limit', () => {
    loadScorer();

    /* Inject 5 scored elements */
    const els = [];
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('p');
      document.body.appendChild(el);
      els.push(el);
      window.__aiScores.set(el, { rawScore: i * 0.1, normScore: i * 0.2, label: 'MEDIUM' });
    }

    expect(window.__aiGetTopElements(3).length).toBe(3);
    expect(window.__aiGetTopElements(1).length).toBe(1);

    els.forEach((el) => document.body.removeChild(el));
  });

  test('__aiGetTopElements text snippet is truncated to 60 chars', () => {
    loadScorer();

    const el = document.createElement('p');
    el.textContent = 'A'.repeat(200);
    document.body.appendChild(el);
    window.__aiScores.set(el, { rawScore: 0.5, normScore: 1.0, label: 'HIGH' });

    const top = window.__aiGetTopElements(1);
    expect(top[0].text.length).toBeLessThanOrEqual(60);
    document.body.removeChild(el);
  });
});
