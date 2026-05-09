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
