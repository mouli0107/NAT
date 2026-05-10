/**
 * NAT 2.0 — Remote Playwright Execution Agent
 *
 * Standalone Node.js process that:
 *  1. Connects to the NAT 2.0 server via WebSocket (/ws/execution-agent)
 *  2. Registers itself with available browser capabilities
 *  3. Receives execute_job messages and runs Playwright tests locally
 *  4. Streams step results, screenshots, and final summary back to the server
 *  5. Server relays everything to the NAT 2.0 UI via SSE
 *
 * Start:
 *   cd remote-agent && npx tsx agent.ts
 *   SERVER_URL=ws://my-server:5000 npx tsx agent.ts
 */

import WebSocket from 'ws';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { randomBytes } from 'crypto';
import * as os from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const AZURE_DEFAULT_URL = 'wss://nat20-astra.azurewebsites.net/ws/execution-agent';
const SERVER_URL = process.env.SERVER_URL || AZURE_DEFAULT_URL;

if (!process.env.SERVER_URL) {
  console.warn('[RemoteAgent] SERVER_URL not set. Using default Azure endpoint:');
  console.warn(`[RemoteAgent]   ${AZURE_DEFAULT_URL}`);
  console.warn('[RemoteAgent] To connect to a different server:');
  console.warn('[RemoteAgent]   SERVER_URL=wss://your-server/ws/execution-agent npx tsx agent.ts');
}
console.log(`[RemoteAgent] Target server: ${SERVER_URL}`);

const AGENT_ID      = process.env.AGENT_ID      || ('agent-' + randomBytes(4).toString('hex'));
const NAT_USER_ID   = process.env.NAT_USER_ID   || '';
const NAT_USER_EMAIL= process.env.NAT_USER_EMAIL || '';

if (NAT_USER_ID) {
  console.log(`[RemoteAgent] User identity: ${NAT_USER_EMAIL || NAT_USER_ID} (${NAT_USER_ID})`);
} else {
  console.warn('[RemoteAgent] NAT_USER_ID not set — agent will not be user-bound.');
  console.warn('[RemoteAgent] Re-download the agent from NAT Settings to get a pre-configured .env with your identity.');
}
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT = 20;
const PING_INTERVAL_MS = 30000;

// ─── Types (mirror server/agent-ws.ts) ───────────────────────────────────────

interface TestStep {
  action: string;
  expected?: string;
  testData?: string;
}

interface TestCase {
  testCaseId: string;
  title: string;
  category: string;
  priority: string;
  steps: TestStep[];
}

interface ExecuteJobMsg {
  type: 'execute_job';
  jobId: string;
  executionRunId: string;
  testCases: TestCase[];
  targetUrl: string;
  browser: string;
  headless: boolean;
  screenshotOnEveryStep: boolean;
  slowMo?: number;
}

// ─── Agent State ──────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let pingTimer: NodeJS.Timeout | null = null;
let currentJobId: string | null = null;
let cancelRequested = false;

// ─── Recording State ──────────────────────────────────────────────────────────
let recordingBrowser:    import('playwright').Browser        | null = null;
let recordingContext:    import('playwright').BrowserContext | null = null;
let recordingPage:       import('playwright').Page           | null = null;
let recordingSessionId:  string | null = null;
let recordingStopTimer:  NodeJS.Timeout | null = null;

// ─── Event Buffer ─────────────────────────────────────────────────────────────
// Recording events captured while the WebSocket is reconnecting are buffered
// here and flushed as soon as the connection is re-established.
interface BufferedEvent { msg: object; ts: number }
const _pendingRecordingEvents: BufferedEvent[] = [];
const MAX_BUFFER = 200; // drop oldest beyond this limit

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(msg: object): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (err: any) {
      log(`[send] WebSocket.send failed: ${err.message}`);
    }
    return;
  }

  // WS not ready — buffer recording events so they aren't silently dropped
  const m = msg as Record<string, unknown>;
  if (m.type === 'recording_event' || m.type === 'pw_screenshot') {
    if (_pendingRecordingEvents.length >= MAX_BUFFER) {
      _pendingRecordingEvents.shift(); // drop oldest
    }
    _pendingRecordingEvents.push({ msg, ts: Date.now() });
    // Only log every 10th to avoid flooding the console
    if (_pendingRecordingEvents.length % 10 === 1) {
      log(`[send] WS not OPEN — buffering recording event (buffer=${_pendingRecordingEvents.length})`);
    }
  }
}

function flushPendingEvents(): void {
  if (_pendingRecordingEvents.length === 0) return;
  log(`[send] Flushing ${_pendingRecordingEvents.length} buffered recording event(s)`);
  while (_pendingRecordingEvents.length > 0) {
    const { msg } = _pendingRecordingEvents.shift()!;
    send(msg);
  }
}

function log(msg: string): void {
  console.log(`[RemoteAgent][${AGENT_ID}] ${msg}`);
}

// ─── Playwright Execution ─────────────────────────────────────────────────────

async function captureScreenshot(page: Page): Promise<string | undefined> {
  try {
    const buf = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    return buf.toString('base64');
  } catch {
    return undefined;
  }
}

// ─── Recording Mode ───────────────────────────────────────────────────────────

/**
 * Launch a headed Playwright browser locally and start capturing user interactions.
 * Events are streamed back to the server over the existing WebSocket as
 * `recording_event` and `pw_screenshot` messages.
 *
 * @param sessionId  The recorder session ID (e.g. "ABC-4821") to attach events to.
 * @param targetUrl  The URL the recording browser should navigate to.
 * @param initScript The PW_RECORDER_INIT JavaScript — injected into every page.
 */
async function runRecording(sessionId: string, targetUrl: string, initScript: string): Promise<void> {
  log(`Starting recording session ${sessionId} → ${targetUrl}`);
  recordingSessionId = sessionId;

  // Stop any previously running recording browser
  if (recordingBrowser) {
    try { await recordingBrowser.close(); } catch {}
    recordingBrowser = null;
    recordingContext = null;
  }

  const { chromium } = await import('playwright');

  // Launch headed browser on the local machine (user can see and interact with it)
  recordingBrowser = await chromium.launch({
    headless: false,
    slowMo: 0,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-infobars',
    ],
  });

  recordingContext = await recordingBrowser.newContext({
    viewport: null,   // null = use the real screen size (maximised window)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page: Page = await recordingContext.newPage();
  recordingPage = page; // expose for assert mode commands
  const popupUrls  = new Set<string>();

  // Pre-compute the NAT server hostname so we can filter out events that
  // originate from the NAT platform itself (e.g. user accidentally navigates
  // the recording browser to the Azure/localhost server URL).
  let _serverHostname = '';
  try {
    _serverHostname = new URL(SERVER_URL.replace(/^wss?:\/\//, 'https://')).hostname;
  } catch { /* ignore */ }

  // ── Expose __devxqe_send on the CONTEXT so it works on ALL pages/popups ──
  await recordingContext.exposeFunction('__devxqe_send', (eventData: Record<string, unknown>) => {
    if (recordingSessionId !== sessionId) return; // stale callback after stop

    // ── Filter: skip events from the NAT server domain itself ─────────────
    // Prevents the NAT platform's own UI buttons (e.g. "Stop Playwright")
    // from being recorded when the user accidentally navigates the Playwright
    // browser to the server URL.  Also blocks localhost events.
    const eventUrl = String(eventData.url || '');
    if (eventUrl) {
      try {
        const host = new URL(eventUrl).hostname;
        if (
          host === _serverHostname ||
          host === 'localhost'      ||
          host === '127.0.0.1'
        ) {
          log(`[filter] Skipping NAT server event: ${eventUrl}`);
          return;
        }
      } catch { /* malformed URL — let it through */ }
    }

    const evType = String(eventData.type || '');
    log(`[event] ${evType} url=${eventData.url || ''}`);

    // Forward the raw event to the server (buffered if WS is not ready).
    // IMPORTANT: put type:'recording_event' AFTER the spread so it wins over
    // eventData.type (e.g. 'click', 'page_load') — agent-ws.ts routes on this field.
    // The original sub-type is preserved as eventType for natural-language generation.
    send({ ...eventData, type: 'recording_event', sessionId, eventType: evType });

    // Capture a screenshot after significant interactions (non-blocking)
    if (['click', 'page_load', 'select', 'check', 'uncheck'].includes(evType)) {
      setImmediate(async () => {
        try {
          const buf  = await page.screenshot({ type: 'jpeg', quality: 55, fullPage: false });
          send({ type: 'pw_screenshot', sessionId, data: buf.toString('base64') });
        } catch { /* page may be navigating */ }
      });
    }
  });

  // ── Inject the recorder init script into every page ────────────────────────
  await recordingContext.addInitScript(initScript);

  // ── Server-side navigation tracking (safety net for redirects) ────────────
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const navUrl = frame.url();
    if (!navUrl || navUrl.startsWith('about:') || navUrl.startsWith('data:')) return;
    send({
      type: 'recording_event',
      sessionId,
      eventType: 'page_load',     // the init script also fires this; server dedupes
      url: navUrl,
      pageTitle: '',
    });
    // Capture screenshot after navigation
    setImmediate(async () => {
      try {
        const buf  = await page.screenshot({ type: 'jpeg', quality: 55, fullPage: false });
        send({ type: 'pw_screenshot', sessionId, data: buf.toString('base64') });
      } catch {}
    });
  });

  // ── Popup / new window detection ────────────────────────────────────────────
  recordingContext.on('page', async (popupPage) => {
    try {
      await popupPage.waitForLoadState('domcontentloaded').catch(() => {});
      const popupUrl = popupPage.url();
      popupUrls.add(popupUrl);
      send({ type: 'recording_event', sessionId, eventType: 'popup_opened', url: popupUrl, pageTitle: '' });

      popupPage.on('framenavigated', (frame) => {
        if (frame !== popupPage.mainFrame()) return;
        const u = frame.url();
        if (!u || u.startsWith('about:') || u.startsWith('data:')) return;
        send({ type: 'recording_event', sessionId, eventType: 'page_load', url: u, pageTitle: '', isPopup: true });
      });

      popupPage.on('close', () => {
        send({ type: 'recording_event', sessionId, eventType: 'popup_closed', url: popupUrl, pageTitle: '' });
      });
    } catch {}
  });

  // ── Clean up when the user closes the browser window ──────────────────────
  recordingBrowser.on('disconnected', () => {
    log(`Recording browser closed for session ${sessionId}`);
    recordingBrowser   = null;
    recordingContext   = null;
    recordingPage      = null;
    recordingSessionId = null;
    send({ type: 'recording_stopped', sessionId });
  });

  // ── Navigate to the target URL ─────────────────────────────────────────────
  try {
    await page.goto(targetUrl, { waitUntil: 'commit', timeout: 60000 });
  } catch (navErr: any) {
    log(`Initial navigation warning for ${targetUrl}: ${navErr.message} — recording still active`);
  }

  // Capture an initial screenshot so the UI shows the starting page
  try {
    const buf  = await page.screenshot({ type: 'jpeg', quality: 55, fullPage: false });
    send({ type: 'pw_screenshot', sessionId, data: buf.toString('base64') });
  } catch {}

  log(`Recording browser ready — session ${sessionId} is now capturing events`);
}

/**
 * Stop an active recording session and close the browser.
 */
async function stopRecording(sessionId: string): Promise<void> {
  if (recordingSessionId !== sessionId) {
    log(`stop_recording for ${sessionId} but current session is ${recordingSessionId}`);
    return;
  }
  log(`Stopping recording session ${sessionId}`);
  recordingSessionId = null;
  recordingPage      = null;
  if (recordingContext) { try { await recordingContext.close(); } catch {} recordingContext = null; }
  if (recordingBrowser) { try { await recordingBrowser.close(); } catch {} recordingBrowser = null; }
  send({ type: 'recording_stopped', sessionId });
}

type ActionCmd = {
  command: string;
  target?: string;
  value?: string;
  locatorType?: string;
};

function parseAction(action: string, testData?: string): ActionCmd {
  const a = action.toLowerCase();

  if (a.includes('navigate to') || a.includes('go to') || a.includes('open url') || a.includes('open the')) {
    const url = action.match(/(https?:\/\/[^\s'"]+)/i)?.[1];
    return { command: 'open', target: url || '' };
  }
  if (a.includes('click') || a.includes('tap on') || a.includes('press button')) {
    const quoted = action.match(/["']([^"']+)["']/)?.[1] || action.replace(/^(click|tap on|press)\s+(on\s+)?(the\s+)?/i, '').trim();
    return { command: 'click', target: quoted };
  }
  if (a.includes('fill') || a.includes('type') || a.includes('enter') || a.includes('input')) {
    const quoted = action.match(/["']([^"']+)["']/)?.[1] || '';
    const val = testData || action.match(/\bwith\s+["']?(.+?)["']?\s*$/i)?.[1] || '';
    return { command: 'fill', target: quoted, value: val };
  }
  if (a.includes('select') || a.includes('choose')) {
    const quoted = action.match(/["']([^"']+)["']/)?.[1] || '';
    return { command: 'select', target: quoted, value: testData || '' };
  }
  if (a.includes('verify') || a.includes('assert') || a.includes('should')) {
    const text = action.match(/["']([^"']+)["']/)?.[1] || action.replace(/^.*?(verify|assert|should)\s*/i, '').trim();
    return { command: 'verify', target: text };
  }
  if (a.includes('wait') || a.includes('pause')) {
    const ms = action.match(/(\d+)/)?.[1] || '2000';
    return { command: 'wait', value: ms };
  }
  return { command: 'observe', target: action };
}

async function executeStep(page: Page, step: TestStep, timeout: number): Promise<void> {
  const cmd = parseAction(step.action, step.testData);

  switch (cmd.command) {
    case 'open':
      if (cmd.target?.startsWith('http')) {
        await page.goto(cmd.target, { waitUntil: 'networkidle', timeout });
      }
      break;

    case 'click': {
      const loc = page.getByText(cmd.target || '', { exact: false });
      if (await loc.count() > 0) {
        await loc.first().click({ timeout });
      } else {
        await page.locator(`text=${cmd.target}`).first().click({ timeout });
      }
      break;
    }

    case 'fill': {
      const target = cmd.target || '';
      let loc = page.getByLabel(target);
      if (await loc.count() === 0) loc = page.getByPlaceholder(target);
      if (await loc.count() === 0) loc = page.getByRole('textbox', { name: target });
      await loc.first().fill(cmd.value || '', { timeout });
      break;
    }

    case 'select': {
      const target = cmd.target || '';
      const loc = page.getByLabel(target).or(page.locator(`select[name*="${target}" i]`));
      await loc.first().selectOption(cmd.value || '', { timeout });
      break;
    }

    case 'verify': {
      const visible = await page.getByText(cmd.target || '', { exact: false })
        .isVisible({ timeout: 5000 }).catch(() => false);
      if (!visible) throw new Error(`Expected "${cmd.target}" to be visible`);
      break;
    }

    case 'wait':
      await page.waitForTimeout(Math.min(parseInt(cmd.value || '2000'), 10000));
      break;

    case 'observe':
    default:
      await page.waitForTimeout(300);
      break;
  }

  await page.waitForTimeout(500);
}

async function runJob(msg: ExecuteJobMsg): Promise<void> {
  const { jobId, testCases, targetUrl, headless, screenshotOnEveryStep, slowMo } = msg;
  cancelRequested = false;

  send({ type: 'job_accepted', jobId });

  const timeout = 30000;
  let browser: Browser | null = null;
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  const emit = (event: string, data: object) => send({ type: event, jobId, data });

  try {
    emit('agent_status_update', { agent: 'Navigator', status: 'working', activity: 'Launching browser...' });

    browser = await chromium.launch({ headless, slowMo: slowMo || 0, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'NAT-2.0-RemoteAgent/1.0',
    });
    const page: Page = await context.newPage();

    const consoleErrors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(e.message));

    emit('playwright_log', {
      timestamp: new Date().toISOString(), level: 'info', category: 'browser',
      message: `Browser ready (headless=${headless}) — running ${testCases.length} test(s) against ${targetUrl}`,
    });

    for (let i = 0; i < testCases.length; i++) {
      if (cancelRequested) break;

      const tc = testCases[i];
      emit('agent_status_update', { agent: 'Orchestrator', status: 'working', activity: `Executing test ${i + 1} of ${testCases.length}` });
      emit('playwright_log', { timestamp: new Date().toISOString(), level: 'info', category: 'test', message: `Starting: ${tc.title}` });
      emit('agent_status_update', { agent: 'Executor', status: 'working', activity: `Running: ${tc.title}` });

      const tcStart = Date.now();
      let tcStatus: 'passed' | 'failed' = 'passed';

      try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout });
      } catch (navErr: any) {
        emit('playwright_log', { timestamp: new Date().toISOString(), level: 'warn', category: 'navigation', message: `Initial navigation warning: ${navErr.message}` });
      }

      for (let si = 0; si < tc.steps.length; si++) {
        if (cancelRequested) break;

        const step = tc.steps[si];
        const stepStart = Date.now();

        emit('step_progress', { stepIndex: si + 1, totalSteps: tc.steps.length });
        emit('playwright_log', { timestamp: new Date().toISOString(), level: 'info', category: 'action', message: `Step ${si + 1}: ${step.action}` });

        let stepStatus: 'passed' | 'failed' = 'passed';
        let stepError: string | undefined;
        let screenshot: string | undefined;

        try {
          await executeStep(page, step, timeout);
          if (screenshotOnEveryStep) {
            screenshot = await captureScreenshot(page);
          }
        } catch (err: any) {
          stepStatus = 'failed';
          stepError = err.message;
          tcStatus = 'failed';
          screenshot = await captureScreenshot(page);
          emit('playwright_log', { timestamp: new Date().toISOString(), level: 'error', category: 'result', message: `Step ${si + 1} FAILED — ${err.message}` });
        }

        if (screenshot) {
          emit('screenshot', { screenshot, step: `Test ${i + 1} — Step ${si + 1}`, testIndex: i + 1 });
        }

        emit('playwright_log', {
          timestamp: new Date().toISOString(),
          level: stepStatus === 'passed' ? 'info' : 'error',
          category: 'result',
          message: `Step ${si + 1} ${stepStatus.toUpperCase()}${stepError ? ' — ' + stepError : ''} (${Date.now() - stepStart}ms)`,
        });
      }

      if (tcStatus === 'passed') passedTests++; else failedTests++;

      emit('agent_status_update', { agent: 'Validator', status: 'working', activity: `Validating: ${tc.title}` });
      emit('test_complete', {
        testCaseId: tc.testCaseId,
        status: tcStatus,
        testIndex: i + 1,
        totalTests: testCases.length,
      });
      emit('playwright_log', {
        timestamp: new Date().toISOString(),
        level: tcStatus === 'passed' ? 'info' : 'error',
        category: 'result',
        message: `TEST ${tcStatus.toUpperCase()}: "${tc.title}" (${Date.now() - tcStart}ms)`,
      });
    }

    await context.close();

    emit('agent_status_update', { agent: 'Reporter', status: 'working', activity: 'Generating execution summary...' });

  } catch (err: any) {
    log(`Job ${jobId} error: ${err.message}`);
    send({ type: 'job_error', jobId, message: err.message });
    return;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    currentJobId = null;
  }

  const duration = Date.now() - startTime;
  log(`Job ${jobId} complete — passed:${passedTests} failed:${failedTests} (${duration}ms)`);

  send({
    type: 'job_complete',
    jobId,
    summary: { passed: passedTests, failed: failedTests, skipped: 0, duration },
  });
}

// ─── WebSocket Connection ─────────────────────────────────────────────────────

function connect(): void {
  log(`Connecting to ${SERVER_URL}...`);
  ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    log('Connected. Registering...');
    reconnectAttempts = 0;

    send({
      type: 'agent_register',
      agentId:   AGENT_ID,
      userId:    NAT_USER_ID    || undefined,
      userEmail: NAT_USER_EMAIL || undefined,
      hostname:  os.hostname(),
      capabilities: ['chromium'],
    });

    // Keep-alive ping
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);

    // Flush any recording events that accumulated while WS was reconnecting
    flushPendingEvents();
  });

  ws.on('message', (raw: Buffer) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'registered':
        log(`Registered as ${msg.agentId}. Waiting for jobs...`);
        break;

      case 'execute_job':
        if (currentJobId) {
          send({ type: 'job_rejected', jobId: msg.jobId, reason: 'Agent is busy' });
          return;
        }
        currentJobId = msg.jobId as string;
        log(`Received job ${currentJobId}`);
        runJob(msg as unknown as ExecuteJobMsg).catch(err => {
          log(`Unhandled job error: ${err.message}`);
          send({ type: 'job_error', jobId: currentJobId, message: err.message });
          currentJobId = null;
        });
        break;

      case 'cancel_job':
        if (msg.jobId === currentJobId) {
          log(`Cancelling job ${currentJobId}`);
          cancelRequested = true;
        }
        break;

      // ── Recording commands ───────────────────────────────────────────────────

      case 'start_recording': {
        const sid        = String(msg.sessionId || '');
        const targetUrl  = String(msg.targetUrl  || '');
        const initScript = String(msg.initScript  || '');
        if (!sid || !targetUrl) {
          log('start_recording missing sessionId or targetUrl');
          break;
        }
        log(`Received start_recording for session ${sid}`);
        runRecording(sid, targetUrl, initScript).catch(err => {
          log(`Recording error: ${err.message}`);
          send({ type: 'recording_stopped', sessionId: sid, error: err.message });
        });
        break;
      }

      case 'stop_recording': {
        const sid = String(msg.sessionId || '');
        log(`Received stop_recording for session ${sid}`);
        stopRecording(sid).catch(err => log(`stopRecording error: ${err.message}`));
        break;
      }

      // ── Assert mode commands ─────────────────────────────────────────────────
      // Server forwards assert_mode_on / assert_mode_off when the user clicks
      // "Add Assert" in the NAT UI. The init script exposes window.__dxqe_setAssertMode.

      case 'assert_mode_on': {
        const sid = String(msg.sessionId || '');
        log(`Received assert_mode_on for session ${sid}`);
        // Use function-form evaluate — bypasses Content Security Policy restrictions
        // on target sites that block eval().  Activates on ALL open pages/popups.
        const pagesOn = recordingContext ? recordingContext.pages()
                      : (recordingPage ? [recordingPage] : []);
        let evaluatedOn = 0;
        for (const p of pagesOn) {
          if (!p.isClosed()) {
            evaluatedOn++;
            p.evaluate(() => {
              const w = window as any;
              if (typeof w.__dxqe_setAssertMode === 'function') w.__dxqe_setAssertMode(true);
            }).catch(err => log(`assert_mode_on evaluate failed on page: ${err.message}`));
          }
        }
        if (evaluatedOn === 0) log('assert_mode_on: no active recording pages');
        break;
      }

      case 'assert_mode_off': {
        const sid = String(msg.sessionId || '');
        log(`Received assert_mode_off for session ${sid}`);
        const pagesOff = recordingContext ? recordingContext.pages()
                       : (recordingPage ? [recordingPage] : []);
        for (const p of pagesOff) {
          if (!p.isClosed()) {
            p.evaluate(() => {
              const w = window as any;
              // Prefer __dxqe_assertOff (registered by __dxqe_setAssertMode)
              // Fall back to calling setAssertMode(false) for older agent builds.
              if (typeof w.__dxqe_assertOff === 'function') w.__dxqe_assertOff();
              else if (typeof w.__dxqe_setAssertMode === 'function') w.__dxqe_setAssertMode(false);
            }).catch(() => { /* ignore per-page errors */ });
          }
        }
        break;
      }

      case 'pong':
        break;

      case 'error':
        log(`Server error: ${msg.message}`);
        break;
    }
  });

  ws.on('close', () => {
    log('Disconnected from server.');
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    ws = null;
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    log(`WebSocket error: ${err.message}`);
  });
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT) {
    log('Max reconnect attempts reached. Exiting.');
    process.exit(1);
  }
  reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 3);
  log(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT})...`);
  setTimeout(connect, delay);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  log('Shutting down...');
  if (ws) ws.close();
  process.exit(0);
});

connect();
