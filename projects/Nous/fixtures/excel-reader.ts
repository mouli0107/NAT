/**
 * Excel Test Data Reader — fixtures/excel-reader.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * All test data lives in fixtures/test-data.xlsx — NOT in TypeScript files.
 *
 * Excel sheet "TestData" columns:
 *   tcId      | baseUrl  | username | password | firstName | ... (any field)
 *   TC001     | https:// | john@... |          | John      | ...
 *   TC002     | https:// | jane@... |          | Jane      | ...
 *
 * HOW TO UPDATE TEST DATA:
 *   1. Open fixtures/test-data.xlsx in Excel / LibreOffice
 *   2. Edit the row for your TC ID (add columns freely)
 *   3. Save — no code changes needed
 *
 * ENV VAR OVERRIDES (CI/CD pipelines):
 *   BASE_URL   overrides baseUrl   for every row
 *   USERNAME   overrides username  for every row
 *   PASSWORD   overrides password  for every row (recommended for sensitive data)
 *
 * USAGE:
 *   import { getTestData } from '@fixtures/excel-reader';
 *   const data = getTestData('TC001');
 *   await page.fill('#username', data.username);
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

export interface TestDataRow {
  tcId: string;
  baseUrl: string;
  [key: string]: string;
}

// ── Internal cache (loaded once per test run) ──────────────────────────────────

let _cache: Record<string, TestDataRow> | null = null;

function loadAll(): Record<string, TestDataRow> {
  const filePath = path.join(__dirname, 'test-data.xlsx');
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames.includes('TestData') ? 'TestData' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('[excel-reader] test-data.xlsx has no sheets');
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
  const map: Record<string, TestDataRow> = {};
  for (const row of rows) {
    const tcId = String(row['tcId'] ?? '').trim();
    if (tcId) map[tcId] = { ...row, tcId } as TestDataRow;
  }
  return map;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the test data row for the given TC ID from test-data.xlsx.
 * Throws immediately if the TC ID is not found — tests fail fast with a clear error.
 */
export function getTestData(tcId: string): TestDataRow {
  if (!_cache) _cache = loadAll();
  const row = _cache[tcId];
  if (!row) {
    const ids = Object.keys(_cache).join(', ') || '(none)';
    throw new Error(
      `[excel-reader] No row found for "${tcId}" in fixtures/test-data.xlsx.\n` +
      `Available IDs: ${ids}\n` +
      `Open fixtures/test-data.xlsx and add a row with tcId="${tcId}" to fix this.`
    );
  }
  // Apply env var overrides for sensitive / environment-specific fields
  return {
    ...row,
    ...(process.env.BASE_URL  ? { baseUrl:  process.env.BASE_URL  } : {}),
    ...(process.env.USERNAME  ? { username: process.env.USERNAME  } : {}),
    ...(process.env.PASSWORD  ? { password: process.env.PASSWORD  } : {}),
  };
}

/**
 * Returns ALL rows keyed by tcId — useful for data-driven tests.
 *   for (const [id, data] of Object.entries(getAllTestData())) { ... }
 */
export function getAllTestData(): Record<string, TestDataRow> {
  if (!_cache) _cache = loadAll();
  return { ..._cache };
}
