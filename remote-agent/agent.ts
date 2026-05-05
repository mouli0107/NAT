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

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:5000/ws/execution-agent';
const AGENT_ID = process.env.AGENT_ID || ('agent-' + randomBytes(4).toString('hex'));
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(msg: object): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
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
      agentId: AGENT_ID,
      hostname: os.hostname(),
      capabilities: ['chromium'],
    });

    // Keep-alive ping
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);
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
