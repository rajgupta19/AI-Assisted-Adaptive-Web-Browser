// Service Worker — manages tab lifecycle and message routing

// Initialize storage defaults when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    adaptiveEnabled: false,
    studyMode: false,
    sessionData: []
  });
  console.log('[AI Adaptive Browser] Extension installed.');
});

// Relay messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(['adaptiveEnabled', 'studyMode'], (data) => {
      sendResponse(data);
    });
    return true; // keep channel open for async response
  }

  if (message.type === 'SET_ADAPTIVE') {
    chrome.storage.local.set({ adaptiveEnabled: message.value }, () => {
      // Notify the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ADAPTIVE_TOGGLED',
            value: message.value
          });
        }
      });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'SET_STUDY_MODE') {
    chrome.storage.local.set({ studyMode: message.value }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'LOG_SESSION') {
    chrome.storage.local.get(['sessionData'], (data) => {
      const sessions = data.sessionData || [];
      sessions.push(message.payload);
      chrome.storage.local.set({ sessionData: sessions }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_SESSION') {
    chrome.storage.local.set({ sessionData: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'RESET_SIGNALS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RESET_SIGNALS' });
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'APPLY_NOW') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'APPLY_NOW' });
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'RESET_LAYOUT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RESET_LAYOUT' });
      }
      sendResponse({ ok: true });
    });
    return true;
  }
});
