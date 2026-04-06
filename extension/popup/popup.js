// ─── Popup Script ────────────────────────────────────────────────────────────
// All critical operations (enable, apply, reset) use chrome.scripting.executeScript
// directly on the active tab — this is reliable for both http and file:// pages.

// ── Element refs ─────────────────────────────────────────────────────────────
const stateOff       = document.getElementById('state-off');
const stateOn        = document.getElementById('state-on');
const btnTurnOn      = document.getElementById('btn-turn-on');
const btnTurnOff     = document.getElementById('btn-turn-off');
const scoresList     = document.getElementById('scores-list');
const scoresDetail   = document.getElementById('scores-list-detail');
const obsSummary     = document.getElementById('observation-summary');
const btnApply       = document.getElementById('btn-apply');
const btnResetLayout = document.getElementById('btn-reset-layout');
const btnStart       = document.getElementById('btn-start-task');
const btnStop        = document.getElementById('btn-stop-task');
const btnExport      = document.getElementById('btn-export');
const btnClear       = document.getElementById('btn-clear');
const taskStatus     = document.getElementById('task-status');
const taskTimer      = document.getElementById('task-timer');
const badgeA         = document.getElementById('badge-a');
const badgeB         = document.getElementById('badge-b');
const participantId  = document.getElementById('participant-id');
const taskSelect     = document.getElementById('task-select');
const pageSelect     = document.getElementById('page-select');
const sessionCount   = document.getElementById('session-count');

let taskStartTime     = null;
let timerInterval     = null;
let scoreRefreshTimer = null;
let currentCondition  = 'A';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

function runOnPage(func, args = []) {
  return new Promise((resolve) => {
    getActiveTab().then((tab) => {
      if (!tab) { resolve(null); return; }
      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, func, args },
        (results) => {
          if (chrome.runtime.lastError) {
            console.warn('[Popup] executeScript error:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(results && results[0] ? results[0].result : null);
          }
        }
      );
    });
  });
}

function esc(str) {
  return (str || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setStatus(msg, type) {
  taskStatus.textContent = msg;
  taskStatus.className   = 'task-status' + (type ? ` ${type}` : '');
}

function updateSessionCount(sessions) {
  sessionCount.textContent = sessions.length > 0 ? `${sessions.length} record(s) stored` : '';
}

// ── Boot — restore persisted state ───────────────────────────────────────────
chrome.storage.local.get(['adaptiveEnabled', 'lastParticipantId', 'sessionData'], (data) => {
  if (data.lastParticipantId) participantId.value = data.lastParticipantId;
  updateSessionCount(data.sessionData || []);
  // Don't auto-restore ON state on popup open — user must explicitly turn on
  setAdaptiveUI(false);
});

// ── UI state switch ───────────────────────────────────────────────────────────
function setAdaptiveUI(on) {
  if (on) {
    stateOff.classList.add('hidden');
    stateOn.classList.remove('hidden');
    startScoreRefresh();
  } else {
    stateOn.classList.add('hidden');
    stateOff.classList.remove('hidden');
    stopScoreRefresh();
    btnApply.disabled = false;
    btnResetLayout.classList.add('hidden');
    renderScores([], scoresList);
    renderScores([], scoresDetail);
    obsSummary.classList.add('hidden');
  }
}

// ── Turn On ───────────────────────────────────────────────────────────────────
btnTurnOn.addEventListener('click', async () => {
  btnTurnOn.disabled = true;
  btnTurnOn.textContent = 'Starting…';

  // 1. Directly enable tracking on the page
  const ok = await runOnPage(() => {
    if (typeof window.__aiAdapterEnable === 'function') {
      window.__aiAdapterEnable();
      return true;
    }
    return false;
  });

  if (!ok) {
    // Content scripts not injected yet (e.g. page was open before extension loaded)
    // Try injecting them manually
    const tab = await getActiveTab();
    if (tab) {
      await new Promise(resolve => {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content/tracker.js', 'content/scorer.js', 'content/adapter.js'] },
          () => resolve()
        );
      });
      // Also inject CSS
      await new Promise(resolve => {
        chrome.scripting.insertCSS(
          { target: { tabId: tab.id }, files: ['styles/adaptive.css'] },
          () => resolve()
        );
      });
      // Now enable
      await runOnPage(() => {
        if (typeof window.__aiAdapterEnable === 'function') window.__aiAdapterEnable();
      });
    }
  }

  // 2. Persist state
  chrome.storage.local.set({ adaptiveEnabled: true });

  btnTurnOn.disabled = false;
  btnTurnOn.textContent = 'Turn On Adaptive Mode';
  setAdaptiveUI(true);
});

// ── Turn Off ──────────────────────────────────────────────────────────────────
btnTurnOff.addEventListener('click', async () => {
  await runOnPage(() => {
    if (typeof window.__aiAdapterDisable === 'function') window.__aiAdapterDisable();
  });
  chrome.storage.local.set({ adaptiveEnabled: false });
  setAdaptiveUI(false);
});

// ── Apply customised layout ───────────────────────────────────────────────────
btnApply.addEventListener('click', async () => {
  btnApply.disabled = true;
  btnApply.textContent = 'Applying…';

  const result = await runOnPage(() => {
    if (typeof window.__aiAdapterApply === 'function') {
      window.__aiAdapterApply();
      // Return how many elements were scored for feedback
      return window.__aiScores ? window.__aiScores.size : 0;
    }
    return -1;
  });

  btnApply.textContent = 'Apply Customised Experience';

  if (result === 0) {
    // No data yet — re-enable button so user can try again
    btnApply.disabled = false;
    obsSummary.classList.remove('hidden');
    obsSummary.textContent = 'Not enough data yet — keep browsing for a few more seconds, then try again.';
    obsSummary.style.color = '#fbbf24';
  } else {
    btnResetLayout.classList.remove('hidden');
  }
});

// ── Reset to original layout ──────────────────────────────────────────────────
btnResetLayout.addEventListener('click', async () => {
  await runOnPage(() => {
    if (typeof window.__aiAdapterReset === 'function') window.__aiAdapterReset();
  });
  btnApply.disabled = false;
  btnResetLayout.classList.add('hidden');
});

// ── Live score polling ────────────────────────────────────────────────────────
function startScoreRefresh() {
  stopScoreRefresh();
  fetchAndRenderScores(); // immediate first fetch
  scoreRefreshTimer = setInterval(fetchAndRenderScores, 2000);
}

function stopScoreRefresh() {
  if (scoreRefreshTimer) { clearInterval(scoreRefreshTimer); scoreRefreshTimer = null; }
}

async function fetchAndRenderScores() {
  const items = await runOnPage(() => {
    if (typeof window.__aiGetTopElements === 'function') return window.__aiGetTopElements(5);
    return null;
  });

  if (items === null) {
    // Scripts not ready yet
    scoresList.innerHTML  = '<p class="hint" style="color:#fbbf24">⚠ Reload the page, then turn on again.</p>';
    scoresDetail.innerHTML = scoresList.innerHTML;
    return;
  }

  renderScores(items, scoresList);
  renderScores(items, scoresDetail);
  if (items.length > 0) renderObsSummary(items);
}

function renderScores(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="hint">Scroll and hover on the page — scores will appear here.</p>';
    return;
  }
  container.innerHTML = items.map((item) => `
    <div class="score-item">
      <span class="score-text" title="${esc(item.text)}">${esc(item.text) || item.tag}</span>
      <div class="score-bar-wrap">
        <div class="score-bar bar-${item.label}" style="width:${item.normScore}%"></div>
      </div>
      <span class="score-label label-${item.label}">${item.normScore}%</span>
    </div>
  `).join('');
}

function renderObsSummary(items) {
  const high = items.filter(i => i.label === 'HIGH').length;
  const low  = items.filter(i => i.label === 'LOW').length;
  obsSummary.classList.remove('hidden');
  obsSummary.style.color = '';
  obsSummary.textContent = high > 0
    ? `Found ${high} high-attention section${high !== 1 ? 's' : ''} and ${low} low-engagement area${low !== 1 ? 's' : ''}. Ready to apply.`
    : 'Still observing — keep scrolling and hovering on content.';
}

// ── Condition badges (study) ──────────────────────────────────────────────────
badgeA.addEventListener('click', () => setCondition('A'));
badgeB.addEventListener('click', () => setCondition('B'));

function setCondition(cond) {
  currentCondition = cond;
  badgeA.classList.toggle('active', cond === 'A');
  badgeB.classList.toggle('active', cond === 'B');
}

// ── Task timer ────────────────────────────────────────────────────────────────
function startTimer() {
  taskStartTime = Date.now();
  taskTimer.classList.add('running');
  timerInterval = setInterval(() => {
    const e = Date.now() - taskStartTime;
    const m = String(Math.floor(e / 60000)).padStart(2, '0');
    const s = String(Math.floor((e % 60000) / 1000)).padStart(2, '0');
    taskTimer.textContent = `${m}:${s}`;
  }, 500);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  taskTimer.classList.remove('running');
}

// ── Start task ────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  const pid = participantId.value.trim();
  if (!pid) { setStatus('Enter a Participant ID first.', 'error'); return; }
  chrome.storage.local.set({ lastParticipantId: pid });
  await runOnPage(() => { if (typeof window.__aiResetSignals === 'function') window.__aiResetSignals(); });
  startTimer();
  btnStart.disabled = true;
  btnStop.disabled  = false;
  taskSelect.disabled = true;
  pageSelect.disabled = true;
  participantId.disabled = true;
  setStatus(`P${pageSelect.value}-T${taskSelect.value} running (Cond. ${currentCondition})…`, '');
});

// ── Stop task ─────────────────────────────────────────────────────────────────
btnStop.addEventListener('click', async () => {
  if (!taskStartTime) return;
  const duration = Date.now() - taskStartTime;
  stopTimer();

  const tab     = await getActiveTab();
  const metrics = await runOnPage(() => {
    if (typeof window.__aiGetTaskMetrics === 'function') return window.__aiGetTaskMetrics();
    return { deltaClicks: 0, scrollDeltaPx: 0, attentionFocusRatio: 0, topElements: [] };
  });

  const entry = {
    participantId:       participantId.value.trim(),
    condition:           currentCondition,
    pageNumber:          parseInt(pageSelect.value, 10),
    taskNumber:          parseInt(taskSelect.value, 10),
    taskDurationMs:      duration,
    taskDurationS:       parseFloat((duration / 1000).toFixed(1)),
    clicks:              metrics?.deltaClicks        || 0,
    scrollDeltaPx:       metrics?.scrollDeltaPx      || 0,
    attentionFocusRatio: metrics?.attentionFocusRatio || 0,
    topEngaged:          metrics?.topElements         || [],
    timestamp:           new Date().toISOString(),
    url:                 tab?.url || ''
  };

  chrome.runtime.sendMessage({ type: 'LOG_SESSION', payload: entry }, () => {
    chrome.storage.local.get(['sessionData'], (d) => updateSessionCount(d.sessionData || []));
  });

  setStatus(`Done: ${entry.taskDurationS}s | ${entry.clicks} clicks | ${entry.scrollDeltaPx}px scroll`, 'success');
  taskStartTime = null;
  taskTimer.textContent = '--:--';
  btnStart.disabled = false;
  btnStop.disabled  = true;
  taskSelect.disabled = false;
  pageSelect.disabled = false;
  participantId.disabled = false;
  const nextTask = parseInt(taskSelect.value, 10) + 1;
  if (nextTask <= 3) { taskSelect.value = String(nextTask); }
  else {
    taskSelect.value = '1';
    const nextPage = parseInt(pageSelect.value, 10) + 1;
    if (nextPage <= 3) pageSelect.value = String(nextPage);
  }
});

// ── Export ────────────────────────────────────────────────────────────────────
btnExport.addEventListener('click', () => {
  chrome.storage.local.get(['sessionData'], (data) => {
    const sessions = data.sessionData || [];
    if (!sessions.length) { setStatus('No data to export yet.', 'error'); return; }
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `study-data-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${sessions.length} record(s).`, 'success');
  });
});

// ── Clear ─────────────────────────────────────────────────────────────────────
btnClear.addEventListener('click', () => {
  if (!confirm('Clear all session data?')) return;
  chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' }, () => {
    updateSessionCount([]);
    setStatus('Session data cleared.', '');
  });
});
