/**
 * Gate 12 — Business Action Signatures (D4)
 *
 * Every exported async function in a business_action file
 * (actions/business/*.actions.ts) must have the standard signature:
 *
 *   export async function xxx(page: Page, data: TestDataRow): Promise<void>
 *   — OR —
 *   export async function xxx(page: Page, _data: TestDataRow): Promise<void>
 *
 * A function with only (page: Page) is a BLOCKER — the spec always calls it
 * with (page, data) and will fail to compile.
 *
 * Severity: BLOCKER
 */

import * as fs   from 'fs';
import * as path from 'path';
import { GateResult, ValidationError } from '../types';

const GATE = 'gate-12-action-signatures';

export async function runGate12ActionSignatures(outputDir: string): Promise<GateResult> {
  const start  = Date.now();
  const errors: ValidationError[] = [];

  const businessDir = path.join(outputDir, 'actions', 'business');
  if (!fs.existsSync(businessDir)) {
    // Gate 05 will report missing directories — skip here to avoid noise
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  let files: string[];
  try {
    files = fs.readdirSync(businessDir)
      .filter(f => f.endsWith('.actions.ts'))
      .map(f => path.join(businessDir, f));
  } catch {
    return { gate: GATE, passed: true, errors: [], durationMs: Date.now() - start };
  }

  for (const filePath of files) {
    let source: string;
    try { source = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const relPath = path.relative(outputDir, filePath).replace(/\\/g, '/');
    errors.push(...checkSignatures(source, relPath));
  }

  return { gate: GATE, passed: errors.length === 0, errors, durationMs: Date.now() - start };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Accepted signature patterns after `export async function name`:
 *   (page: Page, data: TestDataRow)
 *   (page: Page, _data: TestDataRow)
 *   (page: Page, data: TestDataRow, ...rest)   ← future-proof
 *
 * Rejected:
 *   (page: Page)                               ← missing data param
 *   (page: Page, data = testData)              ← untyped default
 *   (page)                                     ← missing type annotation
 */
const GOOD_SIG_RE = /\(\s*page\s*:\s*Page\s*,\s*_?data\s*:\s*TestDataRow/;
const EXPORT_FN_RE = /^export\s+async\s+function\s+(\w+)\s*(\([^)]*\))/gm;

function checkSignatures(source: string, relPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  let m: RegExpExecArray | null;

  while ((m = EXPORT_FN_RE.exec(source)) !== null) {
    const fnName   = m[1];
    const sigBlock = m[2];

    if (!GOOD_SIG_RE.test(sigBlock)) {
      const lineNum = (source.slice(0, m.index).match(/\n/g) || []).length + 1;
      errors.push({
        gate:      GATE,
        severity:  'blocker',
        file:      relPath,
        line:      lineNum,
        rule:      'BUSINESS_ACTION_MISSING_DATA_PARAM',
        found:     `${fnName}${sigBlock}`,
        expected:  `${fnName}(page: Page, data: TestDataRow): Promise<void>`,
        promptFix: (
          `In ${relPath}: function '${fnName}' has signature '${sigBlock}' but must be ` +
          `(page: Page, data: TestDataRow): Promise<void>. ` +
          `Add the data parameter. If data is unused, prefix it with an underscore: _data: TestDataRow.`
        ),
      });
    }
  }

  return errors;
}
