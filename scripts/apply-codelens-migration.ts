import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Applies the ASTRA Code Lens migration (0005_codelens_tables.sql).
 * Idempotent — every statement uses CREATE TABLE/INDEX IF NOT EXISTS,
 * so running it more than once is safe.
 *
 *   npx tsx scripts/apply-codelens-migration.ts
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — cannot apply migration.');
  }

  const sqlPath = path.join(process.cwd(), 'migrations', '0005_codelens_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    // Verify the key table exists and report row count
    const { rows } = await pool.query(
      `SELECT to_regclass('public.codelens_runs')        AS runs,
              to_regclass('public.codelens_file_results') AS file_results,
              to_regclass('public.codelens_violations')   AS violations`,
    );
    console.log('[migration] Applied 0005_codelens_tables.sql successfully.');
    console.log('[migration] Tables present:', rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[migration] FAILED:', err?.message ?? err);
  process.exit(1);
});
