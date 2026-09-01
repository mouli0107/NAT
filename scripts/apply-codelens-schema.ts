import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Applies the COMPLETE ASTRA Code Lens schema (migrations/0007_codelens_complete.sql).
 * Idempotent + Code-Lens-only: every statement is CREATE … IF NOT EXISTS /
 * ADD COLUMN IF NOT EXISTS, so it only ADDS Code-Lens tables and never alters or
 * drops any other table. Safe to run against an existing prod DB, and safe to
 * re-run.
 *
 *   # point DATABASE_URL at the TARGET db, then:
 *   npx tsx scripts/apply-codelens-schema.ts
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — cannot apply schema.');
  }

  const sqlPath = path.join(process.cwd(), 'migrations', '0007_codelens_complete.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Azure Postgres requires SSL; pg honors sslmode=require in the URL, but set
  // a permissive SSL fallback so it works even if the URL omits it.
  const needsSsl = /azure|postgres\.database\.azure\.com/i.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `SELECT to_regclass('public.codelens_runs')             AS runs,
              to_regclass('public.codelens_file_results')      AS file_results,
              to_regclass('public.codelens_standard_results')  AS standard_results,
              to_regclass('public.codelens_violations')        AS violations,
              to_regclass('public.codelens_check_cache')       AS check_cache,
              to_regclass('public.codelens_suppressions')      AS suppressions,
              to_regclass('public.codelens_custom_standards')  AS custom_standards`,
    );
    const present = rows[0];
    const missing = Object.entries(present).filter(([, v]) => v === null).map(([k]) => k);
    console.log('[codelens-schema] Tables present:', present);
    if (missing.length) {
      throw new Error(`Some Code Lens tables are still missing: ${missing.join(', ')}`);
    }
    console.log('[codelens-schema] ✓ All Code Lens tables present.');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[codelens-schema] FAILED:', err?.message ?? err);
  process.exit(1);
});
