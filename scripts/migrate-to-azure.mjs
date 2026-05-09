/**
 * migrate-to-azure.mjs
 *
 * Copies every row from the local nat20 PostgreSQL database to the Azure
 * PostgreSQL database. Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 *
 * Foreign key constraints are bypassed with SET session_replication_role='replica'
 * so the copy order does not matter.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * HOW TO GET THE AZURE DATABASE_URL:
 *
 *   Azure Portal → App Services → nat20-astra
 *     → Configuration → Application Settings → DATABASE_URL
 *     (copy the full value, it looks like:
 *      postgresql://user:pass@nat20-astra.postgres.database.azure.com/dbname?sslmode=require)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * USAGE (PowerShell):
 *
 *   $env:AZURE_DB_URL = "postgresql://..."
 *   node scripts/migrate-to-azure.mjs
 *
 * USAGE (bash/cmd):
 *
 *   AZURE_DB_URL="postgresql://..." node scripts/migrate-to-azure.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 */

import pg from 'pg';
const { Pool } = pg;

// ─── Local source database ─────────────────────────────────────────────────────
const LOCAL_URL = 'postgresql://postgres:Mouli%401978@localhost:5432/nat20';

// ─── Azure target database ─────────────────────────────────────────────────────
const AZURE_URL = process.env.AZURE_DB_URL;

if (!AZURE_URL) {
  console.error('\n❌  AZURE_DB_URL is not set.\n');
  console.error('    Get it from: Azure Portal → nat20-astra → Configuration → APPLICATION SETTINGS → DATABASE_URL');
  console.error('\n    Then run:');
  console.error('      $env:AZURE_DB_URL = "postgresql://..."');
  console.error('      node scripts/migrate-to-azure.mjs\n');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Copy one table, batching 500 rows per INSERT to stay within query-size limits. */
async function copyTable(local, azure, tableName) {
  // Check existence in local
  const exists = await local.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  if (exists.rowCount === 0) {
    process.stdout.write(`  ⬜  ${tableName} (not in local)\n`);
    return 0;
  }

  const { rows } = await local.query(`SELECT * FROM "${tableName}"`);
  if (rows.length === 0) {
    process.stdout.write(`  ─   ${tableName.padEnd(40)} 0 rows\n`);
    return 0;
  }

  const cols = Object.keys(rows[0]);
  const BATCH = 500;
  let copied = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = [];
    const placeholders = batch.map((row, bi) => {
      const base = bi * cols.length;
      cols.forEach(c => values.push(row[c] === undefined ? null : row[c]));
      return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
    });

    await azure.query(
      `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT DO NOTHING`,
      values
    );
    copied += batch.length;
  }

  process.stdout.write(`  ✓   ${tableName.padEnd(40)} ${copied} rows\n`);
  return copied;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const local = new Pool({ connectionString: LOCAL_URL, max: 3 });
  const azure = new Pool({ connectionString: AZURE_URL, ssl: { rejectUnauthorized: false }, max: 3 });

  // Verify both connections
  console.log('\n🔗  Testing connections...');
  await local.query('SELECT 1');
  console.log('    Local  ✓', LOCAL_URL.replace(/:[^:@]+@/, ':***@'));

  const info = await azure.query('SELECT current_database() AS db');
  console.log('    Azure  ✓ database:', info.rows[0].db);

  // Get all tables from local
  const tableRes = await local.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const tables = tableRes.rows.map(r => r.table_name);
  console.log(`\n📦  Copying ${tables.length} tables (FK checks suspended)...\n`);

  // Suspend FK enforcement on the Azure side for the duration of the copy.
  // This removes the need to insert tables in dependency order.
  const azureClient = await azure.connect();
  try {
    await azureClient.query("SET session_replication_role = 'replica'");

    let grandTotal = 0;
    for (const table of tables) {
      try {
        grandTotal += await copyTable(local, azureClient, table);
      } catch (err) {
        console.error(`  ⚠   ${table}: ${err.message}`);
      }
    }

    await azureClient.query("SET session_replication_role = 'DEFAULT'");
    console.log(`\n✅  Migration complete — ${grandTotal} total rows copied.\n`);
  } finally {
    azureClient.release();
  }

  await local.end();
  await azure.end();
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
