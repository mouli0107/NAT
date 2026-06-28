import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  fetchStandards, createCustomStandard, updateCustomStandard, deleteCustomStandard,
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
  Critical: { text: '#FF8080', bg: '#FF444420', border: '#FF444440' },
  Warning:  { text: '#FFC080', bg: '#FFA50020', border: '#FFA50040' },
  Info:     { text: '#80D4FF', bg: '#00BFFF15', border: '#00BFFF30' },
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

  const toggleEnabled = async (s: StandardInfo) => {
    try { await updateCustomStandard(s.id, { enabled: !s.enabled }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  };

  const removeCustom = async (s: StandardInfo) => {
    if (!confirm(`Delete custom standard ${s.id} "${s.name}"? This cannot be undone.`)) return;
    try { await deleteCustomStandard(s.id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  };

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
         style={{ background: '#0D1F3C', borderColor: '#1E3A5F', maxHeight: '78vh' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#1E3A5F' }}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: '#00BFFF' }} />
          <h2 className="text-sm font-bold text-white">What ASTRA checks</h2>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                  style={{ background: '#00BFFF22', color: '#00BFFF' }}>
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
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#4A6A8A' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search standards…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none"
              style={{ background: '#0A1628', border: '1px solid #1E3A5F' }}
            />
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(null); }}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex-shrink-0"
            style={{ background: '#00BFFF22', color: '#00BFFF', border: '1px solid #00BFFF44' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add custom
          </button>
        </div>

        {/* Add custom standard form */}
        {showForm && (
          <div className="mt-2 rounded-lg p-3 space-y-2" style={{ background: '#0A1628', border: '1px solid #1E3A5F' }}>
            <input
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Standard name (e.g. No Console.WriteLine)"
              className="w-full rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}
            />
            <div className="flex gap-2">
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as CustomStandardInput['severity'] })}
                      className="flex-1 rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}>
                <option>Critical</option><option>Warning</option><option>Info</option>
              </select>
              <select value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value })}
                      className="flex-1 rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}>
                {SCOPES.map(s => <option key={s} value={s}>{GROUP_LABELS[s] ?? s}</option>)}
              </select>
            </div>
            <textarea
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description — what the rule requires (shown to the user + model)"
              rows={2} className="w-full rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}
            />
            <textarea
              value={form.whatToLookFor} onChange={e => setForm({ ...form, whatToLookFor: e.target.value })}
              placeholder="What to look for — concrete patterns the auditor should hunt for"
              rows={2} className="w-full rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}
            />
            <input
              value={form.notApplicableWhen} onChange={e => setForm({ ...form, notApplicableWhen: e.target.value })}
              placeholder="Not applicable when… (optional)"
              className="w-full rounded px-2 py-1.5 text-xs text-white outline-none" style={{ background: '#0D1F3C', border: '1px solid #1E3A5F' }}
            />
            {formError && <div className="text-[11px]" style={{ color: '#FF8080' }}>{formError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
                      className="text-xs px-2 py-1" style={{ color: '#7A9CC0' }}>Cancel</button>
              <button onClick={submitForm} disabled={saving}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded"
                      style={{ background: '#00BFFF', color: '#0A1628' }}>
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
          <div className="flex items-center justify-center py-12" style={{ color: '#4A6A8A' }}>
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading standards…
          </div>
        )}
        {error && (
          <div className="px-4 py-6 text-xs text-center" style={{ color: '#FF8080' }}>{error}</div>
        )}
        {!loading && !error && groups.map(([key, items]) => {
          const isCollapsed = collapsed.has(key);
          return (
            <div key={key} className="border-b" style={{ borderColor: '#1E3A5F40' }}>
              <button
                onClick={() => toggle(key)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold"
                style={{ color: '#A0C0D8', background: '#0A1628' }}
              >
                <span className="flex items-center gap-1.5">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {GROUP_LABELS[key] ?? key}
                </span>
                <span style={{ color: '#4A6A8A' }}>{items.length}</span>
              </button>
              {!isCollapsed && items.map(s => {
                const sev = SEV[s.severity];
                const disabled = s.custom && s.enabled === false;
                return (
                  <div key={s.id} className="px-4 py-1.5 flex items-center gap-2 cursor-default hover:bg-[#0A1628]"
                       style={{ borderTop: '1px solid #1E3A5F20', opacity: disabled ? 0.5 : 1 }}
                       title={s.description}>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {s.id}
                    </span>
                    <span className="text-xs font-medium text-white truncate flex-1">{s.name}</span>
                    {s.custom && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#00C89622', color: '#00C896' }}>CUSTOM</span>
                    )}
                    {s.custom ? (
                      <>
                        <button onClick={() => toggleEnabled(s)} title={s.enabled === false ? 'Enable' : 'Disable'}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: '#1E3A5F', color: s.enabled === false ? '#7A9CC0' : '#00C896' }}>
                          {s.enabled === false ? 'Off' : 'On'}
                        </button>
                        <button onClick={() => removeCustom(s)} title="Delete custom standard"
                                className="flex-shrink-0" style={{ color: '#FF8080' }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sev.text }}
                            title={s.severity} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {!loading && !error && groups.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: '#4A6A8A' }}>
            No standards match “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}
