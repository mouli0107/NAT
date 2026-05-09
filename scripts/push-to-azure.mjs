/**
 * push-to-azure.mjs
 *
 * Reads every table from the local nat20 database and POSTs it to the
 * /api/admin/migrate-data endpoint running on Azure.
 * No direct DB connection to Azure needed — goes through HTTPS port 443.
 *
 * Usage (PowerShell):
 *   node scripts/push-to-azure.mjs
 */

import pg from 'pg';
import https from 'https';

const { Pool } = pg;

const LOCAL_URL    = 'postgresql://postgres:Mouli%401978@localhost:5432/nat20';
const AZURE_HOST   = 'nat20-astra.azurewebsites.net';
const MIGRATE_PATH = '/api/admin/migrate-data';
const SECRET       = 'nat20-migrate-2026';

// ─── POST helper ──────────────────────────────────────────────────────────────

function postJson(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: AZURE_HOST,
      path: MIGRATE_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 120000,
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const local = new Pool({ connectionString: LOCAL_URL, max: 3 });

  // Get all tables
  const tableRes = await local.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const tables = tableRes.rows.map(r => r.table_name);

  console.log(`\n📦  Pushing ${tables.length} tables to ${AZURE_HOST}...\n`);

  let grandTotal = 0;

  for (const table of tables) {
    const { rows } = await local.query(`SELECT * FROM "${table}"`);

    if (rows.length === 0) {
      process.stdout.write(`  ─   ${table.padEnd(40)} 0 rows\n`);
      continue;
    }

    try {
      const result = await postJson({ secret: SECRET, table, rows });

      if (result.status === 200) {
        process.stdout.write(`  ✓   ${table.padEnd(40)} ${result.body.inserted} rows\n`);
        grandTotal += result.body.inserted || 0;
      } else {
        process.stdout.write(`  ⚠   ${table.padEnd(40)} HTTP ${result.status}: ${JSON.stringify(result.body)}\n`);
      }
    } catch (err) {
      process.stdout.write(`  ✗   ${table.padEnd(40)} ${err.message}\n`);
    }
  }

  console.log(`\n✅  Done — ${grandTotal} rows pushed.\n`);
  await local.end();
}

main().catch(err => {
  console.error('\n❌  Push failed:', err.message);
  process.exit(1);
});
