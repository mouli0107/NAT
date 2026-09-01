import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import {
  fetchStandards, createCustomStandard, deleteCustomStandard,
  setStandardEnabled, toggleAllBuiltins, importStandards,
  type StandardInfo, type CustomStandardInput,
} from '@/lib/codeLensHistoryApi';

const SCOPES = ['all', 'controller', 'service', 'repository', 'dto', 'infrastructure', 'program', 'migration', 'non-migration'];
const EMPTY_FORM: CustomStandardInput = {
  name: '', severity: 'Warning', description: '', whatToLookFor: '', appliesTo: 'all', notApplicableWhen: '',
};

// Friendly group labels for the real `appliesTo` field (single source of truth).
const GROUP_LABELS: Record<string, string> = {
  all: 'All files',
  'non-migration': 'All (excl. migrations)',
  controller: 'Controllers',
  service: 'Services',
  repository: 'Repositories',
  infrastructure: 'Infrastructure / EF',
  dto: 'DTOs & Contracts',
  program: 'Program.cs / Startup',
  migration: 'Migrations',
};

const SEV = {
  Critical: { text: '#dc2626', bg: '#dc262620', border: '#dc262640' },
  Warning:  { text: '#d97706', bg: '#d9770620', border: '#d9770640' },
  Info:     { text: '#80D4FF', bg: '#2563eb15', border: '#2563eb30' },
} as const;

export function StandardsCatalog() {
  const [standards, setStandards] = useState<StandardInfo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [query, setQuery]         = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Add-custom-standard form state
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<CustomStandardInput>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Import-standards state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'augment' | 'replace'>('augment');
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () =>
    fetchStandards()
      .then(d => setStandards(d.standards))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load standards'))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const submitForm = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.whatToLookFor.trim()) {
      setFormError('Name, description, and "what to look for" are required.');
      return;
    }
    setSaving(true); setFormError(null);
    try {
      await createCustomStandard(form);
      setForm(EMPTY_FORM); setShowForm(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create standard');
    } finally {
      setSaving(false);
    }
  };

  // Works for both built-in (per-user disable) and custom standards.
  const toggleEnabled = async (s: StandardInfo) => {
    try { await setStandardEnabled(s.id, s.enabled === false); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  };

  const removeCustom = async (s: StandardInfo) => {
    if (!confirm(`Delete custom standard ${s.id} "${s.name}"? This cannot be undone.`)) return;
    try { await deleteCustomStandard(s.id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const setAllBuiltins = async (enabled: boolean) => {
    try { await toggleAllBuiltins(enabled); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to toggle built-ins'); }
  };

  const onImportFile = async (file: File) => {
    try { setImportText(await file.text()); setImportError(null); }
    catch { setImportError('Could not read that file.'); }
  };

  const submitImport = async () => {
    if (!importText.trim()) { setImportError('Paste or upload your standards first.'); return; }
    setImporting(true); setImportError(null); setImportMsg(null);
    try {
      const r = await importStandards(importText, importMode);
      setImportMsg(
        `Imported ${r.imported} of ${r.parsed} standard(s)` +
        (r.mode === 'replace' ? ` · disabled ${r.builtinsDisabled} built-ins · cleared ${r.clearedCustom} old custom` : '') + '.',
      );
      setImportText('');
      await reload();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const builtinsEnabled = standards.filter(s => !s.custom && s.enabled !== false).length;
  const builtinsTotal   = standards.filter(s => !s.custom).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return standards;
    return standards.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
    );
  }, [standards, query]);

  const groups = useMemo(() => {
    const map = new Map<string, StandardInfo[]>();
    for (const s of filtered) {
      const key = s.appliesTo || 'all';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { Critical: 0, Warning: 0, Info: 0 };
    for (const s of standards) c[s.severity]++;
    return c;
  }, [standards]);

  const toggle = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="rounded-xl border flex flex-col overflow-hidden"
         style={{ background: '#ffffff', borderColor: '#e5e7eb', maxHeight: '78vh' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: '#2563eb' }} />
          <h2 className="text-sm font-bold text-gray-900">What ASTRA checks</h2>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                  style={{ background: '#2563eb22', color: '#2563eb' }}>
              {standards.length} standards
            </span>
          )}
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span style={{ color: SEV.Critical.text }}>● {counts.Critical} Critical</span>
            <span style={{ color: SEV.Warning.text }}>● {counts.Warning} Warning</span>
            <span style={{ color: SEV.Info.text }}>● {counts.Info} Info</span>
          </div>
        )}
        {/* Search + add */}
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search standards…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 outline-none"
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            />
          </div>
          <button
            onClick={() => { setShowImport(v => !v); setImportError(null); setImportMsg(null); }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex-shrink-0"
            style={{ background: '#2563eb', color: '#ffffff' }}
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(null); }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex-shrink-0"
            style={{ background: '#2563eb22', color: '#2563eb', border: '1px solid #2563eb44' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add custom
          </button>
        </div>

        {/* Built-ins enable/disable-all (per user) */}
        {!loading && !error && builtinsTotal > 0 && (
          <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: '#6b7280' }}>
            <span>Built-in standards: <strong style={{ color: '#374151' }}>{builtinsEnabled}/{builtinsTotal}</strong> on</span>
            <button onClick={() => setAllBuiltins(true)} className="font-semibold" style={{ color: '#2563eb' }}>Enable all</button>
            <span>·</span>
            <button onClick={() => setAllBuiltins(false)} className="font-semibold" style={{ color: '#6b7280' }}>Disable all</button>
            <span className="ml-1" style={{ color: '#9ca3af' }}>(use "Disable all" + Import → your standards only)</span>
          </div>
        )}

        {/* Import standards panel */}
        {showImport && (
          <div className="mt-2 rounded-lg p-3 space-y-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div className="text-[11px] font-semibold text-gray-900">Import your coding standards</div>
            <div className="text-[10px]" style={{ color: '#6b7280' }}>
              Paste your standards (any format — a list, a policy doc, JSON) or upload a text file. They become your own custom standards.
            </div>
            <textarea
              value={importText} onChange={e => setImportText(e.target.value)}
              placeholder="Paste your coding standards here…"
              rows={6} className="w-full rounded px-2 py-1.5 text-xs text-gray-900 outline-none font-mono"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px]"
                style={{ background: '#ffffff', color: '#374151', border: '1px dashed #cbd5e1' }}>
                <Upload className="w-3 h-3" /> Upload file
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.json,.csv,.yaml,.yml,.text"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ''; }} />
              <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: '#374151' }}>
                <input type="radio" checked={importMode === 'augment'} onChange={() => setImportMode('augment')} /> Add to existing
              </label>
              <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: '#374151' }}>
                <input type="radio" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace all (disable built-ins + clear custom)
              </label>
            </div>
            {importError && <div className="text-[11px]" style={{ color: '#dc2626' }}>{importError}</div>}
            {importMsg && <div className="text-[11px]" style={{ color: '#059669' }}>{importMsg}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowImport(false); setImportText(''); setImportError(null); setImportMsg(null); }}
                className="text-xs px-2 py-1" style={{ color: '#6b7280' }}>Close</button>
              <button onClick={submitImport} disabled={importing || !importText.trim()}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded"
                style={{ background: importText.trim() ? '#2563eb' : '#e5e7eb', color: importText.trim() ? '#ffffff' : '#9ca3af' }}>
                {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {importing ? 'Parsing…' : 'Import standards'}
              </button>
            </div>
          </div>
        )}

        {/* Add custom standard form */}
        {showForm && (
          <div className="mt-2 rounded-lg p-3 space-y-2" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <input
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Standard name (e.g. No Console.WriteLine)"
              className="w-full rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            />
            <div className="flex gap-2">
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as CustomStandardInput['severity'] })}
                      className="flex-1 rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
                <option>Critical</option><option>Warning</option><option>Info</option>
              </select>
              <select value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value })}
                      className="flex-1 rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
                {SCOPES.map(s => <option key={s} value={s}>{GROUP_LABELS[s] ?? s}</option>)}
              </select>
            </div>
            <textarea
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description — what the rule requires (shown to the user + model)"
              rows={2} className="w-full rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            />
            <textarea
              value={form.whatToLookFor} onChange={e => setForm({ ...form, whatToLookFor: e.target.value })}
              placeholder="What to look for — concrete patterns the auditor should hunt for"
              rows={2} className="w-full rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            />
            <input
              value={form.notApplicableWhen} onChange={e => setForm({ ...form, notApplicableWhen: e.target.value })}
              placeholder="Not applicable when… (optional)"
              className="w-full rounded px-2 py-1.5 text-xs text-gray-900 outline-none" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            />
            {formError && <div className="text-[11px]" style={{ color: '#dc2626' }}>{formError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
                      className="text-xs px-2 py-1" style={{ color: '#6b7280' }}>Cancel</button>
              <button onClick={submitForm} disabled={saving}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded"
                      style={{ background: '#2563eb', color: '#f9fafb' }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add standard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12" style={{ color: '#9ca3af' }}>
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading standards…
          </div>
        )}
        {error && (
          <div className="px-4 py-6 text-xs text-center" style={{ color: '#dc2626' }}>{error}</div>
        )}
        {!loading && !error && groups.map(([key, items]) => {
          const isCollapsed = collapsed.has(key);
          return (
            <div key={key} className="border-b" style={{ borderColor: '#e5e7eb40' }}>
              <button
                onClick={() => toggle(key)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold"
                style={{ color: '#374151', background: '#f9fafb' }}
              >
                <span className="flex items-center gap-1.5">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {GROUP_LABELS[key] ?? key}
                </span>
                <span style={{ color: '#9ca3af' }}>{items.length}</span>
              </button>
              {!isCollapsed && items.map(s => {
                const sev = SEV[s.severity];
                const disabled = s.enabled === false;
                return (
                  <div key={s.id} className="px-4 py-1.5 flex items-center gap-2 cursor-default hover:bg-[#f9fafb]"
                       style={{ borderTop: '1px solid #e5e7eb20', opacity: disabled ? 0.45 : 1 }}
                       title={s.description}>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {s.id}
                    </span>
                    <span className="text-xs font-medium text-gray-900 truncate flex-1">{s.name}</span>
                    {s.custom && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#05966922', color: '#059669' }}>CUSTOM</span>
                    )}
                    {/* Per-user enable/disable — works for built-in and custom */}
                    <button onClick={() => toggleEnabled(s)} title={disabled ? 'Enable for me' : 'Disable for me'}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#e5e7eb', color: disabled ? '#6b7280' : '#059669' }}>
                      {disabled ? 'Off' : 'On'}
                    </button>
                    {s.custom && (
                      <button onClick={() => removeCustom(s)} title="Delete custom standard"
                              className="flex-shrink-0" style={{ color: '#dc2626' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {!loading && !error && groups.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: '#9ca3af' }}>
            No standards match “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}
