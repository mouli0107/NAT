/**
 * Gate 11 — Action Symbol Manifest (D3)
 *
 * For every TypeScript file in the generated project, scan import statements
 * that target a generic action module (@actions/generic/*).  Each imported
 * name must exist in the action manifest built from the static templates.
 *
 * Severity: BLOCKER — an import that doesn't exist is a compile error.
 *
 * This gate catches the class of bug where a prompt emits
 *   import { verifyElementEnabled } from '@actions/generic/assert.actions'
 * when the actual export is `verifyEnabled`.
 */

import * as fs   from 'fs';
import * as path from 'path';
import { GateResult, ValidationError } from '../types';
import { buildActionManifest } from '../../script-writer-agent.js';

const GATE = 'gate-11-action-symbols';

// Module aliases that gate 11 validates imports from
const GUARDED_MODULES = new Set([
  '@actions/generic/browser.actions',
  '@actions/generic/form.actions',
  '@actions/generic/assert.actions',
]);

export async function runGate11ActionSymbols(outputDir: string): Promise<GateResult> {
  const start   = Date.now();
  const errors: ValidationError[] = [];

  // Build manifest once — cheap (regex on in-memory strings)
  const manifest = buildActionManifest();

  // Collect all .ts files in the project (excluding node_modules, dist)
  const tsFiles = collectTsFiles(outputDir);

  for (const filePath of tsFiles) {
    let source: string;
    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const relPath = path.relative(outputDir, filePath).replace(/\\/g, '/');
    const fileErrors = checkImports(source, relPath, manifest);
    errors.push(...fileErrors);
  }

  return { gate: GATE, passed: errors.length === 0, errors, durationMs: Date.now() - start };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  const skipDirs = new Set(['node_modules', 'dist', '.auth', 'playwright-report', 'test-results']);

  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(path.join(d, entry.name));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        results.push(path.join(d, entry.name));
      }
    }
  };

  walk(dir);
  return results;
}

/**
 * Scan a source file for import statements that target guarded modules.
 * For each such import, verify every imported name exists in the manifest.
 *
 * Handles both:
 *   import { verifyText, verifyUrl } from '@actions/generic/assert.actions'
 *   import { verifyText, verifyUrl } from '@actions/generic/assert.actions';
 */
function checkImports(
  source: string,
  relPath: string,
  manifest: Map<string, Set<string>>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Match: import { a, b, c } from '@actions/generic/xxx.actions'
  // The names block may span multiple lines, so we use a lenient approach:
  // match from 'import {' up to 'from' followed by a guarded module string.
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;

  while ((m = importRe.exec(source)) !== null) {
    const namesBlock = m[1];
    const moduleSpec = m[2];

    if (!GUARDED_MODULES.has(moduleSpec)) continue;

    const knownNames = manifest.get(moduleSpec);
    if (!knownNames) continue; // module not in manifest — skip (shouldn't happen)

    // Parse individual names, stripping aliases (e.g. `verifyText as vt`)
    const importedNames = namesBlock
      .split(',')
      .map(n => n.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);

    for (const importedName of importedNames) {
      if (!knownNames.has(importedName)) {
        // Calculate approximate line number
        const upToMatch = source.slice(0, m.index);
        const lineNum   = (upToMatch.match(/\n/g) || []).length + 1;

        errors.push({
          gate:      GATE,
          severity:  'blocker',
          file:      relPath,
          line:      lineNum,
          rule:      'UNKNOWN_ACTION_IMPORT',
          found:     `'${importedName}' imported from '${moduleSpec}'`,
          expected:  `One of: ${[...knownNames].join(', ')}`,
          promptFix: (
            `In ${relPath}: The import '${importedName}' from '${moduleSpec}' does not exist. ` +
            `The valid exported names are: ${[...knownNames].join(', ')}. ` +
            `Replace '${importedName}' with the correct function name.`
          ),
        });
      }
    }
  }

  return errors;
}
