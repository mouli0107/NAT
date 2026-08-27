/**
 * Test case TITLE authoring (PART 1 to PART 4 of the title fix).
 *
 * A title is a short authored label naming what is verified. It is NEVER the
 * acceptance criterion pasted in, NEVER truncated at a character cap, and NEVER
 * carries the coverage type as a prefix. The coverage type is a field.
 *
 * The full criterion text lives in CandidateTestCase.linkedAcceptanceCriteria.
 */
import type { Archetype, ScenarioCtx } from "./scenarios.js";
import type { CoverageType } from "./types.js";

export const TITLE_MIN_WORDS = 5;
export const TITLE_MAX_WORDS = 12;

// ── PART 4: normalisation applied to every title before storage ─────────────

/**
 * Strip newlines and carriage returns, collapse whitespace runs, remove quotes
 * wrapping the WHOLE string, and trim. Throws on an empty result: an empty title
 * is a generator bug, not something to store.
 */
export function normalizeTitle(raw: string): string {
  let t = (raw ?? "").replace(/[\r\n\u2028\u2029\u0085]+/g, " ").replace(/\s+/g, " ").trim();
  // Strip quotes only when a single pair encloses the ENTIRE string.
  for (let guard = 0; guard < 4; guard++) {
    const m = t.match(/^"([^"]*)"$/) || t.match(/^'([^']*)'$/);
    if (!m) break;
    t = m[1].trim();
  }
  if (!t) throw new Error("[Title] Normalisation produced an empty title");
  return t;
}

const wordsOf = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
export const wordCount = (s: string): number => wordsOf(s).length;

// ── Condense the criterion into its verifiable core ────────────────────────

/**
 * Reduce a criterion to its first main clause: parenthetical asides, inline
 * examples, and trailing rationale carry no verification value in a label.
 * Cuts only at clause boundaries, never mid-word and never mid-bracket.
 */
export function condenseAc(acText: string): string {
  let t = (acText ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/\s*\([^)]*\)/g, "");
  t = t.replace(/\s*\[[^\]]*\]/g, "");
  t = t.replace(/,?\s*(?:e\.g\.,?|for example,?|such as)\s*"[^"]*"/gi, "");
  t = t.replace(/,?\s*(?:e\.g\.,?|for example,?|such as)[^.;]*/gi, "");
  // An interposed subordinate clause ("report, when run for X, displays Y") is
  // removed WHOLE so the subject keeps its predicate. Cutting at the first comma
  // instead would leave "report" with the verb thrown away.
  t = t.replace(/,\s*(?:when|where|which|while|after|before|once|if|unless|whenever|including)\b[^,]{0,80},\s*/gi, " ");
  const firstClause = t.split(/(?<=[.;])\s+/)[0] ?? t;
  t = firstClause.replace(/[.;:,\s]+$/, "");
  t = t.replace(/,\s*(?:so that|because|due to|consistent with|similar to|since|which|this is|not a defect)\b.*$/i, "");
  // A trailing locative clause ("..., below the X field") states placement, not a
  // verifiable outcome, and only pushes the label past its word budget.
  t = t.replace(/,\s*(?:below|above|under|beside|next to|within|inside)\s+the\b.*$/i, "");
  return t.replace(/\s+/g, " ").trim();
}

// ── Requirement voice to verification voice ────────────────────────────────

const LEMMA: Record<string, string> = {
  saved: "saves", save: "saves", run: "runs", runnable: "runs",
  added: "appears", displayed: "displays", shown: "shows", visible: "visible",
  hidden: "hidden", stored: "stores", written: "writes", uploaded: "uploads",
  cleared: "clears", reset: "resets", enforced: "enforces", applied: "applies",
  populated: "populates", propagated: "propagates", synced: "syncs",
  included: "includes", returned: "returns", offered: "offers",
  timestamped: "timestamped", auditable: "auditable", queryable: "queryable",
  disabled: "disabled", enabled: "enabled", rejected: "rejected",
  blocked: "blocked", removed: "removes", retained: "retains", copied: "copies",
  inserted: "inserts", filtered: "filters", exported: "exports",
  scheduled: "schedules", selected: "selects", tagged: "tagged",
  untagged: "untagged", available: "available", aggregated: "aggregates",
};

const FILLER_ADVERBS = /\b(?:successfully|clearly|correctly|completely|immediately|entirely|actually|deliberately|explicitly|exactly|simply|properly|fully)\b/gi;

/** "must be hidden" -> "hidden", "can be saved" -> "saves", and so on. */
export function revoice(text: string): string {
  let t = " " + text + " ";

  t = t.replace(/^\s*Add\s+(?:a|an|the)\s+/i, " ");
  t = t.replace(/^\s*(?:Create|Provide|Include|Implement|Introduce|Support)\s+(?:a|an|the)\s+/i, " ");
  t = t.replace(/^\s*A\s+new\s+report,\s*/i, " ");
  // "If <condition>, <consequence>" reads as a requirement; a label states the
  // consequence first and the condition second
  t = t.replace(/^\s*If\s+(.+?),\s*(.+)$/i, " $2 when $1");
  t = t.replace(/^\s*If\s+/i, " ");
  t = t.replace(/^\s*(?:On|Upon|When|After|Once)\s+/i, " ");

  t = t.replace(/\bmust\s+NOT\s+([a-z]+)/g, "does not $1");
  t = t.replace(/\b(?:must|shall|should|will|may|can)\s+not\s+([a-z]+)/gi, "does not $1");
  t = t.replace(/\b(?:must|shall|should|will|may|can)\s+be\s+([a-z]+)/gi,
    (_m, w: string) => LEMMA[w.toLowerCase()] ?? w);
  t = t.replace(/\bcan\s+be\s+([a-z]+)/gi, (_m, w: string) => LEMMA[w.toLowerCase()] ?? w);
  t = t.replace(/\bis\s+runnable\s+for\b/gi, "runs for");
  t = t.replace(/\bbecomes?\s+available\s+only\s+when\b/gi, "appears only when");
  t = t.replace(/\bis\s+added\s+under\b/gi, "appears under");
  t = t.replace(/\bdoes\s+not\s+have\s+the\s+required\s+permission\b/gi, "without permission");
  t = t.replace(/\bwhen\s+(?:the\s+)?(\w+)\s+without\s+permission\b/gi, "for $1 without permission");
  t = t.replace(/\bto\s+the\s+(.+?)\s+page\b/i, " renders on $1");
  t = t.replace(/\bon\s+the\s+(.+?)\s+page\b/i, " on $1");
  t = t.replace(/\bare\s+completely\s+unaffected\s+by\s+this\s+feature\b/gi, "stay unaffected");
  t = t.replace(/\bis\s+set\s+to\s+Yes\b/gi, "is Yes");
  t = t.replace(/\bno\s+products\s+are\s+tagged\s+as\s+restricted\b/gi, "no products tagged");

  // Verification-voice synonyms. A requirement says what the system must be; a
  // test label says what the tester observes. Rewording also keeps the label from
  // being a verbatim slice of the criterion (G16).
  t = t.replace(/\bis\s+mandatory\b/gi, "rejects an empty value");
  t = t.replace(/\bis\s+required\b/gi, "rejects an empty value");
  t = t.replace(/\bis\s+optional\b/gi, "accepts an empty value");
  t = t.replace(/\bis\s+blocked\b/gi, "is refused");
  t = t.replace(/\bis\s+rejected\b/gi, "is refused");
  t = t.replace(/\breturns\b/gi, "lists");
  t = t.replace(/\bminimum\s+length\s+of\s+(\d+)\s+characters\b/gi, "$1 character minimum");
  t = t.replace(/\baccepts\s+values\b/gi, "accepts each listed value");

  t = t.replace(FILLER_ADVERBS, " ");
  t = t.replace(/^\s*(?:The|A|An)\s+/i, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── Word budget, honoured by dropping whole trailing phrases ───────────────

const TRAILING_PREPOSITIONS = [
  "across", "under", "within", "into", "from", "with", "via", "for", "on",
  "in", "to", "by", "as", "of", "at",
];

const prepClean = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Bring a title inside the word budget by dropping WHOLE trailing phrases at
 * clause or prepositional boundaries. This authors a shorter label; it is not a
 * string slice, so it can never cut mid-word or leave dangling punctuation.
 */
export function fitWords(title: string, subject: string): string {
  let w = wordsOf(title);

  let guard = 0;
  while (w.length > TITLE_MAX_WORDS && guard++ < 40) {
    let cutAt = -1;

    // 1. Prefer the FIRST comma boundary: it ends the main clause, so the verb
    //    keeps its object. Cutting at a preposition instead strands the verb
    //    ("... setting renders" with "on Location Summary" thrown away).
    for (let i = TITLE_MIN_WORDS - 1; i < w.length - 1; i++) {
      if (/,$/.test(w[i])) { cutAt = i + 1; break; }
    }
    // 2. Then a trailing "and ..." conjunct.
    if (cutAt < TITLE_MIN_WORDS || cutAt > TITLE_MAX_WORDS) {
      cutAt = -1;
      for (let i = w.length - 1; i >= TITLE_MIN_WORDS; i--) {
        if (/^and$/i.test(prepClean(w[i]))) { cutAt = i; break; }
      }
    }
    // 3. Then a trailing prepositional phrase.
    if (cutAt < TITLE_MIN_WORDS) {
      for (let i = w.length - 1; i >= TITLE_MIN_WORDS; i--) {
        if (TRAILING_PREPOSITIONS.indexOf(prepClean(w[i])) !== -1) { cutAt = i; break; }
      }
    }
    if (cutAt < TITLE_MIN_WORDS) { w = w.slice(0, TITLE_MAX_WORDS); break; }
    w = w.slice(0, cutAt);
  }

  if (w.length < TITLE_MIN_WORDS && subject) {
    const lower = w.map(x => x.toLowerCase());
    const lead = wordsOf(subject).filter(x => lower.indexOf(x.toLowerCase()) === -1);
    w = lead.concat(w);
  }

  let out = w.join(" ").replace(/[\s,;:.]+$/, "").trim();
  // never leave an unclosed quote or bracket behind
  if ((out.match(/"/g) || []).length % 2 !== 0) out = out.replace(/\s*"[^"]*$/, "").trim();
  if (out.indexOf("(") !== -1 && out.indexOf(")") === -1) out = out.slice(0, out.indexOf("(")).trim();
  if (out.indexOf("[") !== -1 && out.indexOf("]") === -1) out = out.slice(0, out.indexOf("[")).trim();
  return out.replace(/[\s,;:.\-]+$/, "").trim();
}

// ── Subjects and coverage-specific assertions ──────────────────────────────

export function subjectFor(arch: Archetype, v: ScenarioCtx): string {
  switch (arch) {
    case "CONFIG": return `${v.setting} toggle`;
    case "PERMISSION": return `${v.setting} toggle`;
    case "SELECTION": return `${v.button} modal`;
    case "KIOSK_CART": return "Cart limit validation";
    case "MODAL_UI": return "Limit exceeded modal";
    case "VISUAL": return "Restriction indicator";
    case "LIFECYCLE": return "Cart state";
    case "EVENT_DB": return "Blocked event record";
    case "SYNC": return "Restriction config sync";
    case "REPORT": return "Blocked scan events report";
    case "SCOPE": return "Restriction enforcement scope";
    default: return v.object;
  }
}

/**
 * Negative and edge titles are authored from the SCENARIO being exercised rather
 * than from one criterion, because after identical-step collapse a single
 * negative or edge case covers every criterion of that archetype in the story.
 */
const NEGATIVE_ASSERTION: Record<Archetype, string> = {
  CONFIG: "Unsupported restriction value refused and stored setting left unchanged",
  PERMISSION: "Restriction toggle absent and direct save refused without permission",
  SELECTION: "Choose Items unavailable and quantity locked while restriction is No",
  KIOSK_CART: "Over-limit add rejected with cart contents left unchanged",
  MODAL_UI: "Limit modal holds until Ok and cart stays unchanged",
  VISUAL: "No indicator or limit label shown for an unrestricted product",
  LIFECYCLE: "Restriction count does not persist into a new transaction",
  EVENT_DB: "No event row written for an allowed add",
  SYNC: "Un-synced kiosk does not enforce a newly saved restriction",
  REPORT: "Report returns zero rows when no blocks occurred",
  SCOPE: "RT and Pico devices do not enforce the restriction",
  GENERIC: "Invalid value refused and prior stored value retained",
};

/**
 * Scenario-level POSITIVE assertion. Used when identical-step collapse leaves one
 * positive case covering several criteria: a title naming only the first of them
 * would under-describe what the case actually walks through.
 */
const POSITIVE_ASSERTION: Record<Archetype, string> = {
  CONFIG: "Restriction toggle saves and holds independently per location",
  PERMISSION: "Restriction toggle renders only for a permitted operator",
  SELECTION: "Choose Items tagging persists quantity, timestamp, and listing indicator",
  KIOSK_CART: "Restricted add succeeds within limit across every input method",
  MODAL_UI: "Limit modal appears on the blocking add and dismisses cleanly",
  VISUAL: "Restriction indicator and limit label render across kiosk views",
  LIFECYCLE: "Cart and restriction count reset on every transaction outcome",
  EVENT_DB: "Blocked event row written to KSKDB and synced upstream",
  SYNC: "Restriction config propagates from SOSDB to kiosk pricingrec",
  REPORT: "Blocked scan events report runs, exports, and totals correctly",
  SCOPE: "Restriction enforced on V5 only at product and location level",
  GENERIC: "Stored value saves, persists, and reads back unchanged",
};

/** Scenario-level title for a case that covers more than one criterion. */
export function scenarioTitle(cov: CoverageType, arch: Archetype, v: ScenarioCtx): string {
  const subject = subjectFor(arch, v);
  const table = cov === "negative" ? NEGATIVE_ASSERTION
    : cov === "edge" ? EDGE_ASSERTION : POSITIVE_ASSERTION;
  return normalizeTitle(fitWords(table[arch], subject));
}

const EDGE_ASSERTION: Record<Archetype, string> = {
  CONFIG: "Restriction toggle default and per-location independence at each state",
  PERMISSION: "Restriction toggle visibility across permission and default states",
  SELECTION: "Quantity dropdown bounds with search and filter behaviour",
  KIOSK_CART: "Cart limit boundary with NULL limit and location flag off",
  MODAL_UI: "Modal fires only at the first over-limit unit on V5 and MM6",
  VISUAL: "Limit label matches the configured value at 1 and 5",
  LIFECYCLE: "Back-to-back transactions reset cart and restriction count",
  EVENT_DB: "Event row written per input method and transaction outcome",
  SYNC: "Sync carries the limit at 1, 5, and NULL without drift",
  REPORT: "Report covers date boundaries, all locations, and each filter",
  SCOPE: "Restriction scoped to one product at one location only",
  GENERIC: "Value accepted at minimum and maximum and refused beyond",
};

/**
 * Author the title. Positive titles are criterion-specific (condensed, revoiced,
 * led by the subject under test). Negative and edge titles are scenario-level.
 */
export function authorTitle(
  cov: CoverageType,
  arch: Archetype,
  v: ScenarioCtx,
  acText: string
): string {
  const subject = subjectFor(arch, v);

  if (cov === "negative") return normalizeTitle(fitWords(NEGATIVE_ASSERTION[arch], subject));
  if (cov === "edge") return normalizeTitle(fitWords(EDGE_ASSERTION[arch], subject));

  const core = revoice(condenseAc(acText));
  const seeded = seedSubject(core, arch, v, subject);
  let out = fitWords(seeded, subject);

  // PART 2 / G16: a label must not simply be the criterion.
  // 1. Tighten it into label voice by dropping low-information function words.
  if (looksLikeAcText(out, acText)) out = fitWords(stripTitleStopwords(out), subject);
  // 2. Still criterion-shaped? Lead with the subject under test, adding only the
  //    subject words the title does not already carry (no "classification
  //    classification field ...").
  if (looksLikeAcText(out, acText)) out = fitWords(prependMissing(subject, out), subject);
  // 3. Last resort: use the fully authored scenario label. Reached when the
  //    criterion is so short that every faithful condensation of it is still a
  //    slice of the criterion (for example "Cart state resets between
  //    transactions"), and the subject adds no new words.
  if (looksLikeAcText(out, acText)) out = scenarioTitle(cov, arch, v);

  return normalizeTitle(capitalise(dedupeAdjacentWords(out)));
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Function words a label does not need. Never applied to steps or AC text. */
const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "that", "which", "its", "their", "of", "to", "as",
]);

function stripTitleStopwords(s: string): string {
  const all = wordsOf(s);
  const kept: string[] = [];
  let remaining = all.length;
  all.forEach((w, i) => {
    const bare = w.toLowerCase().replace(/[^a-z]/g, "");
    const droppable = i > 0 && TITLE_STOPWORDS.has(bare);
    // Stop dropping once the label would fall under the word floor: a title
    // shorter than the budget is as much a defect as one over it (G18).
    if (droppable && kept.length + remaining - 1 >= TITLE_MIN_WORDS) { remaining--; return; }
    kept.push(w);
    remaining--;
  });
  return kept.join(" ");
}

const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Collapse an immediately repeated word, case-insensitively. */
function dedupeAdjacentWords(s: string): string {
  const w = wordsOf(s);
  const out: string[] = [];
  for (const word of w) {
    const prev = out.length ? bare(out[out.length - 1]) : "";
    if (prev && prev === bare(word)) continue;
    out.push(word);
  }
  return out.join(" ");
}

/**
 * Remove a repeated phrase at the join between a subject and a criterion core,
 * so "Cart state" + "cart state resets between transactions" reads
 * "Cart state resets between transactions" rather than repeating itself.
 */
function joinWithoutRepeat(subject: string, core: string): string {
  const sw = wordsOf(subject), cw = wordsOf(core);
  for (let n = Math.min(4, sw.length, cw.length); n >= 1; n--) {
    const tail = sw.slice(sw.length - n).map(bare).join(" ");
    const head = cw.slice(0, n).map(bare).join(" ");
    if (tail && tail === head) return sw.concat(cw.slice(n)).join(" ");
  }
  return `${subject} ${core}`;
}

/** Prepend only the subject words the title does not already contain. */
function prependMissing(subject: string, title: string): string {
  const have = new Set(tokens(title));
  const lead = wordsOf(subject).filter(w => !have.has(w.toLowerCase().replace(/[^a-z0-9]/g, "")));
  if (lead.length === 0) return title;
  return joinWithoutRepeat(lead.join(" "), title.charAt(0).toLowerCase() + title.slice(1));
}

/** Vague openings that name nothing testable on their own. */
const VAGUE_OPENING = /^(?:it|this|there|they|each|every|system|code|older|different|values?|restrictions?|no|events?|validation|cart|one|both)\b/i;

/** Generic nouns the subject phrase already names, so they can be swapped out. */
const SWAPPABLE_OPENING = /^(page|screen|setting|toggle|report|modal|dropdown|button)\b/i;

/**
 * Give the label a concrete subject. A generic opening noun is REPLACED by the
 * named subject rather than prefixed, so a title never reads "toggle page saves".
 */
function seedSubject(core: string, arch: Archetype, v: ScenarioCtx, subject: string): string {
  const swap = core.match(SWAPPABLE_OPENING);
  if (swap) {
    const named = /^(page|screen)$/i.test(swap[1]) ? v.screen : subject;
    const rest = core.slice(swap[1].length).trim();
    return joinWithoutRepeat(named, rest).replace(/\s+/g, " ").trim();
  }
  if (VAGUE_OPENING.test(core)) {
    return joinWithoutRepeat(subject, core.charAt(0).toLowerCase() + core.slice(1));
  }
  return core;
}

/** True when the label is effectively the criterion text (G16's condition). */
function looksLikeAcText(title: string, acText: string): boolean {
  const nt = title.toLowerCase().replace(/\s+/g, " ").trim();
  const na = (acText || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!nt || !na) return false;
  if (nt.length > 12 && na.indexOf(nt) !== -1) return true;
  if (na.length > 12 && nt.indexOf(na) !== -1) return true;
  return similarity(title, acText) > 0.8;   // margin below the 0.85 gate
}

// ── Uniqueness within a story ─────────────────────────────────────────────

/** Lowercased alphanumeric token list, for comparison only. */
export function tokens(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

/** Token-set Jaccard similarity in [0,1]. Used by G16. */
export function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  Array.from(ta).forEach(t => { if (tb.has(t)) inter++; });
  return inter / (ta.size + tb.size - inter);
}

/**
 * Resolve a title collision by extending with distinctive words drawn from the
 * case's own criterion. Never appends a counter and never appends a type label.
 * Returns null when no distinctive word fits inside the word budget.
 */
/** Function words that must never be used to extend a title (they read as a cut). */
const FUNCTION_WORDS = new Set([
  "that", "this", "these", "those", "which", "when", "while", "with", "from",
  "into", "onto", "over", "under", "after", "before", "then", "than", "also",
  "each", "every", "both", "such", "same", "only", "must", "shall", "should",
  "will", "would", "does", "have", "been", "being", "their", "there", "they",
  "them", "some", "any", "all", "not", "and", "the", "for", "its",
]);

export function disambiguate(title: string, acText: string, taken: Set<string>): string | null {
  const have = new Set(tokens(title));
  const candidates = tokens(condenseAc(acText))
    .filter(w => w.length > 3 && !have.has(w) && !FUNCTION_WORDS.has(w));
  let out = title;
  for (const w of candidates) {
    const next = `${out} ${w}`;
    if (wordCount(next) > TITLE_MAX_WORDS) return null;
    out = next;
    if (!taken.has(out.toLowerCase())) return out;
  }
  return null;
}
