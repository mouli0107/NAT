// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Types
// server/lib/merger/types.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Unit-level types (stored as JSON in framework_assets.content) ─────────────

export interface LocatorUnit {
  /** Logical selector name, e.g. "submitButton" */
  name: string;
  /** Playwright selector string */
  selector: string;
  /** Computed stability score 0–1 */
  stability: number;
  /** Source test-case IDs that produced this locator */
  sourceTcIds: string[];
}

export interface PageObjectMethod {
  /** Method name, e.g. "clickSubmit" */
  name: string;
  /** Full TypeScript source of the method body */
  body: string;
  /** Locator names referenced by this method */
  locatorRefs: string[];
  /** Source test-case IDs */
  sourceTcIds: string[];
}

export interface ActionStep {
  /** Step description or function call, e.g. "fillLoginForm" */
  description: string;
  /** Full TypeScript source of the step */
  code: string;
  /** Page-object method names referenced */
  methodRefs: string[];
  /** Source test-case IDs */
  sourceTcIds: string[];
}

export interface BusinessFunction {
  /** Function name, e.g. "loginAsAdmin" */
  name: string;
  /** Full TypeScript source */
  body: string;
  /** Action step descriptions referenced */
  stepRefs: string[];
  /** Source test-case IDs */
  sourceTcIds: string[];
}

// ── Merge result types ────────────────────────────────────────────────────────

export type MergeAction = 'keep' | 'replace' | 'add' | 'conflict';

export interface MergeDecision<T> {
  action: MergeAction;
  /** The unit that will be persisted after merge */
  resolved: T;
  /** If action === 'conflict', human-readable description */
  conflictReason?: string;
  /** Claude-generated merge suggestion for conflicts */
  aiSuggestion?: string;
}

// ── Per-layer merge results ───────────────────────────────────────────────────

export interface LocatorMergeResult {
  projectId: string;
  pageKey: string;                       // e.g. "LoginPage"
  decisions: Array<MergeDecision<LocatorUnit>>;
  assetsUpserted: number;
  conflictsRaised: number;
}

export interface PageObjectMergeResult {
  projectId: string;
  pageKey: string;
  decisions: Array<MergeDecision<PageObjectMethod>>;
  assetsUpserted: number;
  conflictsRaised: number;
}

export interface ActionMergeResult {
  projectId: string;
  domainKey: string;                     // e.g. "login"
  decisions: Array<MergeDecision<ActionStep>>;
  assetsUpserted: number;
  conflictsRaised: number;
}

export interface BusinessFunctionMergeResult {
  projectId: string;
  domainKey: string;
  decisions: Array<MergeDecision<BusinessFunction>>;
  assetsUpserted: number;
  conflictsRaised: number;
  /** Suggested compound function when >80% step overlap detected */
  mergeSuggestion?: string;
}

// ── Top-level orchestration result ────────────────────────────────────────────

export interface FrameworkMergeResult {
  projectId: string;
  tcId: string;
  locators: LocatorMergeResult[];
  pageObjects: PageObjectMergeResult[];
  actions: ActionMergeResult[];
  businessFunctions: BusinessFunctionMergeResult[];
  totalAssetsUpserted: number;
  totalConflictsRaised: number;
  durationMs: number;
}

// ── Input payload ─────────────────────────────────────────────────────────────

export interface FrameworkMergeInput {
  projectId: string;
  tcId: string;
  /** Locator units keyed by page name, e.g. { "LoginPage": [...] } */
  locators: Record<string, LocatorUnit[]>;
  /** Page object methods keyed by page name */
  pageObjects: Record<string, PageObjectMethod[]>;
  /** Action steps keyed by domain, e.g. { "login": [...] } */
  actions: Record<string, ActionStep[]>;
  /** Business functions keyed by domain */
  businessFunctions: Record<string, BusinessFunction[]>;
}

// ── Sprint 3 unit types ───────────────────────────────────────────────────────

export type UtilCategory = 'wait' | 'data' | 'assert' | 'api' | 'general';

export interface UtilUnit {
  /** Function name, e.g. "waitForToast" */
  functionName: string;
  /** Logical category that drives the destination file */
  category: UtilCategory;
  /** Full TypeScript source of the function */
  functionBody: string;
  /** Source test-case IDs */
  sourceTcIds: string[];
}

export interface FixtureUnit {
  /** Fixture name, e.g. "loginUser" */
  fixtureName: string;
  /** Full TypeScript source of the factory function body */
  factoryBody: string;
  /** Module/feature scope — used for namespacing on collision */
  scope: string;
  /** Source test-case IDs */
  sourceTcIds: string[];
}

export interface SpecUnit {
  /** e.g. "TC-042" — unique key within the project */
  tcSequence: string;
  /** Human-readable test name */
  tcName: string;
  /** Module folder, e.g. "Login" */
  moduleName: string;
  /** Feature sub-folder, e.g. "HappyPath" */
  featureName: string;
  /** Full .spec.ts file content */
  content: string;
  /** userId who recorded this TC */
  recordedBy: string;
  /** Source test-case IDs (usually just [tcSequence]) */
  sourceTcIds: string[];
}

// ── Sprint 3 merge result types ───────────────────────────────────────────────

export type UtilMergeAction = 'add' | 'skip' | 'update' | 'alias' | 'conflict';

export interface UtilMergeDecision {
  action: UtilMergeAction;
  unitName: string;
  reason?: string;
}

export interface UtilMergeResult {
  projectId: string;
  decisions: UtilMergeDecision[];
  assetsUpserted: number;
  conflictsRaised: number;
  /** Number of spec files updated to replace inline copies with imports */
  inlineReplacementsCount: number;
}

export type FixtureMergeAction = 'add' | 'skip' | 'parameterize' | 'namespace' | 'conflict';

export interface FixtureMergeDecision {
  action: FixtureMergeAction;
  fixtureName: string;
  reason?: string;
}

export interface FixtureMergeResult {
  projectId: string;
  decisions: FixtureMergeDecision[];
  assetsUpserted: number;
  conflictsRaised: number;
}

export type SpecMergeAction = 'add' | 'replace' | 'version';

export interface SpecMergeResult {
  projectId: string;
  tcSequence: string;
  filePath: string;
  action: SpecMergeAction;
  conflictsRaised: number;
  /** tcSequences of specs with >85% content similarity */
  similarSpecs: string[];
}

export interface RefactoringChange {
  filePath: string;
  changeType: 'import_fix' | 'dead_code_warning' | 'config_regenerated';
  description: string;
}

// ── Extended merge input (all 7 layers) ──────────────────────────────────────

export interface FullMergeInput extends FrameworkMergeInput {
  /** Generic utility functions (wait, data, assert, api, general) */
  genericUtils: UtilUnit[];
  /** Playwright fixtures */
  fixtures: FixtureUnit[];
  /** The spec file for this recording */
  spec: SpecUnit;
}

// ── Full merge result (all 7 layers + post-merge) ─────────────────────────────

export interface FullMergeResult {
  success: boolean;
  tcSequence: string;
  layers: {
    locators:          LocatorMergeResult[];
    pageObjects:       PageObjectMergeResult[];
    actions:           ActionMergeResult[];
    businessFunctions: BusinessFunctionMergeResult[];
    genericUtils:      UtilMergeResult;
    fixtures:          FixtureMergeResult;
    spec:              SpecMergeResult;
  };
  /** IDs of newly raised conflict rows */
  conflictIds: string[];
  refactoringChanges: RefactoringChange[];
  totalAdded:     number;
  totalSkipped:   number;
  totalConflicts: number;
  durationMs:     number;
}

// ── DB adapter interface ──────────────────────────────────────────────────────

export interface AssetRow {
  id: string;
  projectId: string;
  assetType: string;
  assetKey: string;
  filePath: string;
  content: string;          // JSON-serialised unit
  contentHash: string | null;
  unitName: string | null;
  unitHash: string | null;
  layer: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceTcId: string | null;
}

export interface ConflictRow {
  id: string;
  projectId: string;
  assetType: string;
  assetKey: string;
  conflictType: string | null;
  baseContent: string | null;
  incomingContent: string | null;
  baseAuthor: string | null;
  incomingAuthor: string | null;
  baseTcId: string | null;
  incomingTcId: string | null;
  aiSuggestion: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}
