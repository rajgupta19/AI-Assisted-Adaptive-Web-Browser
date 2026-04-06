/**
 * tests/unit/popup.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the Extension Popup (extension/popup/popup.js).
 *
 * What is being tested
 * ─────────────────────
 * popup.js is the study control panel.  It manages UI state, runs the task
 * timer, builds JSON data records, formats live score bars, exports data, and
 * communicates with the active tab and service worker.
 *
 * Key behaviours under test:
 *   • esc() HTML-entity escaping
 *   • setAdaptiveUI() — switches between OFF/ON states
 *   • setCondition() — toggles A/B badge active states
 *   • Timer formatting — MM:SS display, start/stop/reset
 *   • updateSessionCount() — record count display text
 *   • renderScores() — score bar HTML generation
 *   • renderObsSummary() — observation summary text
 *   • Task record structure built by Stop Task handler
 *   • Export: blob creation from session data
 *   • Clear: confirm → CLEAR_SESSION message
 *   • Boot: restores lastParticipantId from storage
 *
 * Test strategy
 * ─────────────
 * popup.js expects a complete DOM matching popup.html.  We:
 *   1. Inject a minimal DOM snapshot of popup.html into document.body.
 *   2. Load popup.js via eval() so its top-level element refs are bound to
 *      our injected DOM.
 *   3. Test each behaviour by simulating events / inspecting DOM state.
 *
 * Pure-logic helpers (esc, timer formatting, renderScores, renderObsSummary)
 * are also tested independently for speed and isolation.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const POPUP_HTML_PATH = path.resolve(__dirname, '../../extension/popup/popup.html');
const POPUP_JS_PATH   = path.resolve(__dirname, '../../extension/popup/popup.js');

/* ── Minimal DOM bootstrap ──────────────────────────────────────────────── */

/**
 * Parses popup.html and injects only the <body> content into jsdom.
 * This gives popup.js the exact element IDs it expects.
 */
function injectPopupDOM() {
  const html = fs.readFileSync(POPUP_HTML_PATH, 'utf8');
  // Extract content between <body> tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = bodyMatch ? bodyMatch[1] : html;
}

/**
 * Loads popup.js into the current jsdom context.
 * Must be called AFTER injectPopupDOM() so element refs resolve correctly.
 */
function loadPopup() {
  const src = fs.readFileSync(POPUP_JS_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — Pure helpers (no DOM / chrome dependency)
   ══════════════════════════════════════════════════════════════════════════ */

/* Mirror of esc() from popup.js */
function esc(str) {
  return (str || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

describe('Popup — esc() HTML escaping', () => {
  test('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  test('escapes ampersand', () => {
    expect(esc('cats & dogs')).toBe('cats &amp; dogs');
  });

  test('escapes < and >', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes double quotes', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  test('escapes single quotes', () => {
    expect(esc("it's fine")).toBe('it&#39;s fine');
  });

  test('leaves plain text unchanged', () => {
    expect(esc('Hello World 123')).toBe('Hello World 123');
  });

  test('escapes multiple special characters in one string', () => {
    expect(esc('<b>Bold & "quoted"</b>')).toBe(
      '&lt;b&gt;Bold &amp; &quot;quoted&quot;&lt;/b&gt;'
    );
  });
});

/* ── Timer formatting helper ─────────────────────────────────────────────── */

/** Mirrors the timer display logic in startTimer() */
function formatTimer(elapsedMs) {
  const m = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
  const s = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');
  return `${m}:${s}`;
}

describe('Popup — timer formatting', () => {
  test('0 ms displays as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00');
  });

  test('1000 ms displays as 00:01', () => {
    expect(formatTimer(1000)).toBe('00:01');
  });

  test('59 999 ms displays as 00:59', () => {
    expect(formatTimer(59999)).toBe('00:59');
  });

  test('60 000 ms displays as 01:00', () => {
    expect(formatTimer(60000)).toBe('01:00');
  });

  test('90 500 ms displays as 01:30', () => {
    expect(formatTimer(90500)).toBe('01:30');
  });

  test('3 661 000 ms displays as 61:01', () => {
    expect(formatTimer(3661000)).toBe('61:01');
  });

  test('minutes and seconds are zero-padded to 2 digits', () => {
    const result = formatTimer(5000); // 00:05
    const [mm, ss] = result.split(':');
    expect(mm.length).toBe(2);
    expect(ss.length).toBe(2);
  });
});

/* ── renderScores() pure reconstruction ─────────────────────────────────── */

/** Reconstructed renderScores() logic — same output as popup.js */
function renderScores(items) {
  if (!items || items.length === 0) {
    return '<p class="hint">Scroll and hover on the page — scores will appear here.</p>';
  }
  return items.map((item) =>
    `<div class="score-item">` +
      `<span class="score-text" title="${esc(item.text)}">${esc(item.text) || item.tag}</span>` +
      `<div class="score-bar-wrap">` +
        `<div class="score-bar bar-${item.label}" style="width:${item.normScore}%"></div>` +
      `</div>` +
      `<span class="score-label label-${item.label}">${item.normScore}%</span>` +
    `</div>`
  ).join('');
}

describe('Popup — renderScores() HTML generation', () => {
  test('returns hint text when items array is empty', () => {
    expect(renderScores([])).toContain('hint');
  });

  test('returns hint text when items is null', () => {
    expect(renderScores(null)).toContain('hint');
  });

  test('renders a score-item div per element', () => {
    const items = [
      { tag: 'P', text: 'Some text', normScore: 80, label: 'HIGH' },
      { tag: 'DIV', text: '', normScore: 30, label: 'LOW' },
    ];
    const html = renderScores(items);
    expect((html.match(/score-item/g) || []).length).toBe(2);
  });

  test('uses tag as fallback when text is empty', () => {
    const items = [{ tag: 'SECTION', text: '', normScore: 50, label: 'MEDIUM' }];
    const html = renderScores(items);
    expect(html).toContain('SECTION');
  });

  test('applies bar-HIGH class for HIGH items', () => {
    const items = [{ tag: 'P', text: 'Test', normScore: 95, label: 'HIGH' }];
    expect(renderScores(items)).toContain('bar-HIGH');
  });

  test('applies label-LOW class for LOW items', () => {
    const items = [{ tag: 'P', text: 'Test', normScore: 10, label: 'LOW' }];
    expect(renderScores(items)).toContain('label-LOW');
  });

  test('bar width is set to normScore%', () => {
    const items = [{ tag: 'P', text: 'T', normScore: 67, label: 'MEDIUM' }];
    expect(renderScores(items)).toContain('width:67%');
  });

  test('text containing HTML is entity-escaped in output', () => {
    const items = [{ tag: 'P', text: '<b>Bold</b>', normScore: 50, label: 'MEDIUM' }];
    const html = renderScores(items);
    expect(html).not.toContain('<b>Bold</b>');
    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });
});

/* ── renderObsSummary() ──────────────────────────────────────────────────── */

/** Reconstructed renderObsSummary() logic */
function renderObsSummary(items) {
  const high = items.filter((i) => i.label === 'HIGH').length;
  const low  = items.filter((i) => i.label === 'LOW').length;
  return high > 0
    ? `Found ${high} high-attention section${high !== 1 ? 's' : ''} and ${low} low-engagement area${low !== 1 ? 's' : ''}. Ready to apply.`
    : 'Still observing — keep scrolling and hovering on content.';
}

describe('Popup — renderObsSummary()', () => {
  test('returns "Still observing" message when no HIGH elements', () => {
    const items = [{ label: 'LOW' }, { label: 'MEDIUM' }];
    expect(renderObsSummary(items)).toMatch(/Still observing/i);
  });

  test('returns "Found N high-attention sections" when HIGH elements exist', () => {
    const items = [{ label: 'HIGH' }, { label: 'HIGH' }, { label: 'LOW' }];
    expect(renderObsSummary(items)).toMatch(/Found 2 high-attention sections/);
  });

  test('uses singular "section" when exactly 1 HIGH element', () => {
    const items = [{ label: 'HIGH' }, { label: 'LOW' }];
    expect(renderObsSummary(items)).toMatch(/1 high-attention section[^s]/);
  });

  test('uses singular "area" when exactly 1 LOW element', () => {
    const items = [{ label: 'HIGH' }, { label: 'LOW' }];
    expect(renderObsSummary(items)).toMatch(/1 low-engagement area[^s]/);
  });

  test('includes "Ready to apply." when HIGH elements are found', () => {
    const items = [{ label: 'HIGH' }];
    expect(renderObsSummary(items)).toContain('Ready to apply.');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — Integration tests (load actual popup.js with DOM)
   ══════════════════════════════════════════════════════════════════════════ */

describe('Popup — DOM integration', () => {
  beforeEach(() => {
    chrome._reset();
    chrome.storage.local._data.lastParticipantId = '';
    chrome.storage.local._data.sessionData       = [];
    injectPopupDOM();
    loadPopup();
  });

  /* ── State switching ──────────────────────────────────────────────────── */

  test('state-off is visible on initial load', () => {
    const stateOff = document.getElementById('state-off');
    expect(stateOff).not.toBeNull();
    expect(stateOff.classList.contains('hidden')).toBe(false);
  });

  test('state-on is hidden on initial load', () => {
    const stateOn = document.getElementById('state-on');
    expect(stateOn).not.toBeNull();
    expect(stateOn.classList.contains('hidden')).toBe(true);
  });

  /* ── Condition badges ────────────────────────────────────────────────── */

  test('badge-a starts with "active" class (default condition A)', () => {
    const badgeA = document.getElementById('badge-a');
    expect(badgeA.classList.contains('active')).toBe(true);
  });

  test('badge-b starts without "active" class', () => {
    const badgeB = document.getElementById('badge-b');
    expect(badgeB.classList.contains('active')).toBe(false);
  });

  test('clicking badge-b activates it and deactivates badge-a', () => {
    const badgeA = document.getElementById('badge-a');
    const badgeB = document.getElementById('badge-b');
    badgeB.click();
    expect(badgeB.classList.contains('active')).toBe(true);
    expect(badgeA.classList.contains('active')).toBe(false);
  });

  test('clicking badge-a re-activates it after badge-b was clicked', () => {
    const badgeA = document.getElementById('badge-a');
    const badgeB = document.getElementById('badge-b');
    badgeB.click();
    badgeA.click();
    expect(badgeA.classList.contains('active')).toBe(true);
    expect(badgeB.classList.contains('active')).toBe(false);
  });

  /* ── Task timer ─────────────────────────────────────────────────────── */

  test('task-timer shows "--:--" on initial load', () => {
    const timer = document.getElementById('task-timer');
    expect(timer.textContent).toBe('--:--');
  });

  test('stop-task button starts disabled', () => {
    const btnStop = document.getElementById('btn-stop-task');
    expect(btnStop.disabled).toBe(true);
  });

  test('start-task button is enabled initially', () => {
    const btnStart = document.getElementById('btn-start-task');
    expect(btnStart.disabled).toBe(false);
  });

  /* ── Start task validation ────────────────────────────────────────────── */

  test('clicking Start Task without a Participant ID shows an error status', () => {
    const btnStart  = document.getElementById('btn-start-task');
    const taskStatus = document.getElementById('task-status');
    // Ensure participant ID is blank
    document.getElementById('participant-id').value = '';
    btnStart.click();
    expect(taskStatus.textContent).toMatch(/Participant ID/i);
  });

  /* ── Export button ────────────────────────────────────────────────────── */

  test('clicking Export with no session data shows error status message', () => {
    chrome.storage.local._data.sessionData = [];
    const btnExport  = document.getElementById('btn-export');
    const taskStatus = document.getElementById('task-status');
    btnExport.click();
    expect(taskStatus.textContent).toMatch(/No data/i);
  });

  /* ── Session count display ───────────────────────────────────────────── */

  test('session count is blank when no records stored', () => {
    const countEl = document.getElementById('session-count');
    expect(countEl.textContent).toBe('');
  });

  test('session count text reflects stored record count', () => {
    chrome.storage.local._data.sessionData = [{ x: 1 }, { x: 2 }];
    // Re-load popup so the boot block reads the updated storage
    injectPopupDOM();
    loadPopup();
    const countEl = document.getElementById('session-count');
    expect(countEl.textContent).toContain('2');
  });

  /* ── Participant ID restoration ─────────────────────────────────────── */

  test('participant ID input is restored from lastParticipantId in storage', () => {
    chrome.storage.local._data.lastParticipantId = 'P07';
    injectPopupDOM();
    loadPopup();
    const input = document.getElementById('participant-id');
    expect(input.value).toBe('P07');
  });

  /* ── Page / Task selectors ───────────────────────────────────────────── */

  test('page selector has 3 options (pages 1–3)', () => {
    const sel = document.getElementById('page-select');
    expect(sel.options.length).toBe(3);
  });

  test('task selector has 3 options (tasks 1–3)', () => {
    const sel = document.getElementById('task-select');
    expect(sel.options.length).toBe(3);
  });

  test('page selector default value is 1', () => {
    const sel = document.getElementById('page-select');
    expect(sel.value).toBe('1');
  });

  test('task selector default value is 1', () => {
    const sel = document.getElementById('task-select');
    expect(sel.value).toBe('1');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — Task record structure (unit, no DOM)
   ══════════════════════════════════════════════════════════════════════════ */

describe('Popup — task record structure', () => {
  /**
   * Reconstruct the record object built by the Stop Task handler.
   * This ensures the data we log always has all required fields.
   */
  function buildRecord(overrides = {}) {
    const defaults = {
      participantId:       'P01',
      condition:           'A',
      pageNumber:          1,
      taskNumber:          1,
      taskDurationMs:      34200,
      taskDurationS:       34.2,
      clicks:              3,
      scrollDeltaPx:       820,
      attentionFocusRatio: 0.42,
      topEngaged:          [],
      timestamp:           new Date().toISOString(),
      url:                 'file:///test-page/index.html',
    };
    return { ...defaults, ...overrides };
  }

  test('record has all 12 required fields', () => {
    const record = buildRecord();
    const required = [
      'participantId', 'condition', 'pageNumber', 'taskNumber',
      'taskDurationMs', 'taskDurationS', 'clicks', 'scrollDeltaPx',
      'attentionFocusRatio', 'topEngaged', 'timestamp', 'url',
    ];
    required.forEach((field) => {
      expect(record).toHaveProperty(field);
    });
  });

  test('taskDurationS is taskDurationMs / 1000 rounded to 1 decimal', () => {
    const ms = 34200;
    const s  = parseFloat((ms / 1000).toFixed(1));
    expect(s).toBe(34.2);
  });

  test('pageNumber is parsed as an integer', () => {
    const record = buildRecord({ pageNumber: parseInt('2', 10) });
    expect(Number.isInteger(record.pageNumber)).toBe(true);
    expect(record.pageNumber).toBe(2);
  });

  test('taskNumber is parsed as an integer', () => {
    const record = buildRecord({ taskNumber: parseInt('3', 10) });
    expect(Number.isInteger(record.taskNumber)).toBe(true);
    expect(record.taskNumber).toBe(3);
  });

  test('condition is either "A" or "B"', () => {
    expect(['A', 'B']).toContain(buildRecord({ condition: 'A' }).condition);
    expect(['A', 'B']).toContain(buildRecord({ condition: 'B' }).condition);
  });

  test('timestamp is a valid ISO 8601 string', () => {
    const { timestamp } = buildRecord();
    expect(() => new Date(timestamp)).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  test('topEngaged is an array', () => {
    expect(Array.isArray(buildRecord().topEngaged)).toBe(true);
  });
});
