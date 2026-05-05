#!/usr/bin/env tsx
/**
 * NAT 2.0 — Workspace Agent
 *
 * Long-running daemon that bridges the NAT 2.0 cloud platform with the
 * developer's local machine so Claude Code can iterate on generated scripts.
 *
 * Flow:
 *   1. Authenticate (device token from ~/.nat20/credentials.json)
 *   2. Connect to NAT 2.0 server via WebSocket (/ws/workspace-agent)
 *   3. Receive sync_project → write files to ~/nat20-workspace/{tenant}/{project}/
 *   4. Watch files with chokidar → upload file_changed back to server on save
 *   5. After test run: upload playwright-report/ as artifacts_ready
 *
 * Usage:
 *   tsx agent.ts                      # start daemon (auto-login if no creds)
 *   tsx agent.ts login                # force re-login
 *   tsx agent.ts login --server=https://nat20.example.com
 *   tsx agent.ts logout
 */

import WebSocket from 'ws';
import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { loadCredentials, saveCredentials, clearCredentials, runLoginFlow } from './auth.ts';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_SERVER_URL = process.env.NAT20_SERVER_URL || 'http://localhost:5000';
const WORKSPACE_ROOT = path.join(os.homedir(), 'nat20-workspace');
const RECONNECT_DELAY_MS = 5000;
const PING_INTERVAL_MS = 25000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectFile {
  path: string;
  content: string;
}

interface SyncManifest {
  tenantId: string;
  projectId: string;
  projectName: string;
  serverUrl: string;
  files: ProjectFile[];
  syncedAt: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let pingTimer: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let watchers = new Map<string, FSWatcher>(); // projectId → watcher
let token = '';
let serverUrl = DEFAULT_SERVER_URL;
let agentId = '';

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'logout') {
    clearCredentials();
    console.log('Logged out. Credentials cleared.');
    process.exit(0);
  }

  if (cmd === 'login') {
    const serverArg = args.find((a) => a.startsWith('--server='));
    const srv = serverArg ? serverArg.split('=')[1] : DEFAULT_SERVER_URL;
    await runLoginFlow(srv);
    console.log('Login successful. Run `tsx agent.ts` to start the agent.');
    process.exit(0);
  }

  // Normal start — load or obtain credentials
  let creds = loadCredentials();
  if (!creds) {
    const serverArg = args.find((a) => a.startsWith('--server='));
    const srv = serverArg ? serverArg.split('=')[1] : DEFAULT_SERVER_URL;
    creds = await runLoginFlow(srv);
  }

  token = creds.token;
  serverUrl = creds.serverUrl;

  console.log(`\nNAT 2.0 Workspace Agent`);
  console.log(`  Server : ${serverUrl}`);
  console.log(`  Tenant : ${creds.tenantId}`);
  console.log(`  Workspace : ${WORKSPACE_ROOT}\n`);

  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

  connect();

  // Graceful shutdown
  process.on('SIGINT', () => { console.log('\nShutting down...'); shutdown(); process.exit(0); });
  process.on('SIGTERM', () => { shutdown(); process.exit(0); });
}

// ─── WebSocket Connection ─────────────────────────────────────────────────────

function wsUrl(): string {
  const base = serverUrl.replace(/\/$/, '');
  if (base.startsWith('http://')) return base.replace('http://', 'ws://') + '/ws/workspace-agent';
  if (base.startsWith('https://')) return base.replace('https://', 'wss://') + '/ws/workspace-agent';
  return base + '/ws/workspace-agent';
}

function connect() {
  if (ws) return;

  console.log(`[Agent] Connecting to ${wsUrl()}...`);
  try {
    ws = new WebSocket(wsUrl());
  } catch (err: any) {
    console.warn('[Agent] Connection failed:', err.message);
    scheduleReconnect();
    return;
  }

  ws.on('open', () => {
    console.log('[Agent] Connected ✓');
    ws!.send(JSON.stringify({
      type: 'agent_register',
      deviceToken: token,
      hostname: os.hostname(),
      workspaceDir: WORKSPACE_ROOT,
    }));

    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL_MS);
  });

  ws.on('message', async (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    await handleMessage(msg);
  });

  ws.on('close', () => {
    console.log('[Agent] Disconnected — will reconnect...');
    cleanup();
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.warn('[Agent] WebSocket error:', err.message);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

function cleanup() {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  ws = null;
}

function shutdown() {
  cleanup();
  for (const watcher of watchers.values()) { watcher.close(); }
  watchers.clear();
}

// ─── Message Handler ──────────────────────────────────────────────────────────

async function handleMessage(msg: any) {
  switch (msg.type) {
    case 'register_ack':
      agentId = msg.agentId;
      console.log(`[Agent] Registered as ${agentId}`);
      console.log('[Agent] Waiting for script sync events...\n');
      break;

    case 'auth_error':
      console.error('[Agent] Authentication failed:', msg.message);
      console.error('[Agent] Run `tsx agent.ts login` to re-authenticate.');
      clearCredentials();
      process.exit(1);
      break;

    case 'sync_project':
      await handleSyncProject(msg.manifest as SyncManifest);
      break;

    case 'pong':
      // Keep-alive response — no action needed
      break;

    default:
      break;
  }
}

// ─── Project Sync ─────────────────────────────────────────────────────────────

async function handleSyncProject(manifest: SyncManifest) {
  const { tenantId, projectId, projectName, files } = manifest;
  const projectDir = path.join(WORKSPACE_ROOT, tenantId, sanitizeName(projectName));

  console.log(`\n[Sync] Receiving project: ${projectName} (${files.length} files)`);
  fs.mkdirSync(projectDir, { recursive: true });

  // Write all files
  for (const file of files) {
    const fullPath = path.join(projectDir, file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf-8');
  }

  console.log(`[Sync] Files written to: ${projectDir}`);

  // Run npm install if package.json present and node_modules absent
  const pkgJson = path.join(projectDir, 'package.json');
  const nodeModules = path.join(projectDir, 'node_modules');
  if (fs.existsSync(pkgJson) && !fs.existsSync(nodeModules)) {
    console.log('[Sync] Running npm install...');
    try {
      execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
      console.log('[Sync] npm install complete');
    } catch (err: any) {
      console.warn('[Sync] npm install warning:', err.message);
    }
  }

  // Set up file watcher for this project (Claude Code edits → upload back)
  startWatcher(tenantId, projectId, projectDir);

  console.log(`\n✓ Project synced: ${projectDir}`);
  console.log('  Open this folder in VS Code and start Claude Code.\n');
}

// ─── File Watcher ─────────────────────────────────────────────────────────────

function startWatcher(tenantId: string, projectId: string, projectDir: string) {
  // Stop previous watcher for same project if any
  const existing = watchers.get(projectId);
  if (existing) { existing.close(); }

  const watcher = chokidar.watch(projectDir, {
    ignored: /(node_modules|\.git|playwright-report|test-results|\.auth)/,
    persistent: true,
    ignoreInitial: true,    // Don't fire for files we just wrote
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on('change', async (filePath: string) => {
    const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return; // File may have been deleted
    }

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'file_changed',
        tenantId,
        projectId,
        filePath: relPath,
        content,
      }));
      console.log(`[Watch] Uploaded: ${relPath}`);
    }
  });

  watchers.set(projectId, watcher);
  console.log(`[Watch] Watching for changes in: ${projectDir}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('[Agent] Fatal error:', err.message);
  process.exit(1);
});
