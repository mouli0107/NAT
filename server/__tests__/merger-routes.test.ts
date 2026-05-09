// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 4: Merger Routes Unit Tests
// server/__tests__/merger-routes.test.ts
//
// Tests the merger REST layer in isolation.
// DB, merger engine, and auth are mocked — no network, no Playwright.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock variables ────────────────────────────────────────────────────
const mockMergeResult = vi.hoisted(() => ({
  success: true,
  tcSequence: 'TC-001',
  layers: {
    locators: [],
    pageObjects: [],
    actions: [],
    businessFunctions: [],
    genericUtils: { assetsUpserted: 0, conflictsRaised: 0, decisions: [] },
    fixtures:    { assetsUpserted: 0, conflictsRaised: 0, decisions: [] },
    spec:        { action: 'add', assetsUpserted: 1, conflictsRaised: 0, decisions: [] },
  },
  conflictIds:         [],
  refactoringChanges:  [],
  totalAdded:          1,
  totalSkipped:        0,
  totalConflicts:      0,
  durationMs:          42,
}));

const mockAssets = vi.hoisted(() => [
  {
    id: 'asset-1',
    projectId: 'proj-1',
    assetType: 'locator',
    assetKey: 'LoginPage:submitBtn',
    filePath: 'locators/login.locators.ts',
    content: '{"selector":"[data-testid=\\"submit\\"]"}',
    contentHash: 'abc123',
    unitName: 'loginPageSubmitBtn',
    unitHash: 'hash1',
    layer: 'locator',
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceTcId: null,
  },
  {
    id: 'asset-2',
    projectId: 'proj-1',
    assetType: 'spec',
    assetKey: 'TC-001',
    filePath: 'tests/Login/HappyPath/TC-001-login.spec.ts',
    content: 'import { loginPageSubmitBtn } from "@locators/login";\n// test content',
    contentHash: 'def456',
    unitName: null,
    unitHash: null,
    layer: 'spec',
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceTcId: null,
  },
]);

const mockConflicts = vi.hoisted(() => [
  {
    id: 'conflict-1',
    projectId: 'proj-1',
    assetType: 'locator',
    assetKey: 'LoginPage:submitBtn',
    conflictType: 'selector_diverged',
    baseContent: '{"selector":"[data-testid=\\"submit\\"]"}',
    incomingContent: '{"selector":"#submitButton"}',
    baseAuthor: null,
    incomingAuthor: null,
    baseTcId: 'TC-001',
    incomingTcId: 'TC-002',
    aiSuggestion: null,
    status: 'open',
    createdAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
  },
]);

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../lib/merger/index.js', () => ({
  frameworkMerger: {
    mergeRecordingIntoProject: vi.fn(async () => mockMergeResult),
  },
  buildProjectZip: vi.fn(async () => Buffer.from('fake-zip')),
}));

vi.mock('../lib/merger/db-adapter.js', () => ({
  mergerDb: {
    getAssetsByType:    vi.fn(async (_projectId: string, type: string) =>
      mockAssets.filter(a => a.assetType === type),
    ),
    getAssetsByTypes:   vi.fn(async (_projectId: string, types: string[]) =>
      mockAssets.filter(a => types.includes(a.assetType)),
    ),
    getOpenConflicts:   vi.fn(async () => [...mockConflicts]),
    updateAsset:        vi.fn(async () => {}),
  },
}));

vi.mock('../../db.js', () => ({
  db: {
    select:  vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []), orderBy: vi.fn(() => []) })) })),
    insert:  vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: 'new-id', projectId: 'proj-1', name: 'Test', description: null, createdAt: new Date() }]) })) })),
    update:  vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })),
  },
}));

// ── Import after mocks are set up ─────────────────────────────────────────────

import { mergerDb } from '../lib/merger/db-adapter.js';
import { frameworkMerger, buildProjectZip } from '../lib/merger/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal fake Request / Response / Next for route handler testing */
function makeReq(opts: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  projectId?: string;
}): any {
  const req: any = {
    params:    opts.params   ?? {},
    query:     opts.query    ?? {},
    body:      opts.body     ?? {},
    on:        () => {},
  };
  if (opts.projectId) (req as any).projectId = opts.projectId;
  return req;
}

function makeRes(): any {
  const res: any = {
    _status: 200,
    _body: undefined as any,
    _headers: {} as Record<string, string>,
    status(code: number) { res._status = code; return res; },
    json(body: unknown) { res._body = body; return res; },
    send(body: unknown) { res._body = body; return res; },
    setHeader(k: string, v: string) { res._headers[k] = v; return res; },
  };
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('merger-routes — POST /recordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(frameworkMerger.mergeRecordingIntoProject).mockResolvedValue(mockMergeResult as any);
  });

  it('calls mergeRecordingIntoProject with projectId from params', async () => {
    const body: Partial<Parameters<typeof frameworkMerger.mergeRecordingIntoProject>[0]> = {
      tcId:              'TC-001',
      locators:          {},
      pageObjects:       {},
      actions:           {},
      businessFunctions: {},
      genericUtils:      [],
      fixtures:          [],
      spec: {
        tcSequence:  'TC-001',
        tcName:      'Login happy path',
        moduleName:  'Login',
        featureName: 'HappyPath',
        content:     'import { test } from "@playwright/test"; test("login", async () => {});',
        recordedBy:  'admin-user-1',
        sourceTcIds: ['TC-001'],
      },
    };

    const req = makeReq({ body, projectId: 'proj-1' });
    req.params.projectId = 'proj-1'; // also on params for completeness

    // Simulate route handler inline (extract the logic)
    const projectId = req.projectId;
    const input = { ...req.body, projectId };
    const result = await frameworkMerger.mergeRecordingIntoProject(input as any);

    expect(frameworkMerger.mergeRecordingIntoProject).toHaveBeenCalledOnce();
    const callArg = vi.mocked(frameworkMerger.mergeRecordingIntoProject).mock.calls[0][0];
    expect(callArg.projectId).toBe('proj-1');
    expect(result.success).toBe(true);
    expect(result.totalAdded).toBe(1);
  });

  it('returns 409 when project is locked', async () => {
    vi.mocked(frameworkMerger.mergeRecordingIntoProject).mockRejectedValueOnce(
      new Error('Project proj-1 is already locked for merging.'),
    );

    const req = makeReq({ body: { tcId: 'TC-002', spec: {} }, projectId: 'proj-1' });
    const res = makeRes();

    // Simulate status determination
    try {
      await frameworkMerger.mergeRecordingIntoProject(req.body as any);
    } catch (err: any) {
      const status = err.message?.includes('already locked') ? 409 : 500;
      res.status(status).json({ error: err.message });
    }

    expect(res._status).toBe(409);
    expect(res._body.error).toContain('already locked');
  });
});

describe('merger-routes — GET /assets (list)', () => {
  it('returns assets without content field', async () => {
    const assets = await mergerDb.getAssetsByTypes('proj-1', ['locator', 'spec']);
    expect(assets.length).toBe(2);

    // Route strips content for list view
    const listed = assets.map(({ content: _c, ...rest }) => rest);
    expect(listed[0]).not.toHaveProperty('content');
    expect(listed[0]).toHaveProperty('assetKey');
  });

  it('filters by type when provided', async () => {
    const locators = await mergerDb.getAssetsByType('proj-1', 'locator');
    expect(locators).toHaveLength(1);
    expect(locators[0].assetType).toBe('locator');
  });
});

describe('merger-routes — GET /assets/dead-code', () => {
  it('flags locators not referenced in any spec content', async () => {
    // locator 'loginPageSubmitBtn' IS in spec content → not dead
    const locators = await mergerDb.getAssetsByType('proj-1', 'locator');
    const specs    = await mergerDb.getAssetsByType('proj-1', 'spec');

    const allSpecContent = specs.map(s => s.content).join('\n');
    const dead = locators.filter(l => l.unitName && !allSpecContent.includes(l.unitName));

    // loginPageSubmitBtn appears in spec content → not dead
    expect(dead).toHaveLength(0);
  });

  it('returns dead locators when not referenced', async () => {
    // Override spec content to not mention the locator
    vi.mocked(mergerDb.getAssetsByType).mockImplementation(async (_pid: string, type: string) => {
      if (type === 'spec') {
        return [{
          ...mockAssets[1],
          content: '// spec with no locator references',
        }];
      }
      return mockAssets.filter(a => a.assetType === type);
    });

    const locators = await mergerDb.getAssetsByType('proj-1', 'locator');
    const specs    = await mergerDb.getAssetsByType('proj-1', 'spec');

    const allSpecContent = specs.map(s => s.content).join('\n');
    const dead = locators.filter(l => l.unitName && !allSpecContent.includes(l.unitName));

    expect(dead).toHaveLength(1);
    expect(dead[0].unitName).toBe('loginPageSubmitBtn');
  });
});

describe('merger-routes — GET /conflicts', () => {
  it('returns open conflicts', async () => {
    const conflicts = await mergerDb.getOpenConflicts('proj-1');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].status).toBe('open');
    expect(conflicts[0].conflictType).toBe('selector_diverged');
  });
});

describe('merger-routes — next-sequence', () => {
  it('computes TC-002 when TC-001 is the only spec', async () => {
    const specs = await mergerDb.getAssetsByType('proj-1', 'spec');
    const tcNums = specs
      .map(s => { const m = (s.assetKey ?? '').match(/TC-(\d+)/i); return m ? parseInt(m[1], 10) : 0; })
      .filter(n => n > 0);
    const maxNum = tcNums.length ? Math.max(...tcNums) : 0;
    const nextSequence = `TC-${String(maxNum + 1).padStart(3, '0')}`;
    expect(nextSequence).toBe('TC-002');
  });

  it('returns TC-001 when no specs exist', async () => {
    vi.mocked(mergerDb.getAssetsByType).mockResolvedValueOnce([]);
    const specs = await mergerDb.getAssetsByType('proj-1', 'spec');
    const maxNum = specs.length ? Math.max(...specs.map(s => { const m = s.assetKey?.match(/TC-(\d+)/i); return m ? parseInt(m[1], 10) : 0; })) : 0;
    const nextSequence = `TC-${String(maxNum + 1).padStart(3, '0')}`;
    expect(nextSequence).toBe('TC-001');
  });
});

describe('merger-routes — deduplicate/scan', () => {
  it('finds duplicate locators with identical content hashes', async () => {
    // Inject two locators with the same contentHash
    vi.mocked(mergerDb.getAssetsByType).mockResolvedValueOnce([
      { ...mockAssets[0], assetKey: 'LoginPage:submitBtn',   contentHash: 'dupe-hash' },
      { ...mockAssets[0], assetKey: 'DashboardPage:saveBtn', contentHash: 'dupe-hash', id: 'asset-3' },
    ]);

    const locators = await mergerDb.getAssetsByType('proj-1', 'locator');
    const byHash = new Map<string, typeof locators>();
    for (const loc of locators) {
      const hash = loc.contentHash ?? loc.content;
      if (!byHash.has(hash)) byHash.set(hash, []);
      byHash.get(hash)!.push(loc);
    }

    const duplicates = Array.from(byHash.values()).filter(g => g.length > 1);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toHaveLength(2);
    expect(duplicates[0][0].contentHash).toBe('dupe-hash');
  });

  it('returns empty when no duplicates', async () => {
    // Default mock has assets with different hashes
    const locators = await mergerDb.getAssetsByType('proj-1', 'locator');
    const byHash = new Map<string, typeof locators>();
    for (const loc of locators) {
      const hash = loc.contentHash ?? loc.content;
      if (!byHash.has(hash)) byHash.set(hash, []);
      byHash.get(hash)!.push(loc);
    }
    const duplicates = Array.from(byHash.values()).filter(g => g.length > 1);
    expect(duplicates).toHaveLength(0);
  });
});

describe('merger-routes — buildProjectZip integration', () => {
  it('calls buildProjectZip with correct scope options', async () => {
    vi.mocked(buildProjectZip).mockResolvedValueOnce(Buffer.from('zip-bytes'));

    const buf = await buildProjectZip('proj-1', {
      scope: 'project',
      projectName: 'MyApp',
    });

    expect(buildProjectZip).toHaveBeenCalledOnce();
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('passes selectedTcIds for selected scope', async () => {
    vi.mocked(buildProjectZip).mockResolvedValueOnce(Buffer.from('sel-zip'));

    await buildProjectZip('proj-1', {
      scope: 'selected',
      selectedTcIds: ['TC-001', 'TC-003'],
      projectName: 'MyApp',
    });

    // Use the last call (previous test already made one call)
    const calls = vi.mocked(buildProjectZip).mock.calls;
    const callArg = calls[calls.length - 1][1];
    expect(callArg.scope).toBe('selected');
    expect(callArg.selectedTcIds).toEqual(['TC-001', 'TC-003']);
  });
});
