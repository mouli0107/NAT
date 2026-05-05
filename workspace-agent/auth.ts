/**
 * NAT 2.0 Workspace Agent — auth.ts
 *
 * GitHub CLI-style device auth flow:
 *   1. Agent requests a device code from NAT 2.0 server
 *   2. User opens browser to the verification URL and enters the user code
 *   3. Agent polls until approved — receives a long-lived device token
 *   4. Token stored in ~/.nat20/credentials.json
 *
 * On subsequent starts, agent loads saved credentials and connects directly.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';

// ─── Credentials Store ────────────────────────────────────────────────────────

interface Credentials {
  serverUrl: string;
  token: string;
  tenantId: string;
  savedAt: string;
}

const CREDS_DIR = path.join(os.homedir(), '.nat20');
const CREDS_FILE = path.join(CREDS_DIR, 'credentials.json');

export function loadCredentials(): Credentials | null {
  try {
    const raw = fs.readFileSync(CREDS_FILE, 'utf-8');
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  fs.mkdirSync(CREDS_DIR, { recursive: true });
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  try { fs.unlinkSync(CREDS_FILE); } catch {}
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function httpRequest(url: string, method: string, body?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Non-JSON response: ${data.slice(0, 200)}`)); }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Device Auth Flow ─────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function runLoginFlow(serverUrl: string): Promise<Credentials> {
  const base = serverUrl.replace(/\/$/, '');
  console.log(`\nConnecting to NAT 2.0 at: ${base}\n`);

  // Step 1: Request device code
  let codeResp: any;
  try {
    codeResp = await httpRequest(`${base}/api/auth/device/code`, 'POST', {});
  } catch (err: any) {
    throw new Error(`Failed to reach NAT 2.0 server: ${err.message}`);
  }

  const { deviceCode, userCode, verificationUrl } = codeResp;
  if (!deviceCode || !userCode) {
    throw new Error(`Unexpected server response: ${JSON.stringify(codeResp)}`);
  }

  console.log('══════════════════════════════════════════════════');
  console.log('  NAT 2.0 Workspace Agent — Device Authorization  ');
  console.log('══════════════════════════════════════════════════');
  console.log(`\n  1. Open this URL in your browser:`);
  console.log(`     ${verificationUrl}`);
  console.log(`\n  2. Enter this code when prompted:`);
  console.log(`     ${userCode}`);
  console.log(`\n  Waiting for approval (timeout: 10 min)...\n`);

  // Try to open browser automatically
  try {
    const { default: open } = await import('open');
    await open(verificationUrl);
    console.log('  (Browser opened automatically)\n');
  } catch {
    // Browser open is best-effort
  }

  // Step 2: Poll for approval
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    process.stdout.write('.');

    let pollResp: any;
    try {
      pollResp = await httpRequest(`${base}/api/auth/device/poll?deviceCode=${deviceCode}`, 'GET');
    } catch {
      continue; // network hiccup — keep polling
    }

    if (pollResp.status === 'approved' && pollResp.token) {
      console.log('\n\n  ✓ Authorization approved!\n');
      const creds: Credentials = {
        serverUrl: base,
        token: pollResp.token,
        tenantId: pollResp.tenantId || 'default-tenant',
        savedAt: new Date().toISOString(),
      };
      saveCredentials(creds);
      console.log(`  Credentials saved to: ${CREDS_FILE}\n`);
      return creds;
    }

    if (pollResp.status === 'expired') {
      throw new Error('Device code expired. Please run login again.');
    }
  }

  throw new Error('Login timed out. Please try again.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
