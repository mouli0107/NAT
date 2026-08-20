/**
 * prompt-gen-session.ts — in-memory session + context-bundle stores for the
 * AI-DLC Prompt Generator. Modeled on codelens-session.ts (SSE emit/attach/detach
 * with full replay for late joiners, plus TTL purge). No DB dependency for the MVP.
 */
import type { Response } from 'express';
import type { ContextBundle, PromptGenSession, SseEvent, StoryInput } from './prompt-gen-types';
import { getTechProfile } from './tech-profiles';

const sessions = new Map<string, PromptGenSession>();
const bundles = new Map<string, ContextBundle>();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2h after completion
const BUNDLE_TTL_MS = 4 * 60 * 60 * 1000;  // 4h

// ─── Context bundles ───────────────────────────────────────────────────────────

export function saveBundle(bundle: ContextBundle): void {
  bundles.set(bundle.bundleId, bundle);
}

export function getBundle(bundleId: string): ContextBundle | undefined {
  return bundles.get(bundleId);
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export function createSession(
  sessionId: string,
  userId: string,
  tenantId: string,
  projectId: string,
  techProfileId: string,
  story: StoryInput,
  bundleId: string,
): PromptGenSession {
  const profile = getTechProfile(techProfileId);
  const session: PromptGenSession = {
    sessionId,
    userId,
    tenantId,
    projectId,
    status: 'pending',
    techProfileId: profile.id,
    story,
    bundleId,
    contract: null,
    layers: profile.layers.map(l => ({
      layerId: l.id,
      label: l.label,
      model: l.model,
      status: 'pending',
      prompt: '',
    })),
    error: null,
    createdAt: Date.now(),
    sseClients: new Set(),
    eventHistory: [],
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): PromptGenSession | undefined {
  return sessions.get(sessionId);
}

/** Emit an SSE event to all connected clients and append to the replay log. */
export function emit(session: PromptGenSession, event: SseEvent): void {
  session.eventHistory.push(event);
  const payload = `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of Array.from(session.sseClients)) {
    try {
      client.write(payload);
    } catch {
      session.sseClients.delete(client);
    }
  }
}

/** Attach a new SSE client — replay full history first so late joiners are in sync. */
export function attachClient(session: PromptGenSession, res: Response): void {
  for (const evt of session.eventHistory) {
    try {
      res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt)}\n\n`);
    } catch {
      return;
    }
  }
  session.sseClients.add(res);
}

export function detachClient(session: PromptGenSession, res: Response): void {
  session.sseClients.delete(res);
}

// ─── Extraction jobs (background story extraction for large specs) ──────────────

export interface ExtractionJob {
  jobId: string;
  userId: string;
  status: 'running' | 'complete' | 'error';
  stories: any[];
  error: string | null;
  sseClients: Set<Response>;
  eventHistory: SseEvent[];
  createdAt: number;
}

const extractionJobs = new Map<string, ExtractionJob>();

export function createExtractionJob(jobId: string, userId: string): ExtractionJob {
  const job: ExtractionJob = {
    jobId, userId, status: 'running', stories: [], error: null,
    sseClients: new Set(), eventHistory: [], createdAt: Date.now(),
  };
  extractionJobs.set(jobId, job);
  return job;
}

export function getExtractionJob(jobId: string): ExtractionJob | undefined {
  return extractionJobs.get(jobId);
}

export function emitJob(job: ExtractionJob, event: SseEvent): void {
  job.eventHistory.push(event);
  const payload = `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of Array.from(job.sseClients)) {
    try { client.write(payload); } catch { job.sseClients.delete(client); }
  }
}

export function attachJobClient(job: ExtractionJob, res: Response): void {
  for (const evt of job.eventHistory) {
    try { res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt)}\n\n`); } catch { return; }
  }
  job.sseClients.add(res);
}

export function detachJobClient(job: ExtractionJob, res: Response): void {
  job.sseClients.delete(res);
}

// Purge finished sessions + old bundles periodically.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of Array.from(sessions.entries())) {
    const done = s.status === 'complete' || s.status === 'error';
    if (done && now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
  for (const [id, b] of Array.from(bundles.entries())) {
    if (now - b.createdAt > BUNDLE_TTL_MS) bundles.delete(id);
  }
  for (const [id, j] of Array.from(extractionJobs.entries())) {
    if (j.status !== 'running' && now - j.createdAt > SESSION_TTL_MS) extractionJobs.delete(id);
  }
}, 10 * 60 * 1000);
