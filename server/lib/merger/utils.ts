// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Utilities
// server/lib/merger/utils.ts
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto';
import type { ActionStep, BusinessFunction, LocatorUnit, PageObjectMethod, UtilUnit } from './types.js';

// ── Hashing ───────────────────────────────────────────────────────────────────

/**
 * SHA-256 of arbitrary string content. Returns 64-char hex string.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Stable hash of a unit — used as `unit_hash` in framework_assets.
 * Ignores mutable fields like sourceTcIds so the hash reflects semantic identity.
 */
export function hashUnit(unit: LocatorUnit | PageObjectMethod | ActionStep | BusinessFunction | UtilUnit | { [k: string]: unknown }): string {
  // Normalise: drop sourceTcIds, sort any arrays, lowercase
  const stable: Record<string, unknown> = { ...unit };
  delete (stable as Record<string, unknown>).sourceTcIds;

  // Sort string arrays for determinism
  for (const key of Object.keys(stable)) {
    if (Array.isArray(stable[key]) && (stable[key] as unknown[]).every(v => typeof v === 'string')) {
      stable[key] = [...(stable[key] as string[])].sort();
    }
  }

  return hashContent(JSON.stringify(stable));
}

// ── Selector stability scoring ────────────────────────────────────────────────

/**
 * Heuristic stability score for a Playwright selector (0 = fragile, 1 = stable).
 *
 * Scoring rules (additive, clamped to [0, 1]):
 *  - data-testid / aria-label / role  → 0.9
 *  - text= / placeholder=             → 0.6
 *  - id=                              → 0.7
 *  - nth-child / nth-of-type          → penalty -0.3
 *  - long absolute XPath (>100 chars) → penalty -0.2
 *  - css class-only with no semantic  → 0.4
 */
export function selectorStabilityScore(selector: string): number {
  let score = 0.5; // default: unknown

  const s = selector.toLowerCase();

  // High-stability patterns
  if (s.includes('data-testid') || s.includes('[data-test]') || s.includes('[data-cy]')) {
    score = 0.95;
  } else if (s.startsWith('role=') || s.includes('[role=')) {
    score = 0.85;
  } else if (s.startsWith('aria-label') || s.includes('[aria-label')) {
    score = 0.85;
  } else if (s.startsWith('id=') || s.includes('[id=') || /^#[\w-]+$/.test(selector)) {
    score = 0.75;
  } else if (s.startsWith('text=') || s.startsWith('placeholder=') || s.startsWith('label=')) {
    score = 0.65;
  } else if (s.startsWith('xpath=') || s.startsWith('//')) {
    score = selector.length > 100 ? 0.3 : 0.5;
  }

  // Penalties
  if (/nth-child|nth-of-type|:eq\(/i.test(selector)) score -= 0.3;
  if (selector.length > 150) score -= 0.1;

  return Math.min(1, Math.max(0, score));
}

// ── Step overlap ──────────────────────────────────────────────────────────────

/**
 * Jaccard similarity between two sets of step descriptions/refs.
 * Returns 0–1. Used to detect near-duplicate business functions.
 */
export function calculateStepOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of Array.from(setA)) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Returns true when setA is a superset of (or equal to) setB.
 */
export function isSuperset<T>(setA: T[], setB: T[]): boolean {
  const a = new Set(setA);
  return setB.every(item => a.has(item));
}

// ── String utilities ──────────────────────────────────────────────────────────

/**
 * Convert PascalCase or camelCase to kebab-case.
 * "LoginPage" → "login-page", "clickSubmitBtn" → "click-submit-btn"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, match => `-${match.toLowerCase()}`)
    .replace(/^-/, '');
}

/**
 * Extract locator names referenced in a method/step body.
 * Looks for `this.<name>` or `lc.<name>` patterns.
 */
export function extractReferences(code: string): string[] {
  const refs = new Set<string>();
  // this.someLocator or this.someLocator()
  for (const m of code.matchAll(/this\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    refs.add(m[1]);
  }
  // lc.someLocator (locator object pattern)
  for (const m of code.matchAll(/\blc\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    refs.add(m[1]);
  }
  return Array.from(refs);
}

// ── Function body superset check ──────────────────────────────────────────────

/**
 * Returns true when `incoming` covers all meaningful lines of `existing`.
 * Ignores blank lines and comment-only lines.
 * Used in layer-utils to decide whether to REPLACE or CONFLICT.
 */
export function isFunctionBodySuperset(existing: string, incoming: string): boolean {
  const significantLines = (s: string): Set<string> => {
    const lines = new Set<string>();
    for (const line of s.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        lines.add(trimmed);
      }
    }
    return lines;
  };

  const existingLines = significantLines(existing);
  const incomingLines = significantLines(incoming);

  // incoming must contain every significant line of existing
  for (const line of Array.from(existingLines)) {
    if (!incomingLines.has(line)) return false;
  }
  return true;
}

// ── Import management ─────────────────────────────────────────────────────────

/**
 * Ensure a named import exists at the top of a TypeScript file.
 * If the importPath is already imported, just adds the name to the existing import.
 * Returns the modified content string.
 */
export function ensureImport(
  content: string,
  importedName: string,
  importPath: string,
): string {
  // Check if there is already an import from this path
  const existingImportRe = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegex(importPath)}['"]`,
  );
  const match = existingImportRe.exec(content);

  if (match) {
    const names = match[1].split(',').map(n => n.trim()).filter(Boolean);
    if (names.includes(importedName)) return content; // already imported
    const newNames = [...names, importedName].join(', ');
    return content.replace(match[0], `import { ${newNames} } from '${importPath}'`);
  }

  // Prepend new import statement after any existing import block
  const lastImportIdx = content.lastIndexOf('\nimport ');
  const insertAt = lastImportIdx === -1
    ? 0
    : content.indexOf('\n', lastImportIdx + 1) + 1;

  const importLine = `import { ${importedName} } from '${importPath}';\n`;
  return content.slice(0, insertAt) + importLine + content.slice(insertAt);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Naive import path normaliser: replace relative paths that point outside
 * the project root with the canonical alias paths (@shared, @pages, etc.).
 * In Sprint 3 this is a lightweight pass — deeper resolution happens in post-merge.
 */
export function updateImportPaths(content: string): string {
  // Replace ../../shared/ with @shared/
  content = content.replace(/from\s+['"]\.\.\/+shared\//g, `from '@shared/`);
  // Replace ../../pages/ with @pages/
  content = content.replace(/from\s+['"]\.\.\/+pages\//g, `from '@pages/`);
  // Replace ../../actions/ with @actions/
  content = content.replace(/from\s+['"]\.\.\/+actions\//g, `from '@actions/`);
  return content;
}

// ── Locator content parser ────────────────────────────────────────────────────

/**
 * Parse a stored locator JSON unit to extract selector and variable name.
 * Used in layer-specs to replace hardcoded selectors with references.
 */
export function parseLocatorContent(jsonContent: string): {
  selector: string;
  variableName: string;
} {
  try {
    const parsed = JSON.parse(jsonContent) as { selector?: string; name?: string };
    return {
      selector:     parsed.selector ?? '',
      variableName: parsed.name ?? '',
    };
  } catch {
    return { selector: '', variableName: '' };
  }
}

// ── Content similarity ────────────────────────────────────────────────────────

/**
 * Rough line-based Jaccard similarity between two text blobs.
 * Returns 0–1. Used by layer-specs to flag near-duplicate test files.
 */
export function contentSimilarity(a: string, b: string): number {
  const tokenise = (s: string): Set<string> =>
    new Set(s.split(/\s+/).filter(t => t.length > 3));
  const ta = tokenise(a);
  const tb = tokenise(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of Array.from(ta)) {
    if (tb.has(t)) intersection++;
  }
  const union = new Set([...Array.from(ta), ...Array.from(tb)]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Merge conflict reason builder ─────────────────────────────────────────────

export function buildConflictReason(
  existingHash: string,
  incomingHash: string,
  unitName: string,
): string {
  return (
    `Unit "${unitName}" has diverged. ` +
    `Existing hash: ${existingHash.slice(0, 12)}…, ` +
    `Incoming hash: ${incomingHash.slice(0, 12)}…. ` +
    `Manual review required.`
  );
}
