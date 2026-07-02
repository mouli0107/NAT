import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'http';
import { runAutopilot } from './autopilot-agent';

export const autopilotRouter = Router();

// ─── Live video (CDP screencast) — per-session WS clients ─────────────────────
const frameClients = new Map<string, Set<WebSocket>>();

/** WebSocket server for /ws/autopilot?sessionId= — streams live JPEG frames. */
export function setupAutopilotWebSocket(_httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws: WebSocket, req: any) => {
    const sid = new URL(req.url || '', 'http://x').searchParams.get('sessionId') || '';
    if (!sid) { ws.close(); return; }
    let set = frameClients.get(sid);
    if (!set) { set = new Set(); frameClients.set(sid, set); }
    set.add(ws);
    ws.on('close', () => { const s = frameClients.get(sid); if (s) { s.delete(ws); if (s.size === 0) frameClients.delete(sid); } });
    ws.on('error', () => { /* ignore */ });
  });
  return wss;
}

function broadcastFrame(sid: string, jpegBase64: string) {
  const set = frameClients.get(sid);
  if (!set) return;
  for (const ws of Array.from(set)) {
    if (ws.readyState === 1) { try { ws.send(jpegBase64); } catch { /* ignore */ } }
  }
}

interface APSession { id: string; clients: Set<Response>; events: unknown[]; done: boolean; createdAt: number; }
const sessions = new Map<string, APSession>();

function emit(s: APSession, ev: unknown) {
  s.events.push(ev);
  const payload = `data: ${JSON.stringify(ev)}\n\n`;
  for (const c of Array.from(s.clients)) {
    try { c.write(payload); } catch { s.clients.delete(c); }
  }
}

// Purge finished sessions after 30 min.
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, s] of Array.from(sessions.entries())) if (s.done && s.createdAt < cutoff) sessions.delete(id);
}, 5 * 60 * 1000);

// POST /api/autopilot/run — start a grounding run; streams progress over SSE.
autopilotRouter.post('/run', (req: Request, res: Response) => {
  const { targetUrl, steps, testName } = req.body as { targetUrl?: string; steps?: string; testName?: string };
  if (!targetUrl || typeof targetUrl !== 'string') return res.status(400).json({ error: 'targetUrl is required' });
  if (!steps || typeof steps !== 'string') return res.status(400).json({ error: 'steps are required' });

  let url = targetUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const stepLines = steps.split('\n').map(l => l.trim()).filter(Boolean);
  if (stepLines.length === 0) return res.status(400).json({ error: 'no steps provided' });

  const id = `ap-${randomUUID().slice(0, 8)}`;
  const s: APSession = { id, clients: new Set(), events: [], done: false, createdAt: Date.now() };
  sessions.set(id, s);
  res.json({ sessionId: id, streamUrl: `/api/autopilot/stream?sessionId=${id}` });

  runAutopilot(url, stepLines, { testName, onStep: g => emit(s, { type: 'step', step: g }), onFrame: data => broadcastFrame(id, data) })
    .then(result => emit(s, { type: 'done', result }))
    .catch(err => emit(s, { type: 'error', message: String(err?.message ?? err).split('\n')[0] }))
    .finally(() => { s.done = true; });
});

// GET /api/autopilot/stream?sessionId= — SSE progress (replays history on connect).
autopilotRouter.get('/stream', (req: Request, res: Response) => {
  const id = String(req.query.sessionId ?? '');
  const s = sessions.get(id);
  if (!s) return res.status(404).json({ error: `session ${id} not found` });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  for (const ev of s.events) res.write(`data: ${JSON.stringify(ev)}\n\n`);
  s.clients.add(res);
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* ignore */ } }, 15000);
  req.on('close', () => { clearInterval(hb); s.clients.delete(res); });
});
