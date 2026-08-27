/**
 * Intent normalisation (PART 1.2). Two candidate test cases that describe the
 * same behaviour must produce the same IntentKey, regardless of phrasing.
 */
import type { IntentKey } from "./types.js";

// Verb synonym folding: many phrasings collapse to one normalised action.
const VERB_SYNONYMS: Record<string, string> = {
  add: "create", insert: "create", register: "create", enter: "create", new: "create",
  modify: "update", edit: "update", change: "update", amend: "update", revise: "update",
  remove: "delete", "delete": "delete",
  save: "save", store: "save", persist: "save", retain: "save",
  sync: "sync", synchronise: "sync", synchronize: "sync", propagate: "sync", push: "sync",
  validate: "validate", verify: "validate", check: "validate", ensure: "validate", confirm: "validate",
  display: "display", show: "display", render: "display", present: "display",
  view: "read", read: "read", retrieve: "read", fetch: "read", load: "read", get: "read",
  block: "block", prevent: "block", restrict: "block", reject: "block", deny: "block", disallow: "block",
  allow: "allow", permit: "allow", enable: "allow",
  flag: "flag", mark: "flag", tag: "flag",
  assign: "assign", link: "associate", associate: "associate", map: "associate",
  generate: "generate", produce: "generate", calculate: "compute", compute: "compute",
  send: "send", submit: "submit", apply: "apply",
};

const FILLER = new Set([
  "the", "a", "an", "to", "of", "for", "with", "and", "or", "is", "are", "be", "should",
  "shall", "must", "will", "that", "this", "it", "in", "on", "at", "by", "as", "correctly",
  "successfully", "properly", "system", "user", "able", "can", "when", "then", "given",
]);

export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip filler words and collapse to a compact normalised phrase. */
export function normalizePhrase(s: string): string {
  return normalizeText(s)
    .split(" ")
    .filter(w => w.length > 1 && !FILLER.has(w))
    .join(" ")
    .trim();
}

export function normalizeActor(actor: string): string {
  const a = normalizePhrase(actor).replace(/\b(logged in|authenticated)\b/g, "").trim();
  return a || "user";
}

/** First recognised verb in the phrase, folded to its canonical form. */
export function normalizeVerb(phrase: string): string {
  for (const w of normalizeText(phrase).split(" ")) {
    const base = w.replace(/(s|es|ed|ing)$/,"");
    if (VERB_SYNONYMS[w]) return VERB_SYNONYMS[w];
    if (VERB_SYNONYMS[base]) return VERB_SYNONYMS[base];
  }
  // fall back to the first non-filler token
  const first = normalizePhrase(phrase).split(" ")[0];
  return first || "perform";
}

export function normalizeObject(object: string): string {
  return normalizePhrase(object) || "record";
}

export function normalizeOutcome(outcome: string): string {
  return normalizePhrase(outcome) || "expected result";
}

/** Deterministic FNV-1a hash (hex) — stable across runs, no Date/random. */
export function stableHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function preconditionHash(preconditions: string[]): string {
  const norm = preconditions.map(normalizePhrase).filter(Boolean).sort();
  return stableHash(norm.join("|"));
}

export function computeIntentKey(input: {
  actor: string;
  object: string;
  action: string;
  expectedOutcome: string;
  preconditions: string[];
}): IntentKey {
  return {
    actor: normalizeActor(input.actor),
    object: normalizeObject(input.object),
    action: normalizeVerb(input.action),
    expectedOutcome: normalizeOutcome(input.expectedOutcome),
    preconditionHash: preconditionHash(input.preconditions),
  };
}

/** Full identity string — two candidates with the same string are intent duplicates. */
export function intentKeyString(k: IntentKey): string {
  return `${k.actor}::${k.object}::${k.action}::${k.expectedOutcome}::${k.preconditionHash}`;
}

/** Identity ignoring data value / expectedOutcome nuance — used to detect data variants
 *  (same actor+object+action+preconditions, differing only in data). */
export function intentDataKey(k: IntentKey): string {
  return `${k.actor}::${k.object}::${k.action}::${k.preconditionHash}`;
}
