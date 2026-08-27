/**
 * System-object vocabulary extraction (PART 3.4, PART 4.2).
 * Named screens, fields, buttons, tables, endpoints, and entities are resolved
 * from the acceptance criteria and attached documents — NEVER from the user
 * story narrative ("As a X, I want Y").
 */
import type { SystemVocabulary } from "./types.js";

function uniq(list: string[], max = 40): string[] {
  return Array.from(new Set(list.map(s => s.trim()).filter(s => s.length > 1))).slice(0, max);
}

/** Words that are never part of a system object name. A captured phrase containing
 *  one of these is connective prose, not a field/screen name. */
const STOPWORDS = new Set([
  "a", "an", "and", "or", "the", "with", "that", "which", "is", "are", "was", "were",
  "of", "to", "from", "in", "on", "for", "by", "be", "been", "it", "its", "their",
  "this", "these", "those", "when", "then", "if", "must", "not", "do", "does", "has",
  "have", "but", "as", "at", "so", "will", "shall", "within", "after", "before",
  "during", "into", "per", "via", "all", "any", "each", "no", "should", "can", "may",
  "displays", "display", "shows", "show", "returns", "return", "stores", "store",
  "creates", "create", "reads", "read", "sends", "send", "given", "user", "system",
]);

/**
 * Clean a captured object phrase. Leading articles are dropped. If what remains
 * still contains connective prose, the phrase is rejected (returns null) so the
 * caller can fall back to the anchor noun instead of inventing a name like
 * "and displays the member with".
 */
function cleanTerm(phrase: string, maxWords = 3): string | null {
  let words = (phrase || "").trim().split(/\s+/).filter(Boolean);
  while (words.length && STOPWORDS.has(words[0].toLowerCase())) words.shift();
  while (words.length && STOPWORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  if (words.length === 0 || words.length > maxWords) return null;
  if (words.some(w => STOPWORDS.has(w.toLowerCase()))) return null;
  const term = words.join(" ");
  return term.length > 1 ? term : null;
}

/** Strip narrative sentences so entities are never lifted from "As a X, I want Y". */
export function stripNarrative(text: string): string {
  return (text || "")
    .split(/\n|(?<=[.;])\s+/)
    .filter(line => !/\bas an?\b|\bi want\b|\bi need\b|\bso that\b/i.test(line))
    .join("\n");
}

export function buildVocabulary(acText: string, docTexts: string[] = []): SystemVocabulary {
  const source = [stripNarrative(acText), ...docTexts.map(stripNarrative)].join("\n");

  const grab = (rx: RegExp, group = 1): string[] => {
    const out: string[] = [];
    for (const m of Array.from(source.matchAll(rx))) if (m[group]) out.push(m[group].trim());
    return out;
  };

  /** Grab "<phrase> <anchor>" constructs. The phrase is cleaned; when it is
   *  connective prose the anchor noun alone is used, never the raw prose. */
  const grabAnchored = (rx: RegExp, keepAnchor: boolean): string[] => {
    const out: string[] = [];
    for (const m of Array.from(source.matchAll(rx))) {
      const cleaned = cleanTerm(m[1] || "");
      const anchor = (m[2] || "").trim();
      if (cleaned) out.push(keepAnchor && anchor ? `${cleaned} ${anchor}` : cleaned);
      else if (anchor) out.push(anchor);
    }
    return out;
  };

  const screens = grabAnchored(
    /\b([A-Z][A-Za-z0-9 ]{2,40}?)\s+()(?:screen|page|module|tab|dialog|panel|form|view|wizard)\b/g,
    false
  );
  const fields = [
    ...grabAnchored(/\b([A-Za-z][A-Za-z0-9 ]{1,40}?)\s+()(?:field|dropdown|checkbox|toggle|input|selector|picker)\b/g, false),
    // The anchor noun ("status", "code", "ID" ...) IS part of the field name here.
    ...grabAnchored(/\b([A-Za-z][A-Za-z0-9 ]{1,30}?)\s+(type|status|code|ID|flag|classification|number|date)\b/g, true),
  ];
  const buttons = [
    ...grab(/\b(?:click|press|tap|select)\s+(?:the\s+)?"?([A-Z][A-Za-z0-9 ]{1,24}?)"?\s*(?:button|link|menu|tab)?\b/g),
    ...grab(/\b"([A-Z][A-Za-z0-9 ]{1,24})"\s+button\b/g),
  ];
  const tables = [
    ...grab(/\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/g),                 // SNAKE_CAPS
    ...grab(/\b([A-Za-z_][A-Za-z0-9_]{2,40}?)\s+table\b/g),
  ];
  const endpoints = [
    ...grab(/\b((?:GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9/_:{}-]+)/g),
    ...grab(/\b(\/[a-z][a-z0-9/_:{}-]{3,})/g),
  ];
  // Quoted domain values + Title-Case proper nouns as entities.
  const entities = [
    ...grab(/"([^"]{2,40})"/g),
    ...grab(/'([^']{2,40})'/g),
    ...grab(/\b([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+){0,3})\b/g),
  ]
    .map(e => cleanTerm(e, 4))
    .filter((e): e is string => !!e);

  return {
    screens: uniq(screens),
    fields: uniq(fields),
    buttons: uniq(buttons),
    tables: uniq(tables),
    endpoints: uniq(endpoints),
    entities: uniq(entities),
  };
}

/** First reasonable object name for a criterion (field > entity > screen > "record"). */
export function primaryObject(acText: string, vocab: SystemVocabulary): string {
  const localFields = buildVocabulary(acText).fields;
  return (
    localFields[0] ||
    vocab.fields[0] ||
    buildVocabulary(acText).entities[0] ||
    vocab.entities[0] ||
    "record"
  );
}
