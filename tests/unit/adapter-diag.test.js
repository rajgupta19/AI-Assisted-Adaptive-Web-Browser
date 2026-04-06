/**
 * Minimal diagnostic: loads adapter.js and checks which tests fail.
 * Run: npx jest tests/unit/adapter-diag.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ADAPTER_PATH = path.resolve(__dirname, '../../extension/content/adapter.js');

function loadAdapter() {
  if (!window.__aiSignals) window.__aiSignals = new Map();
  if (!window.__aiScores)  window.__aiScores  = new Map();
  window.__aiEnabled = false;
  chrome.storage.local._data.adaptiveEnabled = false;
  const src = fs.readFileSync(ADAPTER_PATH, 'utf8');
  new Function(src)();
}

describe('DIAG', () => {
  beforeEach(() => {
    chrome._reset();
    document.body.innerHTML = '';
    loadAdapter();
  });

  test('what does document.head look like?', () => {
    console.log('head:', document.head);
    console.log('documentElement.outerHTML:', document.documentElement.outerHTML.slice(0, 200));
  });

  test('enable and check for button', () => {
    window.__aiAdapterEnable();
    console.log('notif:', document.getElementById('ai-adaptive-notif'));
    console.log('notif-off:', document.getElementById('ai-notif-off'));
    console.log('body innerHTML slice:', document.body.innerHTML.slice(0, 300));
  });

  test('re-apply mutation', () => {
    const el = document.createElement('section');
    document.body.appendChild(el);
    window.__aiScores.set(el, { rawScore: 0.5, normScore: 1.0, label: 'HIGH' });
    window.__aiAdapterApply();
    console.log('after HIGH apply:', el.className);
    const score = window.__aiScores.get(el);
    score.label = 'LOW';
    window.__aiAdapterApply();
    console.log('after LOW apply:', el.className);
  });
});
