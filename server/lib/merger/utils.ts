// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Utilities
// server/lib/merger/utils.ts
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'crypto';
import type { ActionStep, BusinessFunction, LocatorUnit, PageObjectMethod } from './types.js';

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
export function hashUnit(unit: LocatorUnit | PageObjectMethod | ActionStep | BusinessFunction): string {
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
