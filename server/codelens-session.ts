import type { Response } from 'express';
import type { CodeLensSession, SseEvent } from './codelens-types';

const sessions = new Map<string, CodeLensSession>();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours after completion

export function createSession(
  sessionId: string,
  repoUrl: string,
  branch: string,
  localPath: string,
  folders: string[] = [],
  ignorePatterns: string[] = [],
  userId = 'anonymous',
): CodeLensSession {
  const session: CodeLensSession = {
    sessionId,
    userId,
    repoUrl,
    branch,
    localPath,
    status: 'pending',
    files: [],
    violations: new Map(),
    fixes: new Map(),
    fileSummaries: new Map(),
    standardResults: [],
    sseClients: new Set(),
    eventHistory: [],
    createdAt: Date.now(),
    totalFiles: 0,
    lastReviewedFileIndex: 0,
    folders,
    ignorePatterns,
    runId: null,
    fileResultIds: new Map(),
    commitHash: '',
    fixBranch: null,
    fixBranchPushed: false,
    coverageExpected: 0,
    coverageVerified: 0,
    coverageErrors: new Map(),
    suppressions: new Set(),
    activeStandards: [],
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): CodeLensSession | undefined {
  return sessions.get(sessionId);
}

/** Emit an SSE event to all connected clients and append to the replay log. */
export function emit(session: CodeLensSession, event: SseEvent): void {
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
export function attachClient(session: CodeLensSession, res: Response): void {
  for (const evt of session.eventHistory) {
    try {
      res.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt)}\n\n`);
    } catch {
      return;
    }
  }
  session.sseClients.add(res);
}

export function detachClient(session: CodeLensSession, res: Response): void {
  session.sseClients.delete(res);
}

// Purge completed/stopped/error sessions older than TTL every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of Array.from(sessions.entries())) {
    const done = session.status === 'complete' || session.status === 'error' || session.status === 'stopped';
    if (done && session.createdAt < cutoff) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);
