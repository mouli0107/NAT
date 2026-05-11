/**
 * Generator template self-tests — PR-1 (D1)
 *
 * Two levels of checking for each static template:
 *   1. String-invariant: the rendered content must NOT contain '*\/' on a
 *      JSDoc body line (a line like ' * some text *\/' which terminates the
 *      block comment prematurely, leaving trailing text outside the comment).
 *   2. tsc --noEmit: the rendered content must compile without TypeScript errors.
 *
 * Run with:
 *   npx tsx server/templates.test.ts
 */

import * as fs   from 'fs';
import * as os   from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import {
  GENERIC_BROWSER_ACTIONS,
  GENERIC_FORM_ACTIONS,
  GENERIC_ASSERT_ACTIONS,
  HELPERS_UNIVERSAL,
} from './script-writer-agent.js';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Test harness ─────────────────────────────────────────────────────────────

const results: { name: string; ok: boolean; error?: string }[] = [];

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    results.push({ name, ok: false, error: e.message });
    console.error(`  ❌ ${name}\n     ${e.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * D1 regression check — detect premature JSDoc block-comment close.
 *
 * A "premature close" is `*\/` appearing on a JSDoc BODY line — i.e., a line
 * whose content starts with ` * ` (not the closing ` *\/` line).
 *
 * Rule:
 *   A line matches as a JSDoc body line if it starts with optional whitespace
 *   followed by `*` followed by a character that is NOT `/`.
 *   If such a line contains `*\/` anywhere, it is a premature close.
 *
 * Examples of lines that MUST be flagged:
 *   " * waitForURL('**\/*') resolves immediately..."   ← original D1 bug
 *   " * example: use '**\/*' glob pattern here"
 *
 * Examples of lines that must NOT be flagged (valid):
 *   " *\/"                   ← normal JSDoc closing line
 *   "/** single-line *\/"    ← single-line JSDoc (does not start with \s+\*)
 *   " * no-star-slash here"  ← normal body line, no premature close
 */
function assertNoBlockCommentClose(templateName: string, content: string): void {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match a JSDoc body line: starts with ≥1 whitespace chars, then *, then non-/
    // This excludes the standard closing line (` */`) and single-line JSDoc (`/** ... */`)
    if (/^\s+\*[^/]/.test(line) && line.includes('*/')) {
      throw new Error(
        `Template "${templateName}" has premature block-comment close at line ${i + 1}:\n` +
        `  ${line.trim()}\n` +
        `  → Avoid any sequence ending in '*\/' inside a JSDoc comment body.`
      );
    }
  }
}

/**
 * Write `content` to a temp .ts file inside a minimal tsconfig project,
 * then run `npx tsc --project <tsconfig>` using the main project's node_modules
 * (where @playwright/test is installed) for type resolution.
 *
 * Throws with tsc output on non-zero exit code.
 */
function assertTscClean(templateName: string, content: string, filename: string): void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nat20-tpl-test-'));
  try {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');

    // tsconfig that resolves @playwright/test through the project's node_modules.
    // skipLibCheck:true avoids cascading errors from @playwright/test's own types.
    // files: [filePath] ensures we only compile this one file.
    const tsconfig = {
      compilerOptions: {
        target:           'ES2020',
        module:           'commonjs',
        lib:              ['ES2020', 'DOM'],
        strict:           true,
        esModuleInterop:  true,
        skipLibCheck:     true,
        moduleResolution: 'node',
        noEmit:           true,
      },
      files: [filePath],
    };
    const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8');

    // Run from project root so TypeScript resolves @playwright/test from its node_modules
    const projectRoot = path.resolve(__dirname, '..');
    execSync(`npx tsc --project "${tsconfigPath}"`, {
      cwd:   projectRoot,
      stdio: 'pipe',
    });
  } catch (e: any) {
    const output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') || e.message || '';
    throw new Error(`tsc failed for template "${templateName}":\n${output.slice(0, 2000)}`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ─── Template catalogue ───────────────────────────────────────────────────────

const TEMPLATES: { name: string; content: string; filename: string }[] = [
  { name: 'GENERIC_BROWSER_ACTIONS', content: GENERIC_BROWSER_ACTIONS, filename: 'browser.actions.ts' },
  { name: 'GENERIC_FORM_ACTIONS',    content: GENERIC_FORM_ACTIONS,    filename: 'form.actions.ts'    },
  { name: 'GENERIC_ASSERT_ACTIONS',  content: GENERIC_ASSERT_ACTIONS,  filename: 'assert.actions.ts'  },
  { name: 'HELPERS_UNIVERSAL',       content: HELPERS_UNIVERSAL,       filename: 'universal.ts'       },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n🧪 Generator template self-tests (D1 regression + tsc gates)\n');

for (const tpl of TEMPLATES) {
  // Level 1 — fast string invariant, no external tools needed
  await test(`[D1 string-check] ${tpl.name} — no premature JSDoc block-comment close`, () => {
    assertNoBlockCommentClose(tpl.name, tpl.content);
  });

  // Level 2 — full tsc compilation (requires @playwright/test in project node_modules)
  await test(`[D1 tsc-check] ${tpl.name} — compiles with zero TypeScript errors`, () => {
    assertTscClean(tpl.name, tpl.content, tpl.filename);
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

if (failed > 0) {
  console.error('\nFailed tests:');
  results.filter(r => !r.ok).forEach(r => console.error(`  • ${r.name}\n    ${r.error}`));
  process.exit(1);
} else {
  console.log('All template tests passed ✅');
}
