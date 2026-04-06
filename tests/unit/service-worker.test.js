/**
 * tests/unit/service-worker.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the background Service Worker (extension/background/service-worker.js).
 *
 * What is being tested
 * ─────────────────────
 * The service worker acts as the central message broker. It handles 7 message
 * types and manages state in chrome.storage.local:
 *
 *   GET_STATE     — reads adaptiveEnabled + studyMode from storage
 *   SET_ADAPTIVE  — persists enabled flag, forwards ADAPTIVE_TOGGLED to tab
 *   SET_STUDY_MODE— persists studyMode flag
 *   LOG_SESSION   — appends a task record to sessionData[]
 *   CLEAR_SESSION — wipes sessionData[]
 *   RESET_SIGNALS — forwards RESET_SIGNALS to the active tab
 *   APPLY_NOW     — forwards APPLY_NOW to the active tab
 *   RESET_LAYOUT  — forwards RESET_LAYOUT to the active tab
 *
 * Test strategy
 * ─────────────
 * We load the service-worker.js source via eval() after setting up the global
 * chrome mock.  Each test:
 *   1. Uses chrome._reset() to clear storage and listener lists.
 *   2. Re-loads the script so listeners are freshly registered.
 *   3. Either triggers chrome.runtime.onInstalled._trigger() or sends a
 *      message via chrome.runtime.onMessage._trigger().
 *   4. Inspects chrome.storage.local._data and jest mock call history.
 *
 * NOTE (jsdom / Node environment)
 * ────────────────────────────────
 * The service worker normally runs in a Worker context.  Jest runs it in
 * Node/jsdom, which is fine here because the script only uses Chrome API
 * calls (no DOM access) — all mocked by chrome-mock.js.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '../../extension/background/service-worker.js');

/**
 * (Re-)loads the service worker script into the current Node/jsdom context.
 * Returns the sendResponse mock returned by the last onMessage._trigger call,
 * or null if no message was triggered.
 */
function loadSW() {
  const src = fs.readFileSync(SW_PATH, 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
}

/* Helper: trigger onInstalled and await microtasks */
async function install() {
  loadSW();
  chrome.runtime.onInstalled._trigger({ reason: 'install' });
  await Promise.resolve(); // flush storage.set callback
}

/* Helper: send a message and return the sendResponse mock */
function send(msg) {
  loadSW();
  return chrome.runtime.onMessage._trigger(msg);
}

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — onInstalled', () => {
  beforeEach(() => chrome._reset());

  test('registers an onInstalled listener on load', () => {
    loadSW();
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
  });

  test('sets adaptiveEnabled=false in storage on first install', async () => {
    await install();
    expect(chrome.storage.local._data.adaptiveEnabled).toBe(false);
  });

  test('sets studyMode=false in storage on first install', async () => {
    await install();
    expect(chrome.storage.local._data.studyMode).toBe(false);
  });

  test('sets sessionData=[] in storage on first install', async () => {
    await install();
    expect(chrome.storage.local._data.sessionData).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — GET_STATE', () => {
  beforeEach(() => {
    chrome._reset();
    chrome.storage.local._data.adaptiveEnabled = true;
    chrome.storage.local._data.studyMode       = false;
  });

  test('GET_STATE calls sendResponse with stored values', () => {
    const sendResponse = send({ type: 'GET_STATE' });
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ adaptiveEnabled: true, studyMode: false })
    );
  });

  test('GET_STATE registers an onMessage listener', () => {
    loadSW();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — SET_ADAPTIVE', () => {
  beforeEach(() => chrome._reset());

  test('SET_ADAPTIVE persists value=true to storage', () => {
    send({ type: 'SET_ADAPTIVE', value: true });
    expect(chrome.storage.local._data.adaptiveEnabled).toBe(true);
  });

  test('SET_ADAPTIVE persists value=false to storage', () => {
    chrome.storage.local._data.adaptiveEnabled = true;
    send({ type: 'SET_ADAPTIVE', value: false });
    expect(chrome.storage.local._data.adaptiveEnabled).toBe(false);
  });

  test('SET_ADAPTIVE forwards ADAPTIVE_TOGGLED to the active tab', () => {
    /* Make sure tabs.query returns a tab */
    const fakeTab = { id: 42 };
    chrome.tabs.query.mockImplementation((_, cb) => cb([fakeTab]));

    send({ type: 'SET_ADAPTIVE', value: true });

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      { type: 'ADAPTIVE_TOGGLED', value: true }
    );
  });

  test('SET_ADAPTIVE calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'SET_ADAPTIVE', value: true });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  test('SET_ADAPTIVE does not forward message if no active tab', () => {
    chrome.tabs.query.mockImplementation((_, cb) => cb([]));
    expect(() => send({ type: 'SET_ADAPTIVE', value: true })).not.toThrow();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — SET_STUDY_MODE', () => {
  beforeEach(() => chrome._reset());

  test('SET_STUDY_MODE persists value to storage', () => {
    send({ type: 'SET_STUDY_MODE', value: true });
    expect(chrome.storage.local._data.studyMode).toBe(true);
  });

  test('SET_STUDY_MODE calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'SET_STUDY_MODE', value: true });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — LOG_SESSION', () => {
  beforeEach(() => {
    chrome._reset();
    chrome.storage.local._data.sessionData = [];
  });

  test('LOG_SESSION appends the payload to sessionData', () => {
    const payload = { participantId: 'P01', condition: 'A', taskDurationS: 34.2 };
    send({ type: 'LOG_SESSION', payload });
    expect(chrome.storage.local._data.sessionData).toHaveLength(1);
    expect(chrome.storage.local._data.sessionData[0]).toMatchObject(payload);
  });

  test('LOG_SESSION appends to existing records (does not overwrite)', () => {
    chrome.storage.local._data.sessionData = [{ participantId: 'P00' }];
    const payload = { participantId: 'P01', condition: 'B', taskDurationS: 22.1 };
    send({ type: 'LOG_SESSION', payload });
    expect(chrome.storage.local._data.sessionData).toHaveLength(2);
  });

  test('LOG_SESSION creates sessionData array if missing from storage', () => {
    delete chrome.storage.local._data.sessionData;
    const payload = { participantId: 'P02' };
    send({ type: 'LOG_SESSION', payload });
    expect(Array.isArray(chrome.storage.local._data.sessionData)).toBe(true);
    expect(chrome.storage.local._data.sessionData).toHaveLength(1);
  });

  test('LOG_SESSION calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'LOG_SESSION', payload: {} });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — CLEAR_SESSION', () => {
  beforeEach(() => {
    chrome._reset();
    chrome.storage.local._data.sessionData = [{ x: 1 }, { x: 2 }, { x: 3 }];
  });

  test('CLEAR_SESSION resets sessionData to []', () => {
    send({ type: 'CLEAR_SESSION' });
    expect(chrome.storage.local._data.sessionData).toEqual([]);
  });

  test('CLEAR_SESSION calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'CLEAR_SESSION' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — Tab-forwarding messages', () => {
  const fakeTab = { id: 99 };

  beforeEach(() => {
    chrome._reset();
    chrome.tabs.query.mockImplementation((_, cb) => cb([fakeTab]));
  });

  test('RESET_SIGNALS forwards { type: "RESET_SIGNALS" } to active tab', () => {
    send({ type: 'RESET_SIGNALS' });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(99, { type: 'RESET_SIGNALS' });
  });

  test('APPLY_NOW forwards { type: "APPLY_NOW" } to active tab', () => {
    send({ type: 'APPLY_NOW' });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(99, { type: 'APPLY_NOW' });
  });

  test('RESET_LAYOUT forwards { type: "RESET_LAYOUT" } to active tab', () => {
    send({ type: 'RESET_LAYOUT' });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(99, { type: 'RESET_LAYOUT' });
  });

  test('RESET_SIGNALS calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'RESET_SIGNALS' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  test('APPLY_NOW calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'APPLY_NOW' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  test('RESET_LAYOUT calls sendResponse with {ok:true}', () => {
    const sendResponse = send({ type: 'RESET_LAYOUT' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  test('forwarding messages do not crash when no tab is active', () => {
    chrome.tabs.query.mockImplementation((_, cb) => cb([]));
    expect(() => send({ type: 'RESET_SIGNALS' })).not.toThrow();
    expect(() => send({ type: 'APPLY_NOW' })).not.toThrow();
    expect(() => send({ type: 'RESET_LAYOUT' })).not.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Worker — unknown message types', () => {
  beforeEach(() => chrome._reset());

  test('unknown message type does not throw', () => {
    expect(() => send({ type: 'TOTALLY_UNKNOWN' })).not.toThrow();
  });

  test('unknown message type does not modify storage', () => {
    chrome.storage.local._data.sessionData = [{ x: 1 }];
    send({ type: 'BOGUS_MESSAGE' });
    expect(chrome.storage.local._data.sessionData).toHaveLength(1);
  });
});
