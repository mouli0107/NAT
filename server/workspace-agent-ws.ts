/**
 * NAT 2.0 — workspace-agent-ws.ts
 *
 * WebSocket server for Local Workspace Agents.
 *
 * Architecture:
 *   Developer's machine runs "workspace-agent" CLI daemon.
 *   Daemon connects to /ws/workspace-agent with a device token.
 *   Server pushes sync_project (full file manifest) when scripts are generated.
 *   Daemon writes files locally, then Claude Code can iterate on them.
 *   Daemon watches for changes and uploads file_changed back to server.
 *   Artifacts (playwright-report/, screenshots) pushed back via artifacts_ready.
 *
 * Message flow (Server → Agent):
 *   sync_project   { manifest: SyncManifest }
 *   pong
 *
 * Message flow (Agent → Server):
 *   agent_register { deviceToken, hostname, workspaceDir, tenantId }
 *   file_changed   { tenantId, projectId, filePath, content }
 *   artifacts_ready { tenantId, projectId, artifactType, files: ProjectFile[] }
 *   ping
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { SyncManifest, ProjectFile } from './blob-storage';
import { writeProjectFiles } from './blob-storage';
import { validateDeviceToken } from './auth-middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectedWorkspaceAgent {
  agentId: string;
  tenantId: string;
  userId: string;
  hostname: string;
  workspaceDir: string;
  connectedAt: Date;
  ws: WebSocket;
}

interface AgentStatus {
  total: number;
  agents: Array<{
    agentId: string;
    tenantId: string;
    hostname: string;
    workspaceDir: string;
    connectedSince: string;
  }>;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const workspaceAgents = new Map<string, ConnectedWorkspaceAgent>();
let wss: WebSocketServer | null = null;

// ─── Setup ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setupWorkspaceAgentWebSocket(_httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    let agent: ConnectedWorkspaceAgent | null = null;

    ws.on('message', async (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {
        case 'agent_register': {
          // Validate device token
          const ctx = await validateDeviceToken(msg.deviceToken || '');
          if (!ctx) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid or expired device token' }));
            ws.close(1008, 'Unauthorized');
            return;
          }

          const agentId = `wa-${ctx.tenantId}-${Date.now()}`;
          agent = {
            agentId,
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            hostname: msg.hostname || 'unknown',
            workspaceDir: msg.workspaceDir || '~',
            connectedAt: new Date(),
            ws,
          };
          workspaceAgents.set(agentId, agent);
          console.log(`[WorkspaceAgent] Registered: ${agentId} (tenant: ${ctx.tenantId}, host: ${agent.hostname})`);

          ws.send(JSON.stringify({ type: 'register_ack', agentId }));
          break;
        }

        case 'file_changed': {
          // Agent uploaded a file it modified locally (e.g. Claude Code fixed a test)
          if (!agent) return;
          const { tenantId, projectId, filePath, content } = msg;
          if (tenantId !== agent.tenantId) return; // tenant mismatch guard
          if (projectId && filePath && content !== undefined) {
            await writeProjectFiles(tenantId, projectId, [{ path: filePath, content }]).catch((err) => {
              console.warn('[WorkspaceAgent] writeProjectFiles error:', err.message);
            });
            console.log(`[WorkspaceAgent] File synced: ${tenantId}/${projectId}/${filePath}`);
          }
          break;
        }

        case 'artifacts_ready': {
          // Agent finished test run, uploads artifacts (playwright-report, screenshots)
          if (!agent) return;
          const { tenantId, projectId, artifactType, files } = msg;
          if (tenantId !== agent.tenantId || !files?.length) return;
          const artifactFiles: ProjectFile[] = files.map((f: any) => ({
            path: `_artifacts/${artifactType}/${f.path}`,
            content: f.content,
          }));
          await writeProjectFiles(tenantId, projectId, artifactFiles).catch((err) => {
            console.warn('[WorkspaceAgent] artifacts writeProjectFiles error:', err.message);
          });
          console.log(`[WorkspaceAgent] Artifacts received: ${artifactType} (${files.length} files) for ${tenantId}/${projectId}`);
          break;
        }

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    });

    ws.on('close', () => {
      if (agent) {
        workspaceAgents.delete(agent.agentId);
        console.log(`[WorkspaceAgent] Disconnected: ${agent.agentId}`);
      }
    });

    ws.on('error', (err) => {
      console.warn('[WorkspaceAgent] WebSocket error:', err.message);
    });
  });

  console.log('[WorkspaceAgent] WebSocket server ready at /ws/workspace-agent');
  return wss;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Push a sync_project manifest to ALL workspace agents belonging to a tenant.
 * Called after script generation completes.
 */
export function dispatchSyncProject(tenantId: string, manifest: SyncManifest): number {
  let dispatched = 0;
  for (const agent of workspaceAgents.values()) {
    if (agent.tenantId === tenantId && agent.ws.readyState === WebSocket.OPEN) {
      try {
        agent.ws.send(JSON.stringify({ type: 'sync_project', manifest }));
        dispatched++;
      } catch (err: any) {
        console.warn(`[WorkspaceAgent] Dispatch error for ${agent.agentId}:`, err.message);
      }
    }
  }
  if (dispatched === 0) {
    console.log(`[WorkspaceAgent] No online agents for tenant ${tenantId} — files saved to storage only`);
  }
  return dispatched;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getWorkspaceAgentStatus(): AgentStatus {
  const agents = Array.from(workspaceAgents.values()).map((a) => ({
    agentId: a.agentId,
    tenantId: a.tenantId,
    hostname: a.hostname,
    workspaceDir: a.workspaceDir,
    connectedSince: a.connectedAt.toISOString(),
  }));
  return { total: agents.length, agents };
}
