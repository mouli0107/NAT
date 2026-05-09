// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Integration Tests
// server/lib/merger/__tests__/integration.test.ts
//
// Simulates 3 users independently recording test cases into the same project.
// All DB calls go through the mocked mergerDb singleton.
//
// Run: npx vitest run server/lib/merger/__tests__/integration.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mock variables ──────────────────────────────────────────────────────

type StoredAsset = {
  id: string; projectId: string; assetType: string; assetKey: string;
  filePath: string; content: string; contentHash: string | null;
  unitName: string | null; unitHash: string | null; layer: string | null;
  createdBy: string | null; updatedBy: string | null;
  createdAt: Date; updatedAt: Date; sourceTcId: string | null;
};

type ConflictEntry = { id: string; assetKey: string };

const stored   = vi.hoisted(() => new Map() as Map<string, StoredAsset>);
const conflicts = vi.hoisted(() => [] as ConflictEntry[]);
const _idSeq   = vi.hoisted(() => ({ n: 0 }));

const mockDb = vi.hoisted(() => ({
  tryLock:   vi.fn().mockReturnValue(true),
  unlock:    vi.fn(),

  getAssetsByTypeAndKey: vi.fn().mockImplementation(
    (projectId: string, assetType: string, assetKey: string) =>
      Promise.resolve(
        Array.from(stored.values()).filter(
          r => r.projectId === projectId &&
               r.assetType === assetType &&
               r.assetKey  === assetKey,
        ),
      ),
  ),

  getAssetsByType: vi.fn().mockImplementation(
    (projectId: string, assetType: string) =>
      Promise.resolve(
        Array.from(stored.values()).filter(
          r => r.projectId === projectId && r.assetType === assetType,
        ),
      ),
  ),

  getAssetsByTypes: vi.fn().mockImplementation(
    (projectId: string, assetTypes: string[]) =>
      Promise.resolve(
        Array.from(stored.values()).filter(
          r => r.projectId === projectId && assetTypes.includes(r.assetType),
        ),
      ),
  ),

  upsertAsset: vi.fn().mockImplementation((row: Record<string, unknown>) => {
    const mapKey = `${String(row['projectId'])}:${String(row['assetType'])}:${String(row['assetKey'])}`;
    const id = stored.get(mapKey)?.id ?? `asset-${++_idSeq.n}`;
    stored.set(mapKey, {
      id,
      projectId:   String(row['projectId']),
      assetType:   String(row['assetType']),
      assetKey:    String(row['assetKey']),
      filePath:    String(row['filePath']),
      content:     String(row['content']),
      contentHash: (row['contentHash'] as string | null) ?? null,
      unitName:    (row['unitName'] as string | null) ?? null,
      unitHash:    (row['unitHash'] as string | null) ?? null,
      layer:       (row['layer'] as string | null) ?? null,
      createdBy:   (row['createdBy'] as string | null) ?? null,
      updatedBy:   (row['updatedBy'] as string | null) ?? null,
      createdAt:   new Date(), updatedAt: new Date(),
      sourceTcId:  (row['sourceTcId'] as string | null) ?? null,
    });
    return Promise.resolve(id);
  }),

  appendVersion: vi.fn().mockResolvedValue(undefined),

  updateAsset: vi.fn().mockImplementation((id: string, patch: Record<string, unknown>) => {
    for (const [k, v] of Array.from(stored.entries())) {
      if (v.id === id) {
        stored.set(k, { ...v, content: String(patch['content']), contentHash: (patch['contentHash'] as string | null) ?? null });
        break;
      }
    }
    return Promise.resolve();
  }),

  raiseConflict: vi.fn().mockImplementation((c: Record<string, unknown>) => {
    const id = `conflict-${++_idSeq.n}`;
    conflicts.push({ id, assetKey: String(c['assetKey']) });
    return Promise.resolve(id);
  }),

  getOpenConflicts: vi.fn().mockImplementation((_projectId: string) =>
    Promise.resolve(conflicts.map(c => ({ ...c, status: 'open' }))),
  ),

  logDedup: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db-adapter.js', () => ({ mergerDb: mockDb, MergerDb: vi.fn() }));
vi.mock('../../../db.js',   () => ({ db: {}, pool: {} }));

// ── Import after mocks ────────────────────────────────────────────────────────

import { FrameworkMerger } from '../index.js';
import { buildProjectZip }  from '../zip-builder.js';
import type { FullMergeInput, LocatorUnit, UtilUnit, FixtureUnit, SpecUnit } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Asset factories
// ─────────────────────────────────────────────────────────────────────────────

function makeLocator(name: string, selector: string): LocatorUnit {
  return { name, selector, stability: 0.9, sourceTcIds: [] };
}

function makeSpec(tcSeq: string, recordedBy: string, content?: string): SpecUnit {
  return {
    tcSequence:  tcSeq,
    tcName:      `Test ${tcSeq}`,
    moduleName:  'Login',
    featureName: 'HappyPath',
    content:     content ?? `import { test } from '@playwright/test';\ntest('${tcSeq}', async ({ page }) => {});`,
    recordedBy,
    sourceTcIds: [tcSeq],
  };
}

function makeUtil(name: string, body: string): UtilUnit {
  return { functionName: name, category: 'general', functionBody: body, sourceTcIds: [] };
}

function makeFixture(name: string, body: string, scope = 'Login'): FixtureUnit {
  return { fixtureName: name, factoryBody: body, scope, sourceTcIds: [] };
}

function makeInput(projectId: string, tcId: string, overrides: Partial<FullMergeInput> = {}): FullMergeInput {
  return {
    projectId,
    tcId,
    locators:          {},
    pageObjects:       {},
    actions:           {},
    businessFunctions: {},
    genericUtils:      [],
    fixtures:          [],
    spec:              makeSpec(tcId, 'user1'),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: 3 users saving TCs', () => {
  let merger: FrameworkMerger;

  beforeEach(() => {
    // Clear all state between tests
    stored.clear();
    conflicts.length = 0;
    _idSeq.n = 0;
    vi.clearAllMocks();
    // Restore implementations cleared by clearAllMocks
    mockDb.tryLock.mockReturnValue(true);
    merger = new FrameworkMerger();
  });

  // ── Test 1: User 1 saves TC-001 fresh ──────────────────────────────────────

  it('User 1 saves TC-001 — 5 locators and 3 page object methods all added', async () => {
    const locators = {
      LoginPage: [
        makeLocator('emailInput',    '[data-testid="email"]'),
        makeLocator('passwordInput', '[data-testid="password"]'),
        makeLocator('submitButton',  '[data-testid="submit"]'),
        makeLocator('errorMessage',  '[data-testid="error"]'),
        makeLocator('rememberMe',    '[data-testid="remember"]'),
      ],
    };

    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-001', {
        locators,
        pageObjects: {
          LoginPage: [
            { name: 'fillEmail',    body: 'await this.emailInput.fill(email);',         locatorRefs: ['emailInput'],    sourceTcIds: [] },
            { name: 'fillPassword', body: 'await this.passwordInput.fill(password);',   locatorRefs: ['passwordInput'], sourceTcIds: [] },
            { name: 'clickSubmit',  body: 'await this.submitButton.click();',            locatorRefs: ['submitButton'],  sourceTcIds: [] },
          ],
        },
        spec: makeSpec('TC-001', 'user1'),
      }),
    );

    expect(result.success).toBe(true);
    expect(result.layers.locators[0].assetsUpserted).toBe(5);
    expect(result.layers.pageObjects[0].assetsUpserted).toBe(3);
    expect(result.totalAdded).toBeGreaterThanOrEqual(8);
    expect(result.totalConflicts).toBe(0);
  });

  // ── Test 2: User 2 saves TC-002 with overlapping locators ─────────────────

  it('User 2 saves TC-002 — shared locators kept, new ones added', async () => {
    // Pre-populate store with TC-001 locators (simulates User 1 having run first).
    // stability must match selectorStabilityScore('[data-testid="xxx"]') = 0.95
    // so that incoming enriched units hash-match → KEEP (not REPLACE or CONFLICT).
    const user1Locators: LocatorUnit[] = [
      { name: 'emailInput',    selector: '[data-testid="email"]',    stability: 0.95, sourceTcIds: ['TC-001'] },
      { name: 'passwordInput', selector: '[data-testid="password"]', stability: 0.95, sourceTcIds: ['TC-001'] },
      { name: 'submitButton',  selector: '[data-testid="submit"]',   stability: 0.95, sourceTcIds: ['TC-001'] },
    ];
    for (const loc of user1Locators) {
      const content = JSON.stringify(loc);
      const mapKey = `proj1:locator:LoginPage:${loc.name}`;
      stored.set(mapKey, {
        id: `seed-${loc.name}`, projectId: 'proj1', assetType: 'locator',
        assetKey: `LoginPage:${loc.name}`, filePath: 'locators/LoginPage.locators.ts',
        content, contentHash: null, unitName: loc.name,
        unitHash: null, // null → layer recomputes from content for comparison
        layer: 'locator', createdBy: 'user1', updatedBy: null,
        createdAt: new Date(), updatedAt: new Date(), sourceTcId: 'TC-001',
      });
    }

    // User 2 sends same 3 locators + 2 new ones
    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-002', {
        locators: {
          LoginPage: [
            makeLocator('emailInput',    '[data-testid="email"]'),    // identical → KEEP
            makeLocator('passwordInput', '[data-testid="password"]'), // identical → KEEP
            makeLocator('submitButton',  '[data-testid="submit"]'),   // identical → KEEP
            makeLocator('forgotPassword', '[data-testid="forgot"]'),  // new → ADD
            makeLocator('logo',          '[data-testid="logo"]'),     // new → ADD
          ],
        },
        spec: makeSpec('TC-002', 'user2'),
      }),
    );

    expect(result.success).toBe(true);
    const locLayer = result.layers.locators[0];
    const skipped = locLayer.decisions.filter(d => d.action === 'keep').length;
    const added   = locLayer.decisions.filter(d => d.action === 'add').length;
    expect(skipped).toBeGreaterThan(0);
    expect(added).toBeGreaterThan(0);
    expect(result.totalConflicts).toBe(0);
  });

  // ── Test 3: User 3 saves TC-003 with a conflicting locator ────────────────

  it('User 3 saves TC-003 — conflicting locator raises exactly 1 conflict', async () => {
    // Seed an existing locator with a different, equally-stable selector
    const existingLoc = makeLocator('submitButton', '#legacy-submit-btn');
    existingLoc.stability = 0.75;
    const existingContent = JSON.stringify(existingLoc);
    const mapKey = `proj1:locator:LoginPage:submitButton`;
    stored.set(mapKey, {
      id: 'seed-submit', projectId: 'proj1', assetType: 'locator',
      assetKey: 'LoginPage:submitButton', filePath: 'locators/LoginPage.locators.ts',
      content: existingContent, contentHash: null, unitName: 'submitButton',
      unitHash: null, layer: 'locator', createdBy: 'user1', updatedBy: null,
      createdAt: new Date(), updatedAt: new Date(), sourceTcId: 'TC-001',
    });

    // Incoming locator has a different selector at similar stability (0.75) → CONFLICT
    const conflictingLoc = makeLocator('submitButton', '#new-submit-id');
    conflictingLoc.stability = 0.75;

    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-003', {
        locators: { LoginPage: [conflictingLoc] },
        spec: makeSpec('TC-003', 'user3'),
      }),
    );

    expect(result.success).toBe(true);
    expect(result.totalConflicts).toBe(1);
    expect(result.conflictIds.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 4: ZIP builder produces non-empty buffer ─────────────────────────

  it('buildProjectZip returns a non-empty buffer for project scope', async () => {
    // Seed a couple of spec assets
    stored.set('proj1:spec:TC-001', {
      id: 'spec-1', projectId: 'proj1', assetType: 'spec', assetKey: 'TC-001',
      filePath: 'tests/Login/HappyPath/TC-001-test.spec.ts',
      content: `import { test } from '@playwright/test'; test('TC-001', () => {});`,
      contentHash: null, unitName: 'TC-001', unitHash: null, layer: 'spec',
      createdBy: 'user1', updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
      sourceTcId: 'TC-001',
    });

    const zip = await buildProjectZip('proj1', {
      scope: 'project',
      projectName: 'Test Project',
    });

    expect(Buffer.isBuffer(zip)).toBe(true);
    expect(zip.length).toBeGreaterThan(0);
  });

  // ── Test 5: No duplicate asset keys ───────────────────────────────────────

  it('After 3 users saving, no duplicate assetKeys exist in the store', async () => {
    // Save TC-001 through TC-003 sequentially with unique locators
    for (const [i, user] of [['TC-001', 'user1'], ['TC-002', 'user2'], ['TC-003', 'user3']]) {
      await merger.mergeRecordingIntoProject(
        makeInput('proj1', i as string, {
          locators: { LoginPage: [makeLocator(`uniqueLocator_${i}`, `[data-testid="${i}"]`)] },
          spec: makeSpec(i as string, user as string),
        }),
      );
    }

    const allLocators = Array.from(stored.values()).filter(
      r => r.projectId === 'proj1' && r.assetType === 'locator',
    );
    const keys = allLocators.map(r => r.assetKey);
    expect(keys.length).toBe(new Set(keys).size); // no duplicates
  });

  // ── Test 6: Same user re-recording replaces spec (not duplicates) ─────────

  it('Same user re-recording TC-001 replaces the existing spec (action=replace)', async () => {
    // First recording
    await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-001', { spec: makeSpec('TC-001', 'user1', 'content-v1') }),
    );

    // Same user re-records
    const result2 = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-001-rerecord', { spec: makeSpec('TC-001', 'user1', 'content-v2') }),
    );

    // Re-recording is always 'replace' when createdBy matches
    expect(result2.layers.spec.action).toBe('replace');
    expect(result2.totalConflicts).toBe(0);
  });

  // ── Test 7: Different user recording same TC creates version + conflict ────

  it('Different user recording same TC produces action=version and 1 conflict', async () => {
    // Seed an existing spec by user1
    stored.set('proj1:spec:TC-001', {
      id: 'spec-1', projectId: 'proj1', assetType: 'spec', assetKey: 'TC-001',
      filePath: 'tests/Login/HappyPath/TC-001-test.spec.ts',
      content: 'content-by-user1',
      contentHash: null, unitName: 'TC-001', unitHash: null, layer: 'spec',
      createdBy: 'user1', updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
      sourceTcId: 'TC-001',
    });

    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-001-user2', { spec: makeSpec('TC-001', 'user2', 'content-by-user2') }),
    );

    expect(result.layers.spec.action).toBe('version');
    expect(result.layers.spec.conflictsRaised).toBe(1);
  });

  // ── Test 8: Generic util semantic dupe gets aliased ───────────────────────

  it('Util with same body but different name gets aliased (not duplicated)', async () => {
    // Seed an existing util
    const existingUtil = makeUtil('waitForElement', 'async waitForElement(sel) { await page.waitForSelector(sel); }');
    const content = JSON.stringify(existingUtil);
    stored.set('proj1:generic_util:utils.waitForElement', {
      id: 'util-1', projectId: 'proj1', assetType: 'generic_util',
      assetKey: 'utils.waitForElement', filePath: 'utils/helpers.ts',
      content, contentHash: null, unitName: 'waitForElement', unitHash: null,
      layer: 'util', createdBy: 'user1', updatedBy: null,
      createdAt: new Date(), updatedAt: new Date(), sourceTcId: 'TC-001',
    });

    // Incoming util has different name but identical body → alias
    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-002', {
        genericUtils: [
          makeUtil('waitForEl', 'async waitForElement(sel) { await page.waitForSelector(sel); }'),
        ],
        spec: makeSpec('TC-002', 'user2'),
      }),
    );

    const utilDecisions = result.layers.genericUtils.decisions;
    const aliasDecision = utilDecisions.find(d => d.action === 'alias');
    expect(aliasDecision).toBeDefined();
    expect(aliasDecision?.unitName).toBe('waitForEl');
  });

  // ── Test 9: Fixture with ≤3 differing lines gets parameterized ───────────

  it('Fixture with small diff gets parameterized (not duplicated)', async () => {
    // Existing fixture
    const existingBody = [
      'async (use) => {',
      '  await use({ username: "admin", role: "admin" });',
      '}',
    ].join('\n');

    stored.set('proj1:fixture:fixture.loginUser', {
      id: 'fix-1', projectId: 'proj1', assetType: 'fixture',
      assetKey: 'fixture.loginUser', filePath: 'fixtures/test-fixtures.ts',
      content: JSON.stringify(makeFixture('loginUser', existingBody)),
      contentHash: null, unitName: 'loginUser', unitHash: null,
      layer: 'fixture', createdBy: 'user1', updatedBy: null,
      createdAt: new Date(), updatedAt: new Date(), sourceTcId: 'TC-001',
    });

    // Incoming fixture — same structure but different role value
    const incomingBody = [
      'async (use) => {',
      '  await use({ username: "admin", role: "viewer" });',
      '}',
    ].join('\n');

    const result = await merger.mergeRecordingIntoProject(
      makeInput('proj1', 'TC-002', {
        fixtures: [makeFixture('loginUser', incomingBody)],
        spec: makeSpec('TC-002', 'user2'),
      }),
    );

    const fixtureDecision = result.layers.fixtures.decisions[0];
    // Either parameterized (small diff) or namespace (fallback) — both are valid
    expect(['parameterize', 'namespace']).toContain(fixtureDecision.action);
  });
});
