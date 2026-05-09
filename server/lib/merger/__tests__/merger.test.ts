// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Unit Tests
// server/lib/merger/__tests__/merger.test.ts
//
// Run: npx vitest run server/lib/merger/__tests__/merger.test.ts
//
// Each layer tested in isolation using a mock MergerDb adapter.
// DB is never touched — all calls go through the mocked mergerDb singleton.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mock variables so they're available when vi.mock factory runs ───────
const mockDb = vi.hoisted(() => ({
  tryLock:               vi.fn().mockReturnValue(true),
  unlock:                vi.fn(),
  getAssetsByTypeAndKey: vi.fn().mockResolvedValue([]),
  getAssetsByType:       vi.fn().mockResolvedValue([]),
  upsertAsset:           vi.fn().mockResolvedValue('mock-asset-id'),
  appendVersion:         vi.fn().mockResolvedValue(undefined),
  raiseConflict:         vi.fn().mockResolvedValue('mock-conflict-id'),
  logDedup:              vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db-adapter.js', () => ({
  mergerDb: mockDb,
  MergerDb: vi.fn(),
}));

// Also mock db.ts so FrameworkMerger import chain doesn't fail
vi.mock('../../../db.js', () => ({
  db: {},
  pool: {},
}));

// ── Import layer functions AFTER mock is set up ────────────────────────────
import { mergeLocators }          from '../layer-locators.js';
import { mergePageObjects }       from '../layer-page-objects.js';
import { mergeActions }           from '../layer-actions.js';
import { mergeBusinessFunctions } from '../layer-business-functions.js';
import { FrameworkMerger }        from '../index.js';
import {
  hashUnit,
  hashContent,
  selectorStabilityScore,
  calculateStepOverlap,
  isSuperset,
  toKebabCase,
  extractReferences,
} from '../utils.js';
import type {
  LocatorUnit,
  PageObjectMethod,
  ActionStep,
  BusinessFunction,
} from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeLocator(override: Partial<LocatorUnit> = {}): LocatorUnit {
  return {
    name: 'submitButton',
    selector: '[data-testid="submit"]',
    stability: 0.95,
    sourceTcIds: ['TC001'],
    ...override,
  };
}

function makeMethod(override: Partial<PageObjectMethod> = {}): PageObjectMethod {
  return {
    name: 'clickSubmit',
    body: 'async clickSubmit() { await this.submitButton.click(); }',
    locatorRefs: ['submitButton'],
    sourceTcIds: ['TC001'],
    ...override,
  };
}

function makeStep(override: Partial<ActionStep> = {}): ActionStep {
  return {
    description: 'fill login form',
    code: 'await pg.fillEmail(data.email); await pg.fillPassword(data.password);',
    methodRefs: ['fillEmail', 'fillPassword'],
    sourceTcIds: ['TC001'],
    ...override,
  };
}

function makeFunction(override: Partial<BusinessFunction> = {}): BusinessFunction {
  return {
    name: 'loginAsAdmin',
    body: 'async loginAsAdmin() { await fillLoginForm(); await clickSubmit(); }',
    stepRefs: ['fill login form', 'click submit'],
    sourceTcIds: ['TC001'],
    ...override,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// utils.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('utils', () => {
  describe('selectorStabilityScore', () => {
    it('data-testid scores near 1', () => {
      expect(selectorStabilityScore('[data-testid="submit"]')).toBeCloseTo(0.95, 1);
    });

    it('role selector scores high', () => {
      expect(selectorStabilityScore('role=button[name="Submit"]')).toBeGreaterThan(0.7);
    });

    it('long absolute xpath scores low', () => {
      const xpath = 'xpath=//div/table/tbody/tr/td[2]/div/span/input[@type="text"]';
      expect(selectorStabilityScore(xpath)).toBeLessThan(0.6);
    });

    it('nth-child penalty applied', () => {
      const base = selectorStabilityScore('text=Submit');
      const fragile = selectorStabilityScore('text=Submit:nth-child(3)');
      expect(fragile).toBeLessThan(base);
    });
  });

  describe('calculateStepOverlap', () => {
    it('identical sets = 1.0', () => {
      expect(calculateStepOverlap(['a', 'b'], ['a', 'b'])).toBe(1);
    });

    it('disjoint sets = 0.0', () => {
      expect(calculateStepOverlap(['a'], ['b'])).toBe(0);
    });

    it('partial overlap', () => {
      const score = calculateStepOverlap(['a', 'b', 'c'], ['b', 'c', 'd']);
      expect(score).toBeCloseTo(0.5, 1);
    });

    it('both empty = 1.0', () => {
      expect(calculateStepOverlap([], [])).toBe(1);
    });
  });

  describe('isSuperset', () => {
    it('superset returns true', () => {
      expect(isSuperset(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
    });

    it('equal sets return true', () => {
      expect(isSuperset(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('subset returns false', () => {
      expect(isSuperset(['a'], ['a', 'b'])).toBe(false);
    });
  });

  describe('toKebabCase', () => {
    it('converts PascalCase', () => {
      expect(toKebabCase('LoginPage')).toBe('login-page');
    });

    it('converts camelCase', () => {
      expect(toKebabCase('clickSubmitBtn')).toBe('click-submit-btn');
    });
  });

  describe('extractReferences', () => {
    it('extracts this.xxx', () => {
      const refs = extractReferences('await this.emailInput.fill(v); await this.submitButton.click();');
      expect(refs).toContain('emailInput');
      expect(refs).toContain('submitButton');
    });

    it('extracts lc.xxx', () => {
      const refs = extractReferences('await lc.emailInput.fill(v);');
      expect(refs).toContain('emailInput');
    });
  });

  describe('hashUnit', () => {
    it('same unit → same hash', () => {
      const u = makeLocator();
      expect(hashUnit(u)).toBe(hashUnit(u));
    });

    it('different selector → different hash', () => {
      const a = makeLocator({ selector: '#email' });
      const b = makeLocator({ selector: '#username' });
      expect(hashUnit(a)).not.toBe(hashUnit(b));
    });

    it('sourceTcIds change does NOT change hash', () => {
      const a = makeLocator({ sourceTcIds: ['TC001'] });
      const b = makeLocator({ sourceTcIds: ['TC999'] });
      expect(hashUnit(a)).toBe(hashUnit(b));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: Locators
// ─────────────────────────────────────────────────────────────────────────────

describe('layer-locators', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADD: new locator not in DB', async () => {
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);

    const result = await mergeLocators('proj1', 'TC001', 'LoginPage', [makeLocator()]);

    expect(result.decisions[0].action).toBe('add');
    expect(result.assetsUpserted).toBe(1);
    expect(result.conflictsRaised).toBe(0);
    expect(mockDb.upsertAsset).toHaveBeenCalledOnce();
    expect(mockDb.appendVersion).toHaveBeenCalledOnce();
  });

  it('KEEP: same unit hash → no DB write', async () => {
    const unit = makeLocator();
    const existingContent = JSON.stringify(unit);
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: existingContent,
      unitHash: hashUnit(unit),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeLocators('proj1', 'TC001', 'LoginPage', [unit]);

    expect(result.decisions[0].action).toBe('keep');
    expect(result.assetsUpserted).toBe(0);
    expect(mockDb.upsertAsset).not.toHaveBeenCalled();
  });

  it('REPLACE: incoming selector has higher stability', async () => {
    const existing = makeLocator({ selector: 'nth-child(2)', stability: 0.2 });
    const incoming = makeLocator({ selector: '[data-testid="submit"]', stability: 0.95 });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeLocators('proj1', 'TC001', 'LoginPage', [incoming]);

    expect(result.decisions[0].action).toBe('replace');
    expect(result.assetsUpserted).toBe(1);
    expect(result.conflictsRaised).toBe(0);
  });

  it('CONFLICT: different hash, no stability advantage', async () => {
    const existing = makeLocator({ selector: '#email-field', stability: 0.75 });
    const incoming = makeLocator({ selector: '#email-input', stability: 0.75 });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeLocators('proj1', 'TC001', 'LoginPage', [incoming]);

    expect(result.decisions[0].action).toBe('conflict');
    expect(result.conflictsRaised).toBe(1);
    expect(mockDb.raiseConflict).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: Page Objects
// ─────────────────────────────────────────────────────────────────────────────

describe('layer-page-objects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADD: new method not in DB', async () => {
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);

    const result = await mergePageObjects('proj1', 'TC001', 'LoginPage', [makeMethod()]);

    expect(result.decisions[0].action).toBe('add');
    expect(result.assetsUpserted).toBe(1);
  });

  it('KEEP: identical method body', async () => {
    const method = makeMethod();
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(method),
      unitHash: hashUnit(method),
      sourceTcId: 'TC000',
    }]);

    const result = await mergePageObjects('proj1', 'TC001', 'LoginPage', [method]);

    expect(result.decisions[0].action).toBe('keep');
    expect(mockDb.upsertAsset).not.toHaveBeenCalled();
  });

  it('REPLACE: incoming is superset of locator refs', async () => {
    const existing = makeMethod({ locatorRefs: ['submitButton'] });
    const incoming = makeMethod({ locatorRefs: ['submitButton', 'emailInput'], name: 'clickSubmit' });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergePageObjects('proj1', 'TC001', 'LoginPage', [incoming]);

    expect(result.decisions[0].action).toBe('replace');
    expect(result.assetsUpserted).toBe(1);
  });

  it('CONFLICT: different body, no superset', async () => {
    const existing = makeMethod({ locatorRefs: ['submitButton', 'cancelButton'] });
    const incoming = makeMethod({ locatorRefs: ['submitButton', 'spinner'], name: 'clickSubmit' });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergePageObjects('proj1', 'TC001', 'LoginPage', [incoming]);

    expect(result.decisions[0].action).toBe('conflict');
    expect(result.conflictsRaised).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3: Actions
// ─────────────────────────────────────────────────────────────────────────────

describe('layer-actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADD: new step not in DB', async () => {
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);

    const result = await mergeActions('proj1', 'TC001', 'login', [makeStep()]);

    expect(result.decisions[0].action).toBe('add');
    expect(result.assetsUpserted).toBe(1);
  });

  it('KEEP: identical step', async () => {
    const step = makeStep();
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(step),
      unitHash: hashUnit(step),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeActions('proj1', 'TC001', 'login', [step]);

    expect(result.decisions[0].action).toBe('keep');
  });

  it('REPLACE: incoming covers all existing method refs plus more', async () => {
    const existing = makeStep({ methodRefs: ['fillEmail'] });
    const incoming = makeStep({ methodRefs: ['fillEmail', 'fillPassword'] });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeActions('proj1', 'TC001', 'login', [incoming]);

    expect(result.decisions[0].action).toBe('replace');
  });

  it('CONFLICT: no superset relationship between method refs', async () => {
    const existing = makeStep({ methodRefs: ['fillEmail', 'clickRemember'] });
    const incoming = makeStep({ methodRefs: ['fillEmail', 'fillPassword'] });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);

    const result = await mergeActions('proj1', 'TC001', 'login', [incoming]);

    expect(result.decisions[0].action).toBe('conflict');
    expect(result.conflictsRaised).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4: Business Functions
// ─────────────────────────────────────────────────────────────────────────────

describe('layer-business-functions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADD: new function not in DB', async () => {
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);
    mockDb.getAssetsByType.mockResolvedValue([]);

    const result = await mergeBusinessFunctions('proj1', 'TC001', 'login', [makeFunction()]);

    expect(result.decisions[0].action).toBe('add');
    expect(result.assetsUpserted).toBe(1);
  });

  it('KEEP: identical function', async () => {
    const fn = makeFunction();
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(fn),
      unitHash: hashUnit(fn),
      sourceTcId: 'TC000',
    }]);
    mockDb.getAssetsByType.mockResolvedValue([]);

    const result = await mergeBusinessFunctions('proj1', 'TC001', 'login', [fn]);

    expect(result.decisions[0].action).toBe('keep');
  });

  it('REPLACE: incoming is superset of step refs', async () => {
    const existing = makeFunction({ stepRefs: ['fill login form'] });
    const incoming = makeFunction({ stepRefs: ['fill login form', 'click submit'] });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);
    mockDb.getAssetsByType.mockResolvedValue([]);

    const result = await mergeBusinessFunctions('proj1', 'TC001', 'login', [incoming]);

    expect(result.decisions[0].action).toBe('replace');
  });

  it('merge_suggestion emitted when >80% step overlap between two different functions', async () => {
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);
    // Simulate existing function in domain with overlapping steps
    const existingFn = makeFunction({
      name: 'loginAsViewer',
      stepRefs: ['fill login form', 'click submit', 'verify dashboard'],
    });
    mockDb.getAssetsByType.mockResolvedValue([{
      id: 'other-id',
      assetKey: 'login:loginAsViewer',
      content: JSON.stringify(existingFn),
    }]);

    const incoming = makeFunction({
      name: 'loginAsAdmin',
      stepRefs: ['fill login form', 'click submit', 'verify dashboard'],
    });

    const result = await mergeBusinessFunctions('proj1', 'TC001', 'login', [incoming]);

    expect(result.mergeSuggestion).toBeDefined();
    expect(result.mergeSuggestion).toContain('loginAsAdmin');
  });

  it('CONFLICT: function body diverged', async () => {
    const existing = makeFunction({ stepRefs: ['fill login form', 'accept cookie'] });
    const incoming = makeFunction({ stepRefs: ['fill login form', 'click submit'] });

    mockDb.getAssetsByTypeAndKey.mockResolvedValue([{
      id: 'existing-id',
      content: JSON.stringify(existing),
      unitHash: hashUnit(existing),
      sourceTcId: 'TC000',
    }]);
    mockDb.getAssetsByType.mockResolvedValue([]);

    const result = await mergeBusinessFunctions('proj1', 'TC001', 'login', [incoming]);

    expect(result.decisions[0].action).toBe('conflict');
    expect(result.conflictsRaised).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator (FrameworkMerger)
// ─────────────────────────────────────────────────────────────────────────────

describe('FrameworkMerger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.tryLock.mockReturnValue(true);
    mockDb.getAssetsByTypeAndKey.mockResolvedValue([]);
    mockDb.getAssetsByType.mockResolvedValue([]);
  });

  it('returns aggregated result with all 4 layers', async () => {
    const merger = new FrameworkMerger();
    const result = await merger.merge({
      projectId: 'proj1',
      tcId: 'TC001',
      locators:          { LoginPage: [makeLocator()] },
      pageObjects:       { LoginPage: [makeMethod()] },
      actions:           { login: [makeStep()] },
      businessFunctions: { login: [makeFunction()] },
    });

    expect(result.projectId).toBe('proj1');
    expect(result.tcId).toBe('TC001');
    expect(result.locators).toHaveLength(1);
    expect(result.pageObjects).toHaveLength(1);
    expect(result.actions).toHaveLength(1);
    expect(result.businessFunctions).toHaveLength(1);
    expect(result.totalAssetsUpserted).toBe(4);
    expect(result.totalConflictsRaised).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(mockDb.unlock).toHaveBeenCalledWith('proj1');
  });

  it('throws and unlocks when project is already locked', async () => {
    mockDb.tryLock.mockReturnValue(false);

    const merger = new FrameworkMerger();
    await expect(
      merger.merge({
        projectId: 'proj1',
        tcId: 'TC001',
        locators: {}, pageObjects: {}, actions: {}, businessFunctions: {},
      }),
    ).rejects.toThrow('already locked');

    // Lock should NOT be released (was never acquired)
    expect(mockDb.unlock).not.toHaveBeenCalled();
  });
});
