// ─── Deterministic pre-pass (recall-safe by construction) ─────────────────────
//
// Some standards are mechanically checkable with no LLM judgment. A deterministic
// checker returns a verdict ONLY when it is certain; otherwise it returns null and
// the LLM runs. That asymmetry is the safety guarantee: a deterministic check can
// never cause a missed violation by *guessing* — when unsure, it defers.
//
// Each checker declares a trust level:
//   • 'exact'     — provably correct (e.g. parsing a single MSBuild property).
//                   Eligible to run in 'on' mode (skip the LLM) once validated.
//   • 'heuristic' — high-precision but with edge cases (e.g. grep that could match
//                   inside a comment). Kept in shadow until proven on your corpus.
//
// Rollout modes (env CODELENS_DETERMINISTIC_MODE):
//   • 'off'    — ignore deterministic checks entirely (pure LLM).
//   • 'shadow' — DEFAULT. Run the deterministic check AND the LLM; log any
//                disagreement; use the LLM result. Zero quality risk; this is the
//                validation phase. No speedup yet — it's how we earn trust.
//   • 'on'     — Trust deterministic verdicts and skip the LLM for those cells
//                (the speedup). Heuristic checkers still defer to shadow unless
//                CODELENS_DETERMINISTIC_TRUST_HEURISTICS=1.

import type { CodeStandard } from './codelens-agent';

export type DeterministicMode = 'off' | 'shadow' | 'on';

export const DETERMINISTIC_MODE: DeterministicMode =
  (process.env.CODELENS_DETERMINISTIC_MODE as DeterministicMode) || 'shadow';

const TRUST_HEURISTICS = process.env.CODELENS_DETERMINISTIC_TRUST_HEURISTICS === '1';

export interface DeterministicVerdict {
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE';
  checked: string;
  trust: 'exact' | 'heuristic';
  violations: Array<{ line: number; found_code: string; explanation: string }>;
}

/** 1-based line number of the first match, or 0 if not found. */
function lineOf(content: string, idx: number): number {
  if (idx < 0) return 0;
  return content.slice(0, idx).split('\n').length;
}

/** Strip // line comments and /* *​/ block comments so grep checks don't match commented-out code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '));
}

type Checker = (filePath: string, content: string, fileType: string, standard: CodeStandard) => DeterministicVerdict | null;

const CHECKERS: Record<string, Checker> = {
  // S07 — All projects must target net10.0. EXACT for the common single-target case.
  S07: (filePath, content) => {
    if (!filePath.toLowerCase().endsWith('.csproj')) return null;
    // Multi-target or computed frameworks → defer to the LLM.
    if (/<TargetFrameworks>/i.test(content)) return null;
    const m = content.match(/<TargetFramework>\s*([^<\s]+)\s*<\/TargetFramework>/i);
    if (!m) return null; // no plain target tag → not sure, defer
    const tf = m[1].trim().toLowerCase();
    if (tf === 'net10.0') {
      return { status: 'PASS', trust: 'exact', checked: 'TargetFramework is net10.0', violations: [] };
    }
    return {
      status: 'VIOLATION', trust: 'exact',
      checked: `TargetFramework is "${m[1]}", expected net10.0`,
      violations: [{ line: lineOf(content, m.index ?? -1), found_code: m[0].trim(), explanation: `Targets ${m[1]} instead of net10.0` }],
    };
  },

  // S10 — PostgreSQL only. HEURISTIC: forbidden provider calls are a strong signal,
  // but grep could match inside a string/comment, so we strip comments and keep it
  // in shadow until validated. Absence proves no other-DB usage IN THIS FILE.
  S10: (_filePath, content) => {
    const src = stripComments(content);
    const forbidden = ['UseSqlServer', 'UseSqlite', 'UseMySql', 'UseMySQL', 'UseOracle', 'UseInMemoryDatabase'];
    const found: DeterministicVerdict['violations'] = [];
    for (const f of forbidden) {
      const re = new RegExp(`\\.${f}\\s*\\(`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        found.push({ line: lineOf(content, m.index), found_code: `.${f}(...)`, explanation: `Uses ${f} — only PostgreSQL (UseNpgsql) is allowed` });
      }
    }
    if (found.length > 0) return { status: 'VIOLATION', trust: 'heuristic', checked: 'Found a non-PostgreSQL EF provider call', violations: found };
    // No forbidden provider. Distinguish "EF present and clean" (PASS) from
    // "no DB code at all" (NOT_APPLICABLE) so the verdict matches the LLM's.
    const hasEf = /\bDbContext\b|EntityFrameworkCore|\bUseNpgsql\s*\(|\bAddDbContext\s*\(/.test(src);
    if (hasEf) return { status: 'PASS', trust: 'heuristic', checked: 'EF present with no non-PostgreSQL provider', violations: [] };
    return { status: 'NOT_APPLICABLE', trust: 'heuristic', checked: 'No EF/database code in this file', violations: [] };
  },
};

/**
 * Run the deterministic checker for a standard (if any).
 * Returns a verdict only when certain; null means "defer to the LLM".
 * Respects trust level vs mode: heuristic verdicts are suppressed in 'on' mode
 * unless explicitly trusted.
 */
export function deterministicVerdict(
  filePath: string,
  content: string,
  fileType: string,
  standard: CodeStandard,
): DeterministicVerdict | null {
  const checker = CHECKERS[standard.id];
  if (!checker) return null;
  let verdict: DeterministicVerdict | null = null;
  try {
    verdict = checker(filePath, content, fileType, standard);
  } catch {
    return null; // a broken checker must never block — defer to the LLM
  }
  if (!verdict) return null;
  // In 'on' mode, only EXACT checkers are allowed to replace the LLM unless the
  // operator has explicitly opted into trusting heuristics.
  if (DETERMINISTIC_MODE === 'on' && verdict.trust === 'heuristic' && !TRUST_HEURISTICS) {
    return null;
  }
  return verdict;
}

/** Standards that have any deterministic checker — for reporting/telemetry. */
export const DETERMINISTIC_STANDARD_IDS = Object.keys(CHECKERS);
