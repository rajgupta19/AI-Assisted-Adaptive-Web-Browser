// ─── AI Engagement Scoring Engine ──────────────────────────────────────────
// Reads window.__aiSignals, computes a 0–1 engagement score per element,
// classifies each as HIGH / MEDIUM / LOW, and exposes window.__aiScores.

(function () {
  'use strict';

  // ── Scoring Weights (must sum to 1.0) ────────────────────────────────────
  const WEIGHTS = {
    viewportMs:   0.30,
    hoverMs:      0.25,
    clickCount:   0.20,
    scrollPauses: 0.15,
    revisits:     0.10
  };

  // ── Classification Thresholds ────────────────────────────────────────────
  const THRESHOLD_HIGH = 0.60;
  const THRESHOLD_LOW  = 0.30;

  // ── Score Labels ─────────────────────────────────────────────────────────
  const LABEL = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

  // ── Public state ─────────────────────────────────────────────────────────
  // Map<Element, { rawScore, normScore, label }>
  window.__aiScores = new Map();

  // ── Raw score for one element ────────────────────────────────────────────
  function rawScore(sig) {
    // Cap individual signals to avoid one dimension dominating
    const viewport  = Math.min(sig.viewportMs,   60000); // cap at 60s
    const hover     = Math.min(sig.hoverMs,       30000); // cap at 30s
    const clicks    = Math.min(sig.clickCount,    10);
    const pauses    = Math.min(sig.scrollPauses,  20);
    const revisits  = Math.min(sig.revisits,      10);

    return (
      (viewport  / 60000) * WEIGHTS.viewportMs   +
      (hover     / 30000) * WEIGHTS.hoverMs       +
      (clicks    / 10)    * WEIGHTS.clickCount    +
      (pauses    / 20)    * WEIGHTS.scrollPauses  +
      (revisits  / 10)    * WEIGHTS.revisits
    );
  }

  // ── Compute scores for all tracked elements ──────────────────────────────
  function computeScores() {
    const signals = window.__aiSignals;
    if (!signals || signals.size === 0) return;

    // Step 1 — raw scores
    const rawMap = new Map();
    let maxRaw = 0;

    signals.forEach((sig, el) => {
      const r = rawScore(sig);
      rawMap.set(el, r);
      if (r > maxRaw) maxRaw = r;
    });

    // Step 2 — normalise 0–1 relative to session maximum
    window.__aiScores = new Map();
    rawMap.forEach((r, el) => {
      const norm  = maxRaw > 0 ? r / maxRaw : 0;
      const label = norm >= THRESHOLD_HIGH ? LABEL.HIGH
                  : norm <= THRESHOLD_LOW  ? LABEL.LOW
                  : LABEL.MEDIUM;

      window.__aiScores.set(el, { rawScore: r, normScore: norm, label });
    });
  }

  // ── Expose utility to get top-N elements by score ────────────────────────
  window.__aiGetTopElements = function (n = 5) {
    const sorted = Array.from(window.__aiScores.entries())
      .sort((a, b) => b[1].normScore - a[1].normScore)
      .slice(0, n);
    return sorted.map(([el, score]) => ({
      tag:      el.tagName,
      text:     (el.innerText || '').slice(0, 60).trim(),
      normScore: Math.round(score.normScore * 100),
      label:    score.label
    }));
  };

  // ── Run scorer on an interval ────────────────────────────────────────────
  // Scores are recomputed every 3 seconds while adaptive mode is on
  setInterval(() => {
    if (window.__aiEnabled) {
      computeScores();
    }
  }, 3000);

  console.log('[Scorer] Engagement scoring engine ready.');

})();
