/**
 * NAT 2.0 — agent-ws.ts
 * WebSocket server for remote Playwright execution agents.
 *
 * Architecture:
 *   Remote Agent connects to /ws/execution-agent
 *   Server sends  execute_job  → Agent runs Playwright → Agent streams back results
 *   Server relays results to the SSE stream watched by the NAT 2.0 UI
 *
 * Recording delegation (Azure mode):
 *   Server sends  start_recording → Agent launches headed Playwright locally
 *   Agent streams recording_event / pw_screenshot back to server
 *   Server forwards to session SSE stream via handleAgentRecordingEvent()
 *
 * Message flow (execution):
 *   Agent → Server: agent_register, job_accepted, step_result, test_result, job_complete, ping
 *   Server → Agent: execute_job, cancel_job, pong
 *
 * Message flow (recording):
 *   Server → Agent: start_recording { sessionId, targetUrl, initScript }
 *   Agent  → Server: recording_event { sessionId, type, url, ... }
 *   Agent  → Server: pw_screenshot   { sessionId, jpeg }
 *   Server → Agent: stop_recording   { sessionId }
 *   Agent  → Server: recording_stopped { sessionId }
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomBytes } from 'crypto';
import {
  handleAgentRecordingEvent,
  registerRecordingDelegateCallbacks,
  registerAssertModeCallback,
  agentRecordedSessions,
} from './recorder-ws';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentJobPayload {
  executionRunId: string;
  testCases: Array<{
    testCaseId: string;
    title: string;
    category: string;
    priority: string;
    steps: Array<{ action: string; expected?: string; testData?: string }>;
  }>;
  targetUrl: string;
  browser: string;
  headless: boolean;
  screenshotOnEveryStep: boolean;
  slowMo?: number;
}

export interface SseCallback {
  sendEvent: (event: string, data: unknown) => void;
  isCancelled: () => boolean;
}

interface PendingJob {
  jobId: string;
  payload: AgentJobPayload;
  sse: SseCallback;
  resolve: (summary: JobSummary) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

interface JobSummary {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface ConnectedAgent {
  agentId: string;
  hostname: string;
  capabilities: string[];
  ws: WebSocket;
  status: 'idle' | 'busy';
  currentJobId: string | null;
  /** User who downloaded and started this agent — set from NAT_USER_ID env in the agent. */
  userId?: string;
  userEmail?: string;
}

// ─── Agent Registry ───────────────────────────────────────────────────────────

const agents = new Map<string, ConnectedAgent>();
const pendingJobs = new Map<string, PendingJob>();

const JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function generateJobId(): string {
  return 'job-' + randomBytes(6).toString('hex');
}

/**
 * Returns true when at least one idle agent is connected.
 */
export function hasAvailableAgent(): boolean {
  return Array.from(agents.values()).some(a => a.status === 'idle');
}

/**
 * Returns the count of connected agents and their statuses.
 */
export function getAgentStatus(): { total: number; idle: number; busy: number; agents: Array<{ agentId: string; hostname: string; status: string }> } {
  const all = Array.from(agents.values());
  const idle = all.filter(a => a.status === 'idle').length;
  const busy = all.filter(a => a.status === 'busy').length;
  const list = all.map(a => ({ agentId: a.agentId, hostname: a.hostname, status: a.status }));
  return { total: agents.size, idle, busy, agents: list };
}

/**
 * Dispatch a job to an available remote agent.
 * Returns a promise that resolves when the job completes.
 * Throws if no agent is available.
 */
export function dispatchJobToAgent(payload: AgentJobPayload, sse: SseCallback): Promise<JobSummary> {
  // Find first idle agent
  const targetAgent: ConnectedAgent | null = Array.from(agents.values()).find(a => a.status === 'idle') || null;

  if (!targetAgent) {
    return Promise.reject(new Error('No idle remote execution agent available'));
  }

  const jobId = generateJobId();
  const agent = targetAgent;

  return new Promise<JobSummary>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingJobs.delete(jobId);
      agent.status = 'idle';
      agent.currentJobId = null;
      reject(new Error(`Job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000}s`));
    }, JOB_TIMEOUT_MS);

    pendingJobs.set(jobId, { jobId, payload, sse, resolve, reject, timeout });

    // Mark agent busy
    agent.status = 'busy';
    agent.currentJobId = jobId;

    // Send job to agent
    agent.ws.send(JSON.stringify({
      type: 'execute_job',
      jobId,
      ...payload,
    }));

    console.log(`[AgentWS] Dispatched job ${jobId} to agent ${agent.agentId} (${agent.hostname})`);
  });
}

/**
 * Cancel an in-progress job (best-effort).
 */
export function cancelJob(executionRunId: string): void {
  const jobEntry = Array.from(pendingJobs.entries()).find(([, job]) => job.payload.executionRunId === executionRunId);
  if (!jobEntry) return;
  const [jobId, job] = jobEntry;
  const runningAgent = Array.from(agents.values()).find(a => a.currentJobId === jobId);
  if (runningAgent) {
    runningAgent.ws.send(JSON.stringify({ type: 'cancel_job', jobId }));
  }
  clearTimeout(job.timeout);
  pendingJobs.delete(jobId);
}

// ─── Recording Delegation ─────────────────────────────────────────────────────
// Tracks which agent is handling which recording session.
// sessionId (upper) → agentId
const sessionAgentMap = new Map<string, string>();

/**
 * Send start_recording to an idle agent.
 * Called by recorder-ws.ts when the app is running in Azure.
 */
async function _dispatchRecordingToAgent(
  sessionId: string,
  targetUrl: string,
  initScript: string,
  userId?: string,
): Promise<void> {
  // Prefer the agent registered by THIS user; fall back to any idle agent only if
  // no user-bound agent is available (single-user / legacy setups without NAT_USER_ID).
  const all = Array.from(agents.values());
  const userAgent  = userId ? all.find(a => a.status === 'idle' && a.userId === userId) : null;
  const agent = userAgent ?? all.find(a => a.status === 'idle');
  if (!agent) {
    const hint = userId
      ? `No idle Remote Agent found for user ${userId}. Please ensure YOUR agent is running on your machine.`
      : 'No idle Remote Agent connected — please ensure the agent is running on your local machine.';
    throw new Error(hint);
  }
  if (!userAgent && userId) {
    // Found an agent but it belongs to a different user — warn in server logs
    console.warn(`[AgentWS] WARNING: routing session ${sessionId} for user ${userId} to agent ${agent.agentId} (userId=${agent.userId ?? 'unbound'}) — no user-specific agent found`);
  }

  sessionAgentMap.set(sessionId.toUpperCase(), agent.agentId);

  agent.ws.send(JSON.stringify({
    type:       'start_recording',
    sessionId:  sessionId.toUpperCase(),
    targetUrl,
    initScript,
  }));

  console.log(`[AgentWS] Delegated recording session ${sessionId} to agent ${agent.agentId} (${agent.hostname})`);
}

/**
 * Send stop_recording to whichever agent is handling the session.
 * Called by recorder-ws.ts when the user clicks Stop.
 */
function _stopRecordingOnAgent(sessionId: string): void {
  const sid     = sessionId.toUpperCase();
  const agentId = sessionAgentMap.get(sid);
  sessionAgentMap.delete(sid);

  if (!agentId) return;
  const agent = agents.get(agentId);
  if (!agent) return;

  agent.ws.send(JSON.stringify({ type: 'stop_recording', sessionId: sid }));
  console.log(`[AgentWS] Sent stop_recording for session ${sid} to agent ${agentId}`);
}

/**
 * Forward an assert-mode toggle to whichever agent is handling the session.
 * Returns true if the command was sent, false if no agent was found.
 * Called by recorder-ws.ts via the registered callback.
 */
function _sendAssertModeToAgent(sessionId: string, mode: 'on' | 'off'): boolean {
  const sid     = sessionId.toUpperCase();
  const agentId = sessionAgentMap.get(sid);
  if (!agentId) return false;
  const agent = agents.get(agentId);
  if (!agent) return false;

  const type = mode === 'on' ? 'assert_mode_on' : 'assert_mode_off';
  agent.ws.send(JSON.stringify({ type, sessionId: sid }));
  console.log(`[AgentWS] Sent ${type} for session ${sid} to agent ${agentId}`);
  return true;
}

/**
 * Returns true if at least one agent is connected (idle or busy).
 * Used by the UI to show the agent connection status indicator.
 */
export function hasAgentConnected(): boolean {
  return agents.size > 0;
}

// ─── Incoming Message Handler ─────────────────────────────────────────────────

function handleAgentMessage(agent: ConnectedAgent, msg: Record<string, unknown>): void {
  switch (msg.type) {

    case 'ping':
      agent.ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'job_accepted':
      console.log(`[AgentWS] Agent ${agent.agentId} accepted job ${msg.jobId}`);
      break;

    case 'agent_status_update': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;
      job.sse.sendEvent('agent_status', msg.data);
      break;
    }

    case 'playwright_log': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;
      job.sse.sendEvent('playwright_log', msg.data);
      break;
    }

    case 'step_progress': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;
      job.sse.sendEvent('step_progress', msg.data);
      break;
    }

    case 'screenshot': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;
      job.sse.sendEvent('screenshot', msg.data);
      break;
    }

    case 'test_complete': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;
      job.sse.sendEvent('test_complete', msg.data);
      break;
    }

    case 'job_complete': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;

      clearTimeout(job.timeout);
      pendingJobs.delete(msg.jobId as string);

      agent.status = 'idle';
      agent.currentJobId = null;

      const summary = msg.summary as JobSummary;
      console.log(`[AgentWS] Job ${msg.jobId} complete — passed:${summary?.passed} failed:${summary?.failed}`);
      job.resolve(summary || { passed: 0, failed: 0, skipped: 0, duration: 0 });
      break;
    }

    case 'job_error': {
      const job = pendingJobs.get(msg.jobId as string);
      if (!job) break;

      clearTimeout(job.timeout);
      pendingJobs.delete(msg.jobId as string);

      agent.status = 'idle';
      agent.currentJobId = null;

      job.sse.sendEvent('execution_error', { message: msg.message || 'Remote agent reported an error' });
      job.reject(new Error(String(msg.message || 'Remote agent error')));
      break;
    }

    // ── Recording events streamed back from the agent's local browser ──────────

    case 'recording_event': {
      // Agent captured a user interaction — route to the recording session
      const sid = String(msg.sessionId || '').toUpperCase();
      console.log(`[AgentWS-DIAG] recording_event received — sid=${sid} eventType=${msg.eventType} type=${msg.type}`);
      if (sid) {
        handleAgentRecordingEvent(sid, msg as Record<string, unknown>);
      }
      break;
    }

    case 'pw_screenshot': {
      // JPEG screenshot from agent's local browser — forward to session SSE
      const sid = String(msg.sessionId || '').toUpperCase();
      if (sid) {
        handleAgentRecordingEvent(sid, { type: 'pw_screenshot', ...msg });
      }
      break;
    }

    case 'recording_stopped': {
      // Agent closed the recording browser
      const sid = String(msg.sessionId || '').toUpperCase();
      sessionAgentMap.delete(sid);
      if (sid) {
        handleAgentRecordingEvent(sid, { type: 'recording_stopped', sessionId: sid });
      }
      break;
    }
  }
}

// ─── WebSocket Server Setup ───────────────────────────────────────────────────

export function setupAgentWebSocket(server: Server): WebSocketServer {
  // Wire up recording delegation callbacks so recorder-ws can delegate
  // to this agent without creating a circular import.
  registerRecordingDelegateCallbacks(_dispatchRecordingToAgent, _stopRecordingOnAgent);
  registerAssertModeCallback(_sendAssertModeToAgent);

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    let agent: ConnectedAgent | null = null;

    ws.on('message', (raw: Buffer) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // First message must be agent_register
      if (!agent) {
        if (msg.type !== 'agent_register') {
          ws.send(JSON.stringify({ type: 'error', message: 'First message must be agent_register' }));
          ws.close();
          return;
        }

        const agentId   = (msg.agentId   as string) || ('agent-' + randomBytes(4).toString('hex'));
        const userId    = (msg.userId    as string) || undefined;
        const userEmail = (msg.userEmail as string) || undefined;
        agent = {
          agentId,
          hostname: (msg.hostname as string) || 'unknown',
          capabilities: (msg.capabilities as string[]) || ['chromium'],
          ws,
          status: 'idle',
          currentJobId: null,
          userId,
          userEmail,
        };
        agents.set(agentId, agent);

        ws.send(JSON.stringify({ type: 'registered', agentId }));
        console.log(`[AgentWS] Agent registered: ${agentId} @ ${agent.hostname} userId=${userId ?? 'unbound'} caps=[${agent.capabilities.join(',')}]`);
        return;
      }

      handleAgentMessage(agent, msg);
    });

    ws.on('close', () => {
      if (agent) {
        console.log(`[AgentWS] Agent disconnected: ${agent.agentId}`);

        // Fail any pending job this agent was running
        if (agent.currentJobId) {
          const job = pendingJobs.get(agent.currentJobId);
          if (job) {
            clearTimeout(job.timeout);
            pendingJobs.delete(agent.currentJobId);
            job.sse.sendEvent('execution_error', { message: `Remote agent ${agent.agentId} disconnected mid-job` });
            job.reject(new Error('Agent disconnected'));
          }
        }

        // Fail any active recording session this agent was handling.
        // Without this, the session stays stuck in 'recording' state forever
        // and the UI never transitions out — the recorder appears frozen.
        for (const [sid, agentId] of sessionAgentMap.entries()) {
          if (agentId === agent.agentId) {
            console.log(`[AgentWS] Agent ${agent.agentId} disconnected mid-recording — terminating session ${sid}`);
            sessionAgentMap.delete(sid);
            agentRecordedSessions.delete(sid);
            handleAgentRecordingEvent(sid, {
              type:      'recording_stopped',
              sessionId: sid,
              error:     'Remote Agent disconnected unexpectedly',
            });
          }
        }

        agents.delete(agent.agentId);
      }
    });

    ws.on('error', () => {
      // handled by close
    });
  });

  console.log('[AgentWS] Remote execution agent WebSocket ready at /ws/execution-agent');
  return wss;
}
