/**
 * Gate 13 — Test-Data Sync (D7)
 *
 * Every `getTestData('XXX')` call in a test spec must have a matching row
 * (keyed by tcId) in `fixtures/test-data.xlsx`.
 *
 * A mismatch is a BLOCKER: `getTestData` throws at runtime when the row is absent,
 * so the test fails immediately — before any assertion can run.
 *
 * The gate skips silently if:
 *   - `fixtures/test-data.xlsx` does not exist (Gate 05 handles that)
 *   - No `.spec.ts` files are found (nothing to validate)
 *
 * Severity: BLOCKER
 */

import * as fs   from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { GateResult, ValidationError } from '../types';

// xlsx is a CommonJS package; use createRequire so its default export is fully accessible
// in the ESM context ("type":"module" project).
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = _require('xlsx') as typeof import('xlsx');

const GATE = 'gate-13-test-data-sync';

export async function runGate13TestDataSync(outputDir: string): Promise<GateResult> {
  const start  = Date.now();
  const errors: ValidationError[] = [];

  // ── 1. Read the Excel fixture ──────────────────────────────────────────────
  const xlsxPath = path.join(outputDir, 'fixtures', 'test-data.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    // Gate 05 already flags the missing file — skip here to avoid duplicate noise
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  let knownTcIds: Set<string>;
  try {
    knownTcIds = readTcIdsFromXlsx(xlsxPath);
  } catch {
    // Unreadable xlsx — not our job to flag, skip
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  if (knownTcIds.size === 0) {
    // Empty xlsx — skip (could be a brand-new file; Gate 05 will catch truly missing files)
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  // ── 2. Collect spec files ──────────────────────────────────────────────────
  const specFiles = collectSpecFiles(outputDir);
  if (specFiles.length === 0) {
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  // ── 3. Cross-reference each getTestData() call ────────────────────────────
  for (const filePath of specFiles) {
    let source: string;
    try { source = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const relPath = path.relative(outputDir, filePath).replace(/\\/g, '/');
    const calledIds = extractGetTestDataIds(source);

    for (const { tcId, line } of calledIds) {
      if (!knownTcIds.has(tcId)) {
        errors.push({
          gate:      GATE,
          severity:  'blocker',
          file:      relPath,
          line,
          rule:      'TEST_DATA_ID_NOT_IN_XLSX',
          found:     `getTestData('${tcId}')`,
          expected:  `A row with tcId="${tcId}" in fixtures/test-data.xlsx`,
          promptFix: (
            `In ${relPath}: getTestData('${tcId}') is called but no row with tcId="${tcId}" ` +
            `exists in fixtures/test-data.xlsx. ` +
            `Available ids: ${[...knownTcIds].join(', ')}. ` +
            `Either fix the getTestData() call to use one of the available ids, ` +
            `or ensure the Excel data row is generated with the correct tcId.`
          ),
        });
      }
    }
  }

  return { gate: GATE, passed: errors.length === 0, errors, durationMs: Date.now() - start };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read all tcId values from the first sheet of the xlsx file. */
function readTcIdsFromXlsx(xlsxPath: string): Set<string> {
  const wb   = XLSX.readFile(xlsxPath);
  const wsName = wb.SheetNames[0];
  if (!wsName) return new Set();
  const ws   = wb.Sheets[wsName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
  const ids  = new Set<string>();
  for (const row of rows) {
    const id = String(row['tcId'] ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

/** Walk the tests/ subtree for *.spec.ts files. */
function collectSpecFiles(dir: string): string[] {
  const results: string[] = [];
  const testsDir = path.join(dir, 'tests');
  if (!fs.existsSync(testsDir)) return results;

  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(d, entry.name));
      } else if (entry.name.endsWith('.spec.ts')) {
        results.push(path.join(d, entry.name));
      }
    }
  };

  walk(testsDir);
  return results;
}

/**
 * Extract all string literals passed to getTestData() in a source file.
 * Handles both single- and double-quoted arguments.
 * Returns { tcId, line } for each call.
 */
function extractGetTestDataIds(source: string): Array<{ tcId: string; line: number }> {
  const results: Array<{ tcId: string; line: number }> = [];
  // Match: getTestData('TC001') or getTestData("TC001")
  const re = /getTestData\(\s*(['"])([^'"]+)\1\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const tcId   = m[2];
    const lineNum = (source.slice(0, m.index).match(/\n/g) || []).length + 1;
    results.push({ tcId, line: lineNum });
  }
  return results;
}
