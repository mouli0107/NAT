/**
 * Shared types for the test-case quality pipeline (Generate from User Story).
 * Deterministic generation -> intent merge -> cap -> guardrail gate -> traceability.
 */

export type Complexity = "SIMPLE" | "STANDARD" | "COMPLEX";
export type CoverageType = "positive" | "negative" | "edge";

export interface TestStep {
  step_number: number;
  action: string;
  expected_behavior: string;
}

/** PART 1.2 intent key: two candidates with the same key are the same behaviour. */
export interface IntentKey {
  actor: string;            // normalised, lowercase
  object: string;           // the system entity acted upon
  action: string;           // normalised verb
  expectedOutcome: string;  // normalised outcome
  preconditionHash: string;
}

/** PART 1.3 Rule 2: data-only variants fold into rows of this table, never new cases. */
export interface TestDataVariant {
  variant: string;
  inputs: Record<string, string>;
  expected: string;
}

/** A named requirement (acceptance criterion) with a stable ID. */
export interface AcceptanceCriterion {
  id: string;    // e.g. AC-1
  text: string;  // full, never truncated
}

export interface CandidateTestCase {
  testCaseId: string;
  storyId: string;
  acIds: string[];              // ACs this case covers (never empty for a valid case)
  /** PART 2 STEP 2.2 - the COMPLETE criterion text, never truncated. The title
   *  never carries this; it lives here so traceability keeps the full wording. */
  linkedAcceptanceCriteria: string;
  title: string;
  description?: string;
  objective: string;
  preconditions: string[];
  testSteps: TestStep[];
  expectedResult: string;
  postconditions?: string[];
  testData: TestDataVariant[];  // PART 1.3: data variants live here, not as separate cases
  testType: "Functional" | "Negative" | "Edge" | "Security" | "Accessibility";
  category: "functional" | "negative" | "edge_case" | "security" | "accessibility";
  priority: "P0" | "P1" | "P2" | "P3";
  complexity: Complexity;
  coverageType: CoverageType;
  /** Scenario archetype the steps were built from (drives scenario-level titles). */
  archetype: string;
  intentKey: IntentKey;
}

export interface StoryInput {
  storyId: string;             // e.g. US-12 — drives TC-<StoryID>-<seq> IDs
  title: string;
  description: string;
  acceptanceCriteria: string;
}

/** Named system objects resolved from the AC text and attached documents (PART 3.4). */
export interface SystemVocabulary {
  screens: string[];
  fields: string[];
  buttons: string[];
  tables: string[];
  endpoints: string[];
  entities: string[];
}

export interface TraceabilityRow {
  acId: string;
  acText: string;
  positiveTcs: string[];
  negativeTcs: string[];
  edgeTcs: string[];
  total: number;
  gap: boolean;
}

export interface TraceabilityMatrix {
  storyId: string;
  rows: TraceabilityRow[];
  gapCount: number;
}

export interface MergeStats {
  candidatesIn: number;
  casesOut: number;
  merged: number;
  intentDuplicates: number;
  dataVariants: number;
  /** Cases collapsed because their step arrays were byte-identical (Rule 4). */
  identicalSteps: number;
}
