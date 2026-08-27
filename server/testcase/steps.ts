/**
 * Workflow-derived step depth (PART 2) and step-content quality (PART 3).
 * Step count comes from the acceptance criterion's real workflow, never a template.
 */
import type { Complexity, SystemVocabulary, TestStep } from "./types.js";

// PART 3.1 — any step or expected result containing these is rejected.
export const BANNED_PHRASES: string[] = [
  "Perform the action to satisfy",
  "Complete any remaining workflow steps",
  "Observe the system's confirmation or progress feedback",
  "Verify the outcome:",
  "System provides clear positive feedback",
  "System accepts the input and begins processing",
  "Workflow completes without errors or warnings",
  "Module loads with all fields and controls visible",
  "is available in the system",
  "System state, stored data, and UI all confirm",
];

export function containsBanned(text: string): string | null {
  const lower = (text || "").toLowerCase();
  for (const p of BANNED_PHRASES) if (lower.includes(p.toLowerCase())) return p;
  return null;
}

// Concrete action verbs a tester can actually perform (PART 3.2).
const CONCRETE_VERBS = [
  "navigate", "open", "click", "select", "enter", "type", "set", "clear", "toggle",
  "submit", "save", "upload", "download", "search", "filter", "sort", "scroll",
  "log in", "log out", "refresh", "wait", "call", "send", "run", "trigger", "query",
  "insert", "update", "delete", "assert", "verify", "confirm", "check", "inspect",
  "review", "attempt", "press", "choose", "drag", "drop", "expand", "collapse",
  // Physical device, transaction, and data-pipeline actions used by the kiosk,
  // sync, event-capture, and reporting scenarios.
  "power on", "power off", "start", "complete", "cancel", "abandon", "add", "remove",
  "locate", "close", "reload", "repeat", "measure", "compare", "note", "read",
  "tap", "scan", "tag", "un-tag", "untag", "sync", "propagate", "export", "schedule",
  "switch", "disconnect", "reconnect", "restore", "provision", "configure",
  "dismiss", "re-run", "re-open",
];

export function hasConcreteVerb(action: string): boolean {
  const lower = (action || "").toLowerCase();
  return CONCRETE_VERBS.some(v => lower.includes(v));
}

/** A step must name a specific object: a vocabulary term, a quoted string, or an
 *  endpoint/table-shaped token. */
export function namesObject(action: string, vocab: SystemVocabulary): boolean {
  if (/"[^"]+"|'[^']+'/.test(action)) return true;                 // quoted object
  if (/\b\/[a-z0-9/_:-]+\b/i.test(action)) return true;             // /api/endpoint
  if (/\b[A-Z][a-zA-Z0-9]*(?:_[A-Z0-9]+)+\b/.test(action)) return true; // TABLE_NAME
  const lower = action.toLowerCase();
  const all = [
    ...vocab.screens, ...vocab.fields, ...vocab.buttons,
    ...vocab.tables, ...vocab.endpoints, ...vocab.entities,
  ].map(s => s.toLowerCase()).filter(Boolean);
  return all.some(term => term.length > 2 && lower.includes(term));
}

/** Expected result must be judgeable pass/fail without the AC text (PART 3.3).
 *  Rejects vague affirmations; requires a concrete observable signal. */
export function isObservable(expected: string): boolean {
  const t = (expected || "").trim();
  if (t.length < 8) return false;
  if (containsBanned(t)) return false;
  const vaguePatterns = [
    /^(it )?works( correctly)?\.?$/i,
    /^(the )?system responds\.?$/i,
    /^success(ful)?\.?$/i,
    /^(the )?outcome is correct\.?$/i,
    /clear positive feedback/i,
  ];
  if (vaguePatterns.some(rx => rx.test(t))) return false;
  // Must reference a concrete observable: a value/record/message/field/status/count/
  // error/page/row/API status, quoted text, number, or named object.
  const observableSignals = new RegExp([
    `"[^"]+"`, `\\b\\d+\\b`,
    // UI and data artefacts a tester can point at
    "error", "message", "field", "status", "record", "row", "page", "screen",
    "table", "column", "value", "banner", "toast", "badge", "redirect",
    "label", "modal", "popup", "tile", "icon", "indicator", "dropdown",
    "cart", "total", "count", "receipt", "report", "export", "audit", "entry",
    // observable state words
    `http\\s?\\d{3}`, "saved", "displayed", "rejected", "refused", "blocked",
    "accepted", "persisted", "disabled", "enabled", "visible", "hidden",
    "highlighted", "populated", "unchanged", "cleared", "empty", "absent",
    "present", "listed", "lists", "logged", "synced", "downloaded", "null",
  ].join("|"), "i");
  return observableSignals.test(t);
}

// ── Complexity classification (PART 2.2) ─────────────────────────────────────

const SYSTEM_NOUN = /\b(kiosk|snowflake|database|db|api|service|queue|topic|warehouse|ledger|gateway|middleware|erp|crm|mainframe|cache|s3|blob|webhook|endpoint|downstream|upstream|v5|v4|salesforce|sap)\b/gi;

export function countNamedSystems(acText: string): number {
  const m = acText.match(SYSTEM_NOUN) || [];
  return new Set(m.map(s => s.toLowerCase())).size;
}

/** Count discrete state transitions / system boundaries the AC implies. */
export function countTransitions(acText: string): number {
  const t = acText.toLowerCase();
  let n = 1; // the primary action
  // connectors that imply an additional step / boundary crossing
  n += (t.match(/\b(then|after|once|and then|,\s*and|;|→|->|propagat|sync|persist|refresh|downstream|reflect|notif|trigger|generate|validate|store|write|read back)\b/g) || []).length;
  n += countNamedSystems(acText); // each named system is a boundary
  return n;
}

export function classifyComplexity(acText: string): Complexity {
  const t = acText.toLowerCase();
  const systems = countNamedSystems(acText);
  const syncCycle = /\b(sync|synchron|propagat|end[- ]to[- ]end|downstream|round[- ]trip)\b/.test(t);
  const writeThenRead = /\b(store|save|persist|write)\b/.test(t) && /\b(read|reflect|downstream|verify|appears|shows)\b/.test(t);
  if (systems >= 2 || syncCycle || writeThenRead || /end[- ]to[- ]end/.test(t)) return "COMPLEX";
  const standardSignals = /\b(create|update|delete|submit|save|crud|record|form|screen|transaction|workflow)\b/.test(t);
  if (standardSignals) return "STANDARD";
  return "SIMPLE";
}

/** Target step count for a complexity band, scaled by real transitions so counts
 *  VARY across a run (PART 2.3 requires nonzero variance). */
export function stepBudget(complexity: Complexity, acText: string): number {
  const transitions = countTransitions(acText);
  if (complexity === "SIMPLE")   return clamp(3 + transitions, 4, 6);
  if (complexity === "STANDARD") return clamp(5 + transitions, 6, 12);
  return clamp(10 + transitions * 2, 12, 25); // COMPLEX
}

/** Negative/edge cases run shorter than the positive path, so step counts vary
 *  within a story (never all-identical -> G05). */
export function negativeBudget(positiveBudget: number): number { return clamp(positiveBudget - 2, 3, 6); }
export function edgeBudget(positiveBudget: number): number { return clamp(positiveBudget - 1, 3, 8); }

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Standard deviation of step counts (PART 2.3 / G05). */
export function stepCountStdDev(counts: number[]): number {
  if (counts.length === 0) return 0;
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const varce = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
  return Math.sqrt(varce);
}

export function renumber(steps: TestStep[]): TestStep[] {
  return steps.map((s, i) => ({ ...s, step_number: i + 1 }));
}
