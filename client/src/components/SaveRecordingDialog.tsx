// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 5: SaveRecordingDialog
// client/src/components/SaveRecordingDialog.tsx
//
// Modal dialog for saving a completed recording into the merger engine.
// Steps:
//   1. User picks project, module, feature, TC name
//   2. POST /api/projects/:id/framework/recordings
//   3. On success → navigate to /test-library?highlight=TC-NNN
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
}

interface FrameworkFeature {
  id: string;
  name: string;
}

interface FrameworkModule {
  id: string;
  name: string;
  features: FrameworkFeature[];
}

interface MergeResult {
  success: boolean;
  tcSequence: string;
  totalAdded: number;
  totalSkipped: number;
  totalConflicts: number;
}

export interface SaveRecordingDialogProps {
  isOpen: boolean;
  /** The generated Playwright spec content */
  generatedScript: string;
  /** Natural-language step descriptions (used to build spec header comments) */
  nlSteps: string[];
  /** Called after a successful save with the merge result */
  onSave: (result: MergeResult) => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Optional pre-fill for the test case name */
  defaultTcName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SaveRecordingDialog({
  isOpen,
  generatedScript,
  nlSteps,
  onSave,
  onCancel,
  defaultTcName = '',
}: SaveRecordingDialogProps) {
  const [, navigate] = useLocation();

  // ── Form state ───────────────────────────────────────────────────────────
  const [projects, setProjects]       = useState<Project[]>([]);
  const [projectId, setProjectId]     = useState<string>('');
  const [modules, setModules]         = useState<FrameworkModule[]>([]);
  const [moduleId, setModuleId]       = useState<string>('');
  const [moduleName, setModuleName]   = useState<string>('');
  const [featureId, setFeatureId]     = useState<string>('');
  const [featureName, setFeatureName] = useState<string>('');
  const [newModuleName, setNewModuleName] = useState<string>('');
  const [newFeatureName, setNewFeatureName] = useState<string>('');
  const [tcName, setTcName]           = useState(defaultTcName);
  const [nextSequence, setNextSequence] = useState<string>('TC-001');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingModules, setLoadingModules]   = useState(false);
  const [loadingSequence, setLoadingSequence] = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [saved, setSaved]                     = useState(false);
  const [savedResult, setSavedResult]         = useState<MergeResult | null>(null);

  // ── Load projects on open ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    setSavedResult(null);
    setError(null);
    setTcName(defaultTcName);

    setLoadingProjects(true);
    fetch('/api/projects', { credentials: 'include' })
      .then(r => r.json())
      .then((data: Project[]) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [isOpen, defaultTcName]);

  // ── Load modules + next sequence when project changes ────────────────────
  const loadModulesAndSequence = useCallback(async (pid: string) => {
    if (!pid) { setModules([]); setNextSequence('TC-001'); return; }
    setLoadingModules(true);
    setLoadingSequence(true);
    try {
      const [treeRes, seqRes] = await Promise.all([
        fetch(`/api/projects/${pid}/framework/tree`, { credentials: 'include' }),
        fetch(`/api/projects/${pid}/framework/next-sequence`, { credentials: 'include' }),
      ]);
      if (treeRes.ok) {
        const tree = await treeRes.json();
        setModules(Array.isArray(tree.modules) ? tree.modules : []);
      }
      if (seqRes.ok) {
        const seq = await seqRes.json();
        setNextSequence(seq.nextSequence ?? 'TC-001');
      }
    } catch {
      setModules([]);
    } finally {
      setLoadingModules(false);
      setLoadingSequence(false);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setModuleId('');
    setModuleName('');
    setFeatureId('');
    setFeatureName('');
    setNewModuleName('');
    setNewFeatureName('');
    loadModulesAndSequence(projectId);
  }, [projectId, loadModulesAndSequence]);

  // ── Derived: selected module's features ─────────────────────────────────
  const selectedModule = modules.find(m => m.id === moduleId);
  const features = selectedModule?.features ?? [];

  // ── Handle save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!projectId) { setError('Please select a project.'); return; }
    const resolvedModuleName  = moduleId === '__new__' ? newModuleName.trim()  : moduleName;
    const resolvedFeatureName = featureId === '__new__' ? newFeatureName.trim() : featureName;

    if (!resolvedModuleName)  { setError('Please select or enter a module name.');  return; }
    if (!resolvedFeatureName) { setError('Please select or enter a feature name.'); return; }
    if (!tcName.trim())       { setError('Please enter a test case name.'); return; }

    setError(null);
    setSaving(true);

    try {
      // Build the spec content — preserve whatever the generator produced
      const specContent = generatedScript.trim()
        ? generatedScript
        : `import { test } from '@playwright/test';\n\ntest('${tcName.trim()}', async ({ page }) => {\n  // Steps:\n${nlSteps.map(s => `  // ${s}`).join('\n')}\n});\n`;

      const body = {
        tcId:              nextSequence,
        locators:          {},
        pageObjects:       {},
        actions:           {},
        businessFunctions: {},
        genericUtils:      [],
        fixtures:          [],
        spec: {
          tcSequence:  nextSequence,
          tcName:      tcName.trim(),
          moduleName:  resolvedModuleName,
          featureName: resolvedFeatureName,
          content:     specContent,
          recordedBy:  'recorder',
          sourceTcIds: [nextSequence],
        },
      };

      const res = await fetch(`/api/projects/${projectId}/framework/recordings`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Save failed (${res.status})`);
      }

      const result: MergeResult = await res.json();
      setSavedResult(result);
      setSaved(true);
      onSave(result);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Navigate to Test Library ─────────────────────────────────────────────
  const openTestLibrary = () => {
    if (savedResult) {
      navigate(`/test-library?highlight=${savedResult.tcSequence}`);
    } else {
      navigate('/test-library');
    }
  };

  // ── Render nothing when closed ───────────────────────────────────────────
  if (!isOpen) return null;

  // ── Success state ────────────────────────────────────────────────────────
  if (saved && savedResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <div className="text-lg font-bold text-emerald-700 mb-1">
              {savedResult.tcSequence} saved!
            </div>
            <div className="text-sm text-slate-500 mb-2">
              {savedResult.totalAdded} asset{savedResult.totalAdded !== 1 ? 's' : ''} added
              {savedResult.totalConflicts > 0 && (
                <span className="text-amber-500 ml-2">· {savedResult.totalConflicts} conflict{savedResult.totalConflicts !== 1 ? 's' : ''} flagged</span>
              )}
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={openTestLibrary}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                View in Test Library →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base">📤</div>
            <div>
              <div className="text-sm font-bold text-slate-800">Save to Framework</div>
              <div className="text-[11px] text-slate-400">Merge recording into the merger engine</div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Project */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Project</label>
            {loadingProjects ? (
              <div className="text-xs text-slate-400">Loading projects…</div>
            ) : (
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">— select project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Module */}
          {projectId && (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Module</label>
              {loadingModules ? (
                <div className="text-xs text-slate-400">Loading modules…</div>
              ) : (
                <>
                  <select
                    value={moduleId}
                    onChange={e => {
                      const val = e.target.value;
                      setModuleId(val);
                      if (val && val !== '__new__') {
                        const mod = modules.find(m => m.id === val);
                        setModuleName(mod?.name ?? '');
                      } else if (val === '__new__') {
                        setModuleName('');
                      }
                      setFeatureId('');
                      setFeatureName('');
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    <option value="">— select module —</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    <option value="__new__">＋ New module…</option>
                  </select>
                  {moduleId === '__new__' && (
                    <input
                      value={newModuleName}
                      onChange={e => setNewModuleName(e.target.value)}
                      placeholder="Module name (e.g. Login)"
                      className="mt-2 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Feature */}
          {moduleId && (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Feature</label>
              <select
                value={featureId}
                onChange={e => {
                  const val = e.target.value;
                  setFeatureId(val);
                  if (val && val !== '__new__') {
                    const feat = features.find(f => f.id === val);
                    setFeatureName(feat?.name ?? '');
                  } else if (val === '__new__') {
                    setFeatureName('');
                  }
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">— select feature —</option>
                {features.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                <option value="__new__">＋ New feature…</option>
              </select>
              {featureId === '__new__' && (
                <input
                  value={newFeatureName}
                  onChange={e => setNewFeatureName(e.target.value)}
                  placeholder="Feature name (e.g. HappyPath)"
                  className="mt-2 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}
            </div>
          )}

          {/* TC Name */}
          {moduleId && featureId && (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Test Case Name
                {loadingSequence ? (
                  <span className="ml-2 font-normal text-slate-400">Loading sequence…</span>
                ) : (
                  <span className="ml-2 font-mono text-indigo-500 font-normal">{nextSequence}</span>
                )}
              </label>
              <input
                value={tcName}
                onChange={e => setTcName(e.target.value)}
                placeholder="e.g. Login with valid credentials"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {/* Steps preview */}
          {nlSteps.length > 0 && moduleId && featureId && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 max-h-28 overflow-y-auto">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                {nlSteps.length} recorded step{nlSteps.length !== 1 ? 's' : ''}
              </div>
              {nlSteps.slice(0, 6).map((s, i) => (
                <div key={i} className="text-[11px] text-slate-600 leading-5">
                  <span className="text-slate-300 mr-1">{i + 1}.</span>{s}
                </div>
              ))}
              {nlSteps.length > 6 && (
                <div className="text-[10px] text-slate-400 mt-1">…and {nlSteps.length - 6} more</div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !projectId || !moduleId || !featureId || !tcName.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Merging…
              </>
            ) : (
              '📤 Save to Framework'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
