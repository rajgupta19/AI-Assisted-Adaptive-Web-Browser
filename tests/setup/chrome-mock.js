/**
 * tests/setup/chrome-mock.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Installs a complete stub of the Chrome Extension API onto the global scope.
 *
 * Why this file exists
 * ─────────────────────
 * Chrome extension scripts call `chrome.runtime`, `chrome.storage.local`,
 * `chrome.tabs`, and `chrome.scripting` — none of which exist in a Node/jsdom
 * test environment. This file creates jest mock functions that faithfully
 * replicate the async callback-based API surface so that scripts can be loaded
 * and exercised without a real browser.
 *
 * Design decisions
 * ─────────────────
 * • All async methods accept optional callbacks AND return Promises so tests
 *   can `await` them if desired.
 * • `chrome.storage.local._data`  — an in-memory object that acts as the
 *   persistent store.  Tests can read/mutate it directly.
 * • `chrome.runtime._trigger(msg)` — helper that fires all registered
 *   `onMessage` listeners so tests can simulate incoming messages.
 * • `chrome.runtime.onInstalled._trigger()` — simulates the extension being
 *   installed.
 * • Every jest.fn() is available for standard expect(fn).toHaveBeenCalled()
 *   assertions.
 * • `global.chrome._reset()` resets storage and clears listener arrays.
 *   Call it in beforeEach() to isolate tests.
 */

'use strict';

/* ─── IntersectionObserver stub ─────────────────────────────────────────── */
// jsdom does not implement IntersectionObserver; provide a no-op that still
// exposes the constructor and observe/unobserve methods.
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this._callback = callback;
    this._options  = options;
    this._observed = new Set();
  }
  observe(el)   { this._observed.add(el); }
  unobserve(el) { this._observed.delete(el); }
  disconnect()  { this._observed.clear(); }
  /** Test helper: manually fire the callback for a list of entries. */
  _fire(entries) { this._callback(entries, this); }
};

/* ─── MutationObserver stub ──────────────────────────────────────────────── */
global.MutationObserver = class MutationObserver {
  constructor(callback) { this._callback = callback; }
  observe()    {}
  disconnect() {}
  /** Test helper: manually trigger the mutation callback. */
  _trigger(records) { this._callback(records || [], this); }
};

/* ─── Chrome API mock factory ────────────────────────────────────────────── */

function buildChromeMock() {
  /* In-memory storage — tests can inspect _data directly */
  const storageData = {};

  /* Listener registry for runtime events */
  const messageListeners   = [];
  const installedListeners = [];

  /* ── storage.local ─────────────────────────────────────────────────────── */
  const storageMock = {
    _data: storageData,

    get: jest.fn((keys, cb) => {
      const result = {};
      const keyList =
        typeof keys === 'string' ? [keys]
        : Array.isArray(keys)   ? keys
        :                         Object.keys(keys);

      keyList.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(storageData, k)) {
          result[k] = storageData[k];
        }
      });

      if (cb) cb(result);
      return Promise.resolve(result);
    }),

    set: jest.fn((data, cb) => {
      Object.assign(storageData, data);
      if (cb) cb();
      return Promise.resolve();
    }),

    clear: jest.fn((cb) => {
      Object.keys(storageData).forEach((k) => delete storageData[k]);
      if (cb) cb();
      return Promise.resolve();
    }),
  };

  /* ── runtime ────────────────────────────────────────────────────────────── */
  const runtimeMock = {
    lastError: null,

    sendMessage: jest.fn((msg, cb) => {
      if (cb) cb({ ok: true });
      return Promise.resolve({ ok: true });
    }),

    onMessage: {
      addListener: jest.fn((fn) => messageListeners.push(fn)),
      /**
       * Test helper — simulate an incoming message.
       * @param {object} msg    The message object.
       * @param {object} sender Optional sender info.
       * @returns {jest.fn}     The sendResponse mock passed to each listener.
       */
      _trigger(msg, sender = {}) {
        const sendResponse = jest.fn();
        messageListeners.forEach((fn) => fn(msg, sender, sendResponse));
        return sendResponse;
      },
    },

    onInstalled: {
      addListener: jest.fn((fn) => installedListeners.push(fn)),
      /** Test helper — simulate extension install event. */
      _trigger(details = { reason: 'install' }) {
        installedListeners.forEach((fn) => fn(details));
      },
    },
  };

  /* ── tabs ────────────────────────────────────────────────────────────────── */
  const tabsMock = {
    query: jest.fn((opts, cb) => {
      /* Default: return one fake active tab */
      const defaultTabs = [{ id: 1, url: 'file:///test-page/index.html' }];
      if (cb) cb(defaultTabs);
      return Promise.resolve(defaultTabs);
    }),

    sendMessage: jest.fn((tabId, msg, cb) => {
      if (cb) cb({ ok: true });
      return Promise.resolve({ ok: true });
    }),
  };

  /* ── scripting ───────────────────────────────────────────────────────────── */
  const scriptingMock = {
    executeScript: jest.fn((opts, cb) => {
      const results = [{ result: null }];
      if (cb) cb(results);
      return Promise.resolve(results);
    }),

    insertCSS: jest.fn((opts, cb) => {
      if (cb) cb();
      return Promise.resolve();
    }),
  };

  /* ── Master reset (call in beforeEach) ──────────────────────────────────── */
  function _reset() {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    messageListeners.length   = 0;
    installedListeners.length = 0;
    jest.clearAllMocks();
  }

  return {
    storage:   { local: storageMock },
    runtime:   runtimeMock,
    tabs:      tabsMock,
    scripting: scriptingMock,
    _reset,
    _messageListeners:   messageListeners,
    _installedListeners: installedListeners,
  };
}

/* Install on global so every file picks it up without importing */
global.chrome = buildChromeMock();
