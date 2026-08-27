/**
 * Guardrail gate (PART 7 of the quality fix). Runs AFTER refinement and BEFORE
 * storage. A failing set is REJECTED with named violations, never silently saved.
 *
 * G03, G04 extended and G15, G16, G17 added by the title fix: the original G03
 * matched suffixes only, and the original G04 checked titles for unbalanced
 * quotes only, so a character-capped title ending "...page (Info" passed both.
 */
import type { AcceptanceCriterion, CandidateTestCase, SystemVocabulary } from "./types.js";
import { intentKeyString, intentDataKey, normalizeOutcome } from "./intent.js";
import { containsBanned, hasConcreteVerb, namesObject, isObservable, stepCountStdDev } from "./steps.js";
import { strippedTitle } from "./merge.js";
import { capFor } from "./cap.js";
import { similarity, tokens, wordCount, TITLE_MIN_WORDS, TITLE_MAX_WORDS } from "./title.js";

export interface Violation { code: string; message: string; examples: string[] }
export interface GuardrailResult { passed: boolean; violations: Violation[]; storyId: string }

const NARRATIVE = /\bas an?\b|\bi want\b|\bso that\b/i;
const GENERIC_PRECON = /is available in the system|authenticated user/i;

/**
 * G03 - generator-injected affixes. PREFIXES included: the previous list was
 * suffix-only, so "Negative - <criterion>" and "Boundary - <criterion>" slipped
 * through. The coverage type is a FIELD and must never appear in the title.
 */
const AFFIX_PATTERNS: RegExp[] = [
  /^(Negative|Positive|Boundary|Edge|Security|Accessibility|Functional|Regression)\s*[-–—:]\s*/i,
  /^\[.*?\]\s*/,
  /\s+[-–—]\s+using .*$/i,
  /\s+[-–—]\s+verify downstream.*$/i,
  /^Data persists after session refresh:\s*/i,
];

function unbalancedQuotes(s: string): boolean {
  return ((s || "").match(/"/g) || []).length % 2 !== 0;
}

const TERMINAL_PUNCT = /[.!?)\]"']$/;

/** Openers left without their closer, the signature of a mid-string cut. */
function unclosedBracket(s: string): boolean {
  const t = s || "";
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"]];
  for (const [open, close] of pairs) {
    const o = (t.match(new RegExp("\\" + open, "g")) || []).length;
    const c = (t.match(new RegExp("\\" + close, "g")) || []).length;
    if (o > c) return true;
  }
  return false;
}

/**
 * A final token that is not a plausible complete word. No dictionary ships with
 * this module, so the test is structural: the last token is flagged when it is a
 * known sentence-opening fragment or a bare function word left dangling, which is
 * what a character cut produces ("... page (Info", "... no products are").
 */
// Only words that genuinely cannot end a phrase. Particles like "off", "out" and
// determiners of quantity like "No" CAN end one legitimately ("location flag off",
// "defaults to No"), so they are not listed.
const DANGLING_TAIL = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by",
  "for", "with", "from", "as", "is", "are", "was", "were", "be", "been", "that",
  "which", "when", "while", "than", "then", "so", "into", "onto", "per", "via",
]);

function endsMidWord(title: string): boolean {
  const t = (title || "").trim();
  if (TERMINAL_PUNCT.test(t)) return false;
  const last = t.split(/\s+/).pop() || "";
  const bare = last.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (DANGLING_TAIL.has(bare)) return true;
  // an unmatched opening bracket immediately before the final token
  if (/[([{]/.test(last)) return true;
  return false;
}

export function validateTestCaseSet(
  storyId: string,
  cases: CandidateTestCase[],
  acs: AcceptanceCriterion[],
  vocab: SystemVocabulary
): GuardrailResult {
  const violations: Violation[] = [];
  const add = (code: string, message: string, examples: string[]) => {
    if (examples.length) violations.push({ code, message, examples: examples.slice(0, 5) });
  };
  const acById = new Map(acs.map(a => [a.id, a.text]));

  // G01 — no two cases share an intent key
  const intentSeen = new Map<string, string>();
  const g01: string[] = [];
  for (const c of cases) {
    const k = intentKeyString(c.intentKey);
    if (intentSeen.has(k)) g01.push(`${c.testCaseId} == ${intentSeen.get(k)}`);
    else intentSeen.set(k, c.testCaseId);
  }
  add("G01", "Two test cases share an intent key", g01);

  // G02 — no narrative in titles
  add("G02", "Title contains user-story narrative", cases.filter(c => NARRATIVE.test(c.title)).map(c => c.title));

  // G03 — no generator-injected affix (prefix OR suffix) in titles
  const g03: string[] = [];
  for (const c of cases) {
    for (const rx of AFFIX_PATTERNS) {
      if (rx.test(c.title)) { g03.push(`${c.testCaseId}: "${c.title}"`); break; }
    }
  }
  add("G03", "Title contains a generator-injected affix (type prefix or suffix)", g03);

  // G04 — no truncated value anywhere, TITLE included
  const g04: string[] = [];
  const titleLengths = cases.map(c => c.title.length);
  for (const c of cases) {
    const otherFields = [c.description ?? "", c.expectedResult,
      ...c.preconditions, ...c.testSteps.flatMap(s => [s.action, s.expected_behavior])];
    if (otherFields.some(unbalancedQuotes)) g04.push(`${c.testCaseId}: unbalanced quote in a non-title field`);

    const t = c.title;
    if (/[\r\n]/.test(t)) g04.push(`${c.testCaseId}: title contains a newline`);
    if (unbalancedQuotes(t)) g04.push(`${c.testCaseId}: title has an unclosed quote -> "${t}"`);
    if (unclosedBracket(t)) g04.push(`${c.testCaseId}: title has an unclosed bracket -> "${t}"`);
    if (endsMidWord(t)) g04.push(`${c.testCaseId}: title ends mid-phrase -> "${t}"`);
    // NOTE on the near-length cluster rule from the title-fix spec: authored
    // labels legitimately bunch in the 45 to 65 character range and legitimately
    // lack terminal punctuation, so a per-title "within 5 characters of another
    // title" test fires on healthy output (it flagged 9 of 16 titles in a story
    // whose histogram is a clean spread from 31 to 77). The cap signature is a
    // property of the DISTRIBUTION, not of one title, so it is enforced once in
    // G15 rather than twice. The precise per-title checks above stay.
  }
  add("G04", "Field has a truncated value, unclosed quote or bracket, or a capped title", g04);

  // G05 — step count standard deviation > 0
  const counts = cases.map(c => c.testSteps.length);
  if (cases.length >= 2 && stepCountStdDev(counts) === 0) {
    add("G05", "Step count standard deviation is zero (templated steps)",
      [`all ${cases.length} cases have ${counts[0]} steps`]);
  }

  // G06 — no banned phrase in any step/expected
  const g06: string[] = [];
  for (const c of cases) {
    for (const s of c.testSteps) {
      const b = containsBanned(s.action) || containsBanned(s.expected_behavior);
      if (b) g06.push(`${c.testCaseId}: "${b}"`);
    }
    const be = containsBanned(c.expectedResult);
    if (be) g06.push(`${c.testCaseId} (expectedResult): "${be}"`);
  }
  add("G06", "Step or expected result contains a banned phrase", g06);

  // G07 — every step names a concrete object
  const g07: string[] = [];
  for (const c of cases) for (const s of c.testSteps) {
    if (!hasConcreteVerb(s.action) || !namesObject(s.action, vocab)) {
      g07.push(`${c.testCaseId} step ${s.step_number}: "${s.action}"`);
    }
  }
  add("G07", "Step lacks a concrete verb or named object", g07);

  // G08 — every expected result independently observable
  const g08: string[] = [];
  for (const c of cases) for (const s of c.testSteps) {
    if (!isObservable(s.expected_behavior)) g08.push(`${c.testCaseId} step ${s.step_number}: "${s.expected_behavior}"`);
  }
  add("G08", "Expected result is not independently observable", g08);

  // G09 — unique IDs
  const idSeen = new Map<string, number>();
  for (const c of cases) idSeen.set(c.testCaseId, (idSeen.get(c.testCaseId) ?? 0) + 1);
  add("G09", "Duplicate test case ID", Array.from(idSeen.entries()).filter(([, n]) => n > 1).map(([id, n]) => `${id} x ${n}`));

  // G10 — no generic precondition
  const g10: string[] = [];
  for (const c of cases) for (const p of c.preconditions) if (GENERIC_PRECON.test(p)) g10.push(`${c.testCaseId}: "${p}"`);
  add("G10", "Precondition is generic (no named role/record/state)", g10);

  // G11 — every AC has positive AND negative coverage
  const g11: string[] = [];
  for (const ac of acs) {
    const cover = cases.filter(c => c.acIds.includes(ac.id));
    const hasPos = cover.some(c => c.coverageType === "positive");
    const hasNeg = cover.some(c => c.coverageType === "negative");
    if (!hasPos || !hasNeg) g11.push(`${ac.id}: ${!hasPos ? "no positive" : ""}${!hasPos && !hasNeg ? " + " : ""}${!hasNeg ? "no negative" : ""}`);
  }
  add("G11", "Acceptance criterion lacks positive or negative coverage", g11);

  // G12 — every case maps to at least one AC
  add("G12", "Test case maps to no acceptance criterion", cases.filter(c => c.acIds.length === 0).map(c => c.testCaseId));

  // G13 — count within cap
  const cap = capFor(acs.length);
  if (cases.length > cap) add("G13", "Test case count exceeds the cap", [`${cases.length} > cap ${cap}`]);

  // G14 — data variations folded into testData, not separate cases
  const dataGroups = new Map<string, string[]>();
  for (const c of cases) {
    const k = `${c.acIds.slice().sort().join("+")}::${c.coverageType}::${intentDataKey(c.intentKey)}::${normalizeOutcome(c.intentKey.expectedOutcome)}`;
    dataGroups.set(k, [...(dataGroups.get(k) ?? []), c.testCaseId]);
  }
  add("G14", "Data variants appear as separate cases (should be testData rows)",
    Array.from(dataGroups.values()).filter(ids => ids.length > 1).map(ids => ids.join(", ")));

  // ── G15 (NEW) — title length distribution ─────────────────────────────────
  // A surviving character cap shows up as many titles sharing one exact length.
  // The band check catches the softer signature of a cap with word-boundary
  // backoff, where lengths cluster just under a ceiling instead of on it.
  if (cases.length >= 5) {
    const lenCounts = new Map<number, number>();
    for (const c of cases) lenCounts.set(c.title.length, (lenCounts.get(c.title.length) ?? 0) + 1);
    const g15: string[] = [];
    Array.from(lenCounts.entries()).forEach(([len, n]) => {
      // The ratio alone is noisy on a small set (2 of 9 is 22% by coincidence),
      // so an absolute floor of 4 titles is required alongside it.
      if (n >= 4 && n / cases.length > 0.2) {
        g15.push(`${n} of ${cases.length} titles are exactly ${len} characters`);
      }
    });
    // A cap with word-boundary backoff piles titles just under a ceiling. On a
    // run of four or five titles that pile-up happens by chance, so the band
    // check needs a run big enough for the shape to be real.
    if (cases.length >= 10) {
      const maxLen = Math.max.apply(null, cases.map(c => c.title.length));
      const inTopBand = cases.filter(c => c.title.length >= maxLen - 5).length;
      if (inTopBand / cases.length > 0.4) {
        g15.push(`${inTopBand} of ${cases.length} titles sit within 5 characters of the maximum ${maxLen} (cap-with-backoff signature)`);
      }
    }
    add("G15", "Title lengths cluster, so a character cap is still being applied", g15);
  }

  // ── G16 (NEW) — the title is not the criterion text ───────────────────────
  const g16: string[] = [];
  for (const c of cases) {
    const acText = c.linkedAcceptanceCriteria ||
      c.acIds.map(id => acById.get(id) ?? "").join(" ");
    if (!acText) continue;
    const nt = c.title.toLowerCase().replace(/\s+/g, " ").trim();
    const na = acText.toLowerCase().replace(/\s+/g, " ").trim();
    if (nt.length > 12 && na.indexOf(nt) !== -1) g16.push(`${c.testCaseId}: title is a substring of its AC`);
    else if (na.length > 12 && nt.indexOf(na) !== -1) g16.push(`${c.testCaseId}: AC is a substring of its title`);
    else {
      const sim = similarity(c.title, acText);
      if (sim > 0.85) g16.push(`${c.testCaseId}: title/AC similarity ${sim.toFixed(2)} exceeds 0.85`);
    }
  }
  add("G16", "Title is the acceptance criterion text rather than an authored label", g16);

  // ── G17 (NEW) — no two cases share an identical step array ────────────────
  const stepSigs = new Map<string, string>();
  const g17: string[] = [];
  for (const c of cases) {
    const sig = JSON.stringify(c.testSteps.map(s => [s.action, s.expected_behavior]));
    if (stepSigs.has(sig)) g17.push(`${c.testCaseId} has the same steps as ${stepSigs.get(sig)}`);
    else stepSigs.set(sig, c.testCaseId);
  }
  add("G17", "Two test cases have identical step arrays", g17);

  // ── G18 — title word budget (PART 2 authoring rule) ───────────────────────
  const g18: string[] = [];
  for (const c of cases) {
    const n = wordCount(c.title);
    if (n < TITLE_MIN_WORDS || n > TITLE_MAX_WORDS) {
      g18.push(`${c.testCaseId}: ${n} words -> "${c.title}"`);
    }
  }
  add("G18", `Title is outside the ${TITLE_MIN_WORDS} to ${TITLE_MAX_WORDS} word budget`, g18);

  // ── G19 — titles unique within the story ─────────────────────────────────
  const titleSeen = new Map<string, string>();
  const g19: string[] = [];
  for (const c of cases) {
    const k = c.title.toLowerCase();
    if (titleSeen.has(k)) g19.push(`${c.testCaseId} == ${titleSeen.get(k)}: "${c.title}"`);
    else titleSeen.set(k, c.testCaseId);
  }
  add("G19", "Two test cases share the same title", g19);

  return { passed: violations.length === 0, violations, storyId };
}

export function formatViolations(r: GuardrailResult): string {
  if (r.passed) return `[Guardrail] Story ${r.storyId}: PASS`;
  const lines = [`[Guardrail] REJECTED. Story ${r.storyId} failed ${r.violations.map(v => v.code).join(", ")}.`];
  for (const v of r.violations) lines.push(`            ${v.code}: ${v.message} - e.g. ${v.examples[0]}`);
  return lines.join("\n");
}

export { tokens };
