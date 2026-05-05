/**
 * NAT 2.0 — agent-ws.ts
 * WebSocket server for remote Playwright execution agents.
 *
 * Architecture:
 *   Remote Agent connects to /ws/execution-agent
 *   Server sends  execute_job  → Agent runs Playwright → Agent streams back results
 *   Server relays results to the SSE stream watched by the NAT 2.0 UI
 *
 * Message flow:
 *   Agent → Server: agent_register, job_accepted, step_result, test_result, job_complete, ping
 *   Server → Agent: execute_job, cancel_job, pong
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomBytes } from 'crypto';

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
  }
}

// ─── WebSocket Server Setup ───────────────────────────────────────────────────

export function setupAgentWebSocket(server: Server): WebSocketServer {
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

        const agentId = (msg.agentId as string) || ('agent-' + randomBytes(4).toString('hex'));
        agent = {
          agentId,
          hostname: (msg.hostname as string) || 'unknown',
          capabilities: (msg.capabilities as string[]) || ['chromium'],
          ws,
          status: 'idle',
          currentJobId: null,
        };
        agents.set(agentId, agent);

        ws.send(JSON.stringify({ type: 'registered', agentId }));
        console.log(`[AgentWS] Agent registered: ${agentId} @ ${agent.hostname} caps=[${agent.capabilities.join(',')}]`);
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
