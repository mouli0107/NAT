/**
 * ASTRA QE Recorder — background.js
 * Service worker. Manages WebSocket connection to NAT 2.0 server (port 5000).
 * Bridges content.js events → server → NAT 2.0 UI.
 */

const DEFAULT_SERVER_URL = 'wss://nat20-astra.azurewebsites.net';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

let serverUrl = DEFAULT_SERVER_URL; // overridden by chrome.storage.sync on init
let ws = null;
let sessionId = null;
let isRecording = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let pendingEvents = []; // Buffer events while disconnected

function getRecorderWsUrl() {
  const base = serverUrl.replace(/\/$/, '');
  // Ensure ws:// or wss:// protocol
  if (base.startsWith('http://')) return base.replace('http://', 'ws://') + '/ws/recorder';
  if (base.startsWith('https://')) return base.replace('https://', 'wss://') + '/ws/recorder';
  if (base.startsWith('ws://') || base.startsWith('wss://')) return base + '/ws/recorder';
  return 'ws://' + base + '/ws/recorder';
}

function getHttpBaseUrl() {
  const base = serverUrl.replace(/\/$/, '');
  if (base.startsWith('ws://')) return base.replace('ws://', 'http://');
  if (base.startsWith('wss://')) return base.replace('wss://', 'https://');
  if (base.startsWith('http://') || base.startsWith('https://')) return base;
  return 'http://' + base;
}

// ─── WebSocket Management ─────────────────────────────────────────────────────

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = new WebSocket(getRecorderWsUrl());

    ws.onopen = () => {
      console.log('[ASTRAQE] WebSocket connected');
      reconnectAttempts = 0;

      // Identify this extension to the server
      ws.send(JSON.stringify({ type: 'extension_connect', clientType: 'chrome_extension' }));

      // If we have a session, re-join it
      if (sessionId) {
        ws.send(JSON.stringify({ type: 'join_session', sessionId }));
      }

      // Flush any buffered events
      if (pendingEvents.length > 0) {
        pendingEvents.forEach(evt => {
          try { ws.send(JSON.stringify(evt)); } catch {}
        });
        pendingEvents = [];
      }

      broadcastToPopup({ type: 'CONNECTION_STATUS', connected: true });
    };

    ws.onclose = () => {
      console.log('[ASTRAQE] WebSocket disconnected from', getRecorderWsUrl());
      ws = null;
      broadcastToPopup({ type: 'CONNECTION_STATUS', connected: false });
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.warn('[ASTRAQE] WebSocket error', err);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch {}
    };

  } catch (err) {
    console.warn('[ASTRAQE] WebSocket connection failed', err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[ASTRAQE] Max reconnect attempts reached');
    broadcastToPopup({ type: 'CONNECTION_STATUS', connected: false, maxRetriesReached: true });
    return;
  }
  reconnectAttempts++;
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
}

function sendToServer(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  } else {
    // Buffer the event and try to reconnect
    pendingEvents.push(data);
    connectWebSocket();
  }
}

// ─── Server Message Handler ───────────────────────────────────────────────────

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'session_confirmed':
      sessionId = msg.sessionId;
      broadcastToPopup({ type: 'SESSION_CONFIRMED', sessionId });
      break;
    case 'session_invalid':
      broadcastToPopup({ type: 'SESSION_INVALID', message: msg.message || 'Invalid session code' });
      break;
    case 'stop_recording':
      // Server requested stop (e.g., NAT 2.0 user clicked stop)
      stopRecording();
      broadcastToPopup({ type: 'RECORDING_STOPPED', reason: 'server_request' });
      break;
    case 'pong':
      // Keep-alive response
      break;
  }
}

// ─── Recording Control ────────────────────────────────────────────────────────

async function startRecording(sid) {
  sessionId = sid;
  isRecording = true;
  chrome.storage.session.set({ isRecording: true, sessionId: sid });

  // Join session on server
  sendToServer({ type: 'join_session', sessionId: sid });

  // Inject content script into all active tabs
  const tabs = await chrome.tabs.query({ active: true });
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')
        && !tab.url.startsWith('http://localhost') && !tab.url.startsWith('http://127.0.0.1')) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING', sessionId: sid });
      } catch {
        // Tab may not have content script yet — inject it
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING', sessionId: sid });
        } catch {}
      }
    }
  }

  broadcastToPopup({ type: 'RECORDING_STARTED', sessionId: sid });
}

async function stopRecording() {
  isRecording = false;
  chrome.storage.session.set({ isRecording: false, sessionId: null });

  // Notify all tabs to stop
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
      } catch {}
    }
  }

  // Notify server
  if (sessionId) {
    sendToServer({ type: 'recording_stopped', sessionId });
  }

  broadcastToPopup({ type: 'RECORDING_STOPPED', reason: 'user_request' });
}

// ─── New Tab: Inject content script + start recording if active ───────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isRecording && sessionId) {
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')
        && !tab.url.startsWith('http://localhost') && !tab.url.startsWith('http://127.0.0.1')) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING', sessionId });
      } catch {
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
          await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING', sessionId });
        } catch {}
      }
    }
  }
});

// ─── Screenshot capture ───────────────────────────────────────────────────────

let screenshotDebounceTimer = null;

async function captureAndSendScreenshot(tabId, sid) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 60 });
    sendToServer({
      type: 'recording_event',
      sessionId: sid,
      event: {
        source: 'devxqe-content',
        type: 'screenshot',
        sessionId: sid,
        timestamp: Date.now(),
        dataUrl,
        url: '',
        pageTitle: ''
      }
    });
  } catch {
    // Tab may not be capturable (e.g. chrome:// pages)
  }
}

function debouncedScreenshot(tabId, sid) {
  clearTimeout(screenshotDebounceTimer);
  screenshotDebounceTimer = setTimeout(() => captureAndSendScreenshot(tabId, sid), 600);
}

// ─── Content Script → Background Bridge ──────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.source === 'devxqe-popup') {
    handlePopupMessage(msg, sendResponse);
    return true; // keep channel open for async response
  }

  if (msg.source === 'devxqe-content') {
    // Use sessionId from the event itself — never trust in-memory state
    // (MV3 service workers go dormant and reset variables)
    const sid = msg.sessionId;
    if (sid) {
      sendToServer({
        type: 'recording_event',
        sessionId: sid,
        event: msg
      });
      // Capture screenshot after significant interactions
      if (['click', 'navigation', 'page_load'].includes(msg.type) && sender?.tab?.id) {
        debouncedScreenshot(sender.tab.id, sid);
      }
    }
    return false;
  }
});

// ─── Popup Message Handler ────────────────────────────────────────────────────

async function handlePopupMessage(msg, sendResponse) {
  switch (msg.action) {
    case 'GET_STATUS':
      sendResponse({
        isRecording,
        sessionId,
        connected: ws?.readyState === WebSocket.OPEN,
        serverUrl,
        httpBaseUrl: getHttpBaseUrl(),
      });
      break;

    case 'JOIN_SESSION':
      if (!msg.sessionId) {
        sendResponse({ success: false, error: 'No session ID provided' });
        return;
      }
      sessionId = msg.sessionId.trim().toUpperCase();
      sendToServer({ type: 'join_session', sessionId });
      sendResponse({ success: true });
      break;

    case 'START_RECORDING':
      if (!sessionId) {
        sendResponse({ success: false, error: 'No session joined' });
        return;
      }
      await startRecording(sessionId);
      sendResponse({ success: true, sessionId });
      break;

    case 'STOP_RECORDING':
      await stopRecording();
      sessionId = null;
      sendResponse({ success: true });
      break;

    case 'CONNECT':
      connectWebSocket();
      sendResponse({ success: true });
      break;

    case 'GET_SERVER_URL':
      sendResponse({ serverUrl });
      break;

    case 'SET_SERVER_URL': {
      const newUrl = (msg.serverUrl || '').trim();
      if (!newUrl) {
        sendResponse({ success: false, error: 'URL cannot be empty' });
        return;
      }
      serverUrl = newUrl;
      chrome.storage.sync.set({ serverUrl: newUrl });
      // Disconnect and reconnect to new server
      reconnectAttempts = 0;
      if (ws) { ws.close(); ws = null; }
      clearTimeout(reconnectTimer);
      connectWebSocket();
      broadcastToPopup({ type: 'SERVER_URL_CHANGED', serverUrl: newUrl });
      sendResponse({ success: true });
      break;
    }
  }
}

// ─── Broadcast to Popup ───────────────────────────────────────────────────────

function broadcastToPopup(data) {
  chrome.runtime.sendMessage({ source: 'devxqe-background', ...data }).catch(() => {
    // Popup not open — ignore
  });
}

// ─── Keep-alive ping ──────────────────────────────────────────────────────────

setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 25000);

// ─── Init: Restore state on service worker wake-up ───────────────────────────

// Load saved server URL first, then restore session state and connect
chrome.storage.sync.get(['serverUrl'], (syncData) => {
  if (syncData.serverUrl) {
    serverUrl = syncData.serverUrl;
  }
  chrome.storage.session.get(['isRecording', 'sessionId'], (data) => {
    if (data.isRecording && data.sessionId) {
      isRecording = true;
      sessionId = data.sessionId;
    }
    connectWebSocket();
  });
});
