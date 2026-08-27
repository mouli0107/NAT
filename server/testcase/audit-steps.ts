/**
 * Proves every generated step satisfies the step-quality predicates (PART 3):
 * one concrete verb, one specifically named object, and an independently
 * observable expected result. Covers all archetype x coverage combinations plus
 * the padding table, so a new scenario cannot be added without meeting the bar.
 *
 *   npx tsx server/testcase/audit-steps.ts
 */
import { detectArchetype, scenarioSteps, type Archetype, type ScenarioCtx } from "./scenarios.js";
import { hasConcreteVerb, namesObject, isObservable, containsBanned } from "./steps.js";
import type { CoverageType, SystemVocabulary } from "./types.js";

const ctx: ScenarioCtx = {
  actor: "Store Operator", screen: "Location Summary page", setting: "Sale Qty Restriction",
  object: "singlesaleqty", value: "Yes", limit: "1", product: "Single Sale Product A",
  table: "pricingrec", secondTable: "SOSDB", endpoint: "/api/sync", device: "V5 kiosk",
  location: "Location A", report: "Single Sale Blocked Scan Events", button: "Choose Items",
};
const vocab: SystemVocabulary = { screens: [], fields: [], buttons: [], tables: [], endpoints: [], entities: [] };
const ARCH: Archetype[] = ["CONFIG","PERMISSION","SELECTION","KIOSK_CART","MODAL_UI","VISUAL","LIFECYCLE","EVENT_DB","SYNC","REPORT","SCOPE","GENERIC"];
const COV: CoverageType[] = ["positive","negative","edge"];

import { PADDING_EXTRAS } from "./generator.js";

let bad = 0;
for (const c of COV) {
  for (const [action, expected] of PADDING_EXTRAS(c, ctx)) {
    const problems: string[] = [];
    if (!hasConcreteVerb(action)) problems.push("NO_VERB");
    if (!namesObject(action, vocab)) problems.push("NO_OBJECT");
    if (!isObservable(expected)) problems.push("NOT_OBSERVABLE");
    if (containsBanned(action) || containsBanned(expected)) problems.push("BANNED");
    if (problems.length) { bad++; console.log(`PADDING/${c} [${problems.join(",")}]
   A: ${action}
   E: ${expected}`); }
  }
}
for (const a of ARCH) for (const c of COV) {
  for (const [action, expected] of scenarioSteps(a, c, ctx)) {
    const problems: string[] = [];
    if (!hasConcreteVerb(action)) problems.push("NO_VERB");
    if (!namesObject(action, vocab)) problems.push("NO_OBJECT");
    if (!isObservable(expected)) problems.push("NOT_OBSERVABLE");
    if (containsBanned(action) || containsBanned(expected)) problems.push("BANNED");
    if (problems.length) { bad++; console.log(`${a}/${c} [${problems.join(",")}]\n   A: ${action}\n   E: ${expected}`); }
  }
}
console.log(bad === 0 ? "ALL SCENARIO STEPS PASS" : `${bad} failing step(s)`);
