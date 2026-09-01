#!/usr/bin/env node
/**
 * API Test Agent — OpenAPI-driven smoke tester.
 *
 * Discovers an OpenAPI/Swagger spec, authenticates via OAuth2 client-credentials,
 * then exercises every operation and reports pass/fail. Read-only (GET) endpoints
 * are called directly; write endpoints (POST/PATCH/PUT) get a schema-generated
 * minimal body. Path params are resolved from list responses when possible, else
 * a synthetic value is used (a 404 then means "reachable, not found" — not a fail).
 *
 * Usage:
 *   API_CLIENT_ID=... API_CLIENT_SECRET=... \
 *   node scripts/api-test-agent.mjs --base https://host --write
 *
 * Flags:
 *   --base <url>   API host (default: env API_BASE_URL)
 *   --write        also exercise POST/PATCH/PUT/DELETE (default: read-only)
 *   --json <path>  write a JSON report
 */

const args = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const BASE = (getArg('--base', process.env.API_BASE_URL) || '').replace(/\/$/, '');
const WRITE = args.includes('--write');
const JSON_OUT = getArg('--json', null);
const CLIENT_ID = process.env.API_CLIENT_ID;
const CLIENT_SECRET = process.env.API_CLIENT_SECRET;

if (!BASE) { console.error('ERROR: --base <url> or API_BASE_URL required'); process.exit(2); }
if (!CLIENT_ID || !CLIENT_SECRET) { console.error('ERROR: API_CLIENT_ID and API_CLIENT_SECRET env vars required'); process.exit(2); }

// ── Load the OpenAPI spec (raw json, or embedded in swagger-ui-init.js) ────────
async function loadSpec() {
  for (const p of ['/api-docs/swagger.json', '/swagger.json', '/openapi.json', '/api-docs.json']) {
    try {
      const r = await fetch(BASE + p);
      if (r.ok) { const t = await r.text(); if (t.trim().startsWith('{')) return JSON.parse(t); }
    } catch { /* next */ }
  }
  // swagger-ui-express embeds the spec in swagger-ui-init.js
  const r = await fetch(BASE + '/api-docs/swagger-ui-init.js');
  const js = await r.text();
  const i = js.indexOf('"swaggerDoc":');
  if (i < 0) throw new Error('Could not locate an OpenAPI spec');
  let s = js.indexOf('{', i), d = 0, inS = false, esc = false, end = -1;
  for (let j = s; j < js.length; j++) {
    const c = js[j];
    if (inS) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inS = false; }
    else if (c === '"') inS = true; else if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) { end = j + 1; break; } }
  }
  return JSON.parse(js.slice(s, end));
}

const resolveRef = (spec, ref) => ref.replace(/^#\//, '').split('/').reduce((o, k) => o?.[k], spec);

// Minimal, spec-valid sample value for a schema.
function sample(spec, schema, depth = 0) {
  if (!schema) return 'test';
  if (schema.$ref) return sample(spec, resolveRef(spec, schema.$ref), depth);
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map(s => sample(spec, s, depth)));
  const t = schema.type;
  if (t === 'object' || schema.properties) {
    const o = {}; const req = new Set(schema.required || []);
    const props = Object.entries(schema.properties || {});
    for (const [k, v] of props) if (req.has(k) || req.size === 0 || depth === 0) o[k] = sample(spec, v, depth + 1);
    return o;
  }
  if (t === 'array') return [sample(spec, schema.items || {}, depth + 1)];
  if (t === 'integer' || t === 'number') return schema.minimum ?? 1;
  if (t === 'boolean') return true;
  const f = schema.format;
  if (f === 'date-time') return '2026-01-01T00:00:00.000Z';
  if (f === 'date') return '2026-01-01';
  if (f === 'uuid') return '00000000-0000-0000-0000-000000000001';
  if (f === 'email') return 'test-user@example.com';
  return 'test';
}

// ── OAuth2 client-credentials ─────────────────────────────────────────────────
async function getToken(spec) {
  const scheme = Object.values(spec.components?.securitySchemes || {})[0];
  const tokenPath = scheme?.flows?.clientCredentials?.tokenUrl || '/api/v1/oauth/token';
  const url = tokenPath.startsWith('http') ? tokenPath : BASE + tokenPath;
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const txt = await r.text();
  if (!r.ok) throw new Error(`token ${r.status}: ${txt.slice(0, 200)}`);
  const j = JSON.parse(txt);
  return j.access_token || j.token || j.accessToken;
}

// Harvest an id-like value from a list/collection response.
function harvestId(data) {
  const arr = Array.isArray(data) ? data : data?.items || data?.data || data?.results || data?.transactions || [];
  const first = Array.isArray(arr) ? arr[0] : null;
  if (first && typeof first === 'object') {
    for (const k of ['id', 'correlationId', 'workOrderId', 'transactionId', 'assignmentId', 'customerId', 'equipmentId']) {
      if (first[k] != null) return String(first[k]);
    }
  }
  return null;
}

const serverBase = (spec) => {
  const u = spec.servers?.[0]?.url || spec.basePath || '';
  return u.startsWith('http') ? u : BASE + u;
};

async function run() {
  console.log(`\n=== API Test Agent → ${BASE} ===`);
  const spec = await loadSpec();
  const apiBase = serverBase(spec);
  console.log(`API: ${spec.info?.title} v${spec.info?.version}  |  base ${apiBase}  |  mode ${WRITE ? 'read+write' : 'read-only'}`);

  const token = await getToken(spec);
  console.log(`Auth: ✅ obtained token (${String(token).length} chars)\n`);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Order: GET first (so ids can be harvested), then writes.
  const ops = [];
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      if (path.endsWith('/oauth/token')) continue; // auth endpoint — validated during login
      ops.push({ path, method, op });
    }
  }
  ops.sort((a, b) => (a.method === 'get' ? 0 : 1) - (b.method === 'get' ? 0 : 1));

  const ids = {};   // pathPrefix -> harvested id
  const results = [];

  for (const { path, method, op } of ops) {
    const isWrite = method !== 'get';
    if (isWrite && !WRITE) { results.push({ method, path, status: '-', outcome: 'SKIP', note: 'write (use --write)' }); continue; }

    // Resolve path params.
    let url = path;
    let usedSynthetic = false;
    for (const m of path.matchAll(/\{([^}]+)\}/g)) {
      const prefix = path.split('/{')[0];
      const harvested = ids[prefix];
      const val = harvested || '00000000-0000-0000-0000-000000000001';
      if (!harvested) usedSynthetic = true;
      url = url.replace(m[0], encodeURIComponent(val));
    }

    const full = apiBase + url;
    const headers = { ...authHeaders };
    let body;
    if (isWrite && op.requestBody) {
      const schema = op.requestBody.content?.['application/json']?.schema;
      body = JSON.stringify(sample(spec, schema));
      headers['Content-Type'] = 'application/json';
    }

    const t0 = Date.now();
    let status = 0, ok = false, snippet = '', requiredScope = '';
    try {
      const r = await fetch(full, { method: method.toUpperCase(), headers, body });
      status = r.status;
      const txt = await r.text();
      snippet = txt.slice(0, 140).replace(/\s+/g, ' ');
      ok = r.ok;
      if (status === 403) {
        try {
          const j = JSON.parse(txt);
          if (j?.error?.code === 'INSUFFICIENT_SCOPE') {
            const mm = /scope\(s\):\s*([^."]+)/.exec(j.error.message || '');
            requiredScope = mm ? mm[1].trim() : 'unknown';
          }
        } catch { /* not scope json */ }
      }
      if (method === 'get' && ok) { const id = harvestId(JSON.parse(txt || '{}')); if (id) ids[path] = id; }
    } catch (e) {
      snippet = 'network error: ' + e.message;
    }
    const ms = Date.now() - t0;

    // Classify. INSUFFICIENT_SCOPE is correct RBAC behavior (endpoint works, this
    // client just isn't granted the scope) — NOT an API failure.
    let outcome;
    if (requiredScope) outcome = 'SCOPE';
    else if (status === 401) outcome = 'FAIL';                              // auth broken
    else if (status === 403) outcome = 'FAIL';                              // forbidden (non-scope)
    else if (status >= 500) outcome = 'FAIL';                               // server error
    else if (ok) outcome = 'PASS';                                          // 2xx
    else if (status === 404) outcome = 'PASS';                              // reachable, resource absent
    else if (isWrite && (status === 400 || status === 422)) outcome = 'VALIDATED'; // reachable + validating input
    else outcome = 'WARN';

    const note = requiredScope ? `needs scope: ${requiredScope}`
      : (usedSynthetic && method === 'get' ? 'synthetic id'
      : (outcome === 'VALIDATED' ? 'sample body rejected (needs domain data)' : ''));
    results.push({ method, path, status, ms, outcome, note, snippet: outcome === 'FAIL' || outcome === 'WARN' ? snippet : '' });
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const icon = { PASS: '✅', VALIDATED: '🟡', SCOPE: '🔒', WARN: '⚠️ ', FAIL: '❌', SKIP: '· ' };
  console.log('RESULT  METHOD PATH                                              STATUS  ms   NOTE');
  for (const r of results) {
    console.log(
      `${(icon[r.outcome] || '  ')}${r.outcome.padEnd(9)} ${r.method.toUpperCase().padEnd(6)} ${r.path.padEnd(48)} ${String(r.status).padEnd(6)} ${String(r.ms ?? '').padEnd(4)} ${r.note || ''}${r.snippet ? ' — ' + r.snippet : ''}`,
    );
  }
  const tally = results.reduce((a, r) => (a[r.outcome] = (a[r.outcome] || 0) + 1, a), {});
  console.log('\nSummary:', JSON.stringify(tally));

  if (JSON_OUT) {
    const fs = await import('fs');
    fs.writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, api: spec.info, generatedAt: new Date().toISOString(), tally, results }, null, 2));
    console.log('Report written to', JSON_OUT);
  }
  const failed = results.filter(r => r.outcome === 'FAIL').length;
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('AGENT ERROR:', e.message); process.exit(2); });
