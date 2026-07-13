import { useEffect, useState } from 'react';
import { Clock, GitPullRequest, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  listSchedules, createSchedule, setScheduleEnabled, deleteSchedule,
  listPrPolicies, savePrPolicy,
  type ScheduleDto, type PrPolicyDto, type LoopGoalPolicy,
} from '@/lib/codeLensApi';

const CARD = { background: '#0D1F3C', border: '1px solid #1E3A5F' } as const;
const INPUT = { background: '#0A1628', border: '1px solid #1E3A5F', color: '#CFE0F0' } as const;
const label = { color: '#7A9CC0' } as const;

function cadenceText(c: ScheduleDto['cadence']): string {
  return c.type === 'interval'
    ? `every ${c.minutes} min`
    : `daily at ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')} UTC`;
}

export function AutomationPanel() {
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [policies, setPolicies]   = useState<PrPolicyDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState<string | null>(null);

  // New schedule form
  const [sRepo, setSRepo]       = useState('');
  const [sBranch, setSBranch]   = useState('main');
  const [sMode, setSMode]       = useState<'review' | 'conform'>('review');
  const [sPolicy, setSPolicy]   = useState<LoopGoalPolicy>('full_coverage');
  const [sInterval, setSInterval] = useState(1440);
  const [saving, setSaving]     = useState(false);

  // New/updated PR policy form
  const [pRepo, setPRepo]       = useState('');
  const [pEnabled, setPEnabled] = useState(true);
  const [pBase, setPBase]       = useState('main,staging');
  const [pMode, setPMode]       = useState<'review' | 'conform'>('review');
  const [pBlocking, setPBlocking] = useState(false);
  const [pPush, setPPush]       = useState<'companion-pr' | 'direct-to-head'>('companion-pr');
  const [savingP, setSavingP]   = useState(false);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const [s, p] = await Promise.all([listSchedules(), listPrPolicies()]);
      setSchedules(s); setPolicies(p);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function addSchedule() {
    if (!sRepo.trim()) return;
    setSaving(true);
    try {
      await createSchedule({
        repoUrl: sRepo.trim(), branch: sBranch.trim(), mode: sMode, policy: sPolicy,
        cadence: { type: 'interval', minutes: Number(sInterval) },
      });
      setSRepo('');
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to create schedule'); }
    finally { setSaving(false); }
  }

  async function savePolicy() {
    if (!/^[^/]+\/[^/]+$/.test(pRepo.trim())) { setErr('PR policy repo must be "owner/repo"'); return; }
    setSavingP(true);
    try {
      await savePrPolicy({
        repoFullName: pRepo.trim(), enabled: pEnabled, baseBranchPattern: pBase.trim(),
        mode: pMode, blocking: pBlocking, pushMode: pPush,
      });
      setPRepo('');
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save policy'); }
    finally { setSavingP(false); }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 space-y-6" data-testid="automation-panel">
      {err && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #FF4444', color: '#FF8080' }}>
          {err}
        </div>
      )}

      {/* Scheduled loops */}
      <section className="rounded-xl p-4" style={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" style={{ color: '#00BFFF' }} />
          <h2 className="text-sm font-bold" style={{ color: '#CFE0F0' }}>Scheduled runs</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs" style={label}><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>
        ) : schedules.length === 0 ? (
          <div className="text-xs" style={label}>No schedules yet.</div>
        ) : (
          <ul className="space-y-2 mb-4">
            {schedules.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#0A1628' }}>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold" style={{ color: '#CFE0F0' }}>{s.repoUrl}</div>
                  <div className="text-[11px]" style={label}>
                    {s.branch} · {s.mode} · {cadenceText(s.cadence)}
                    {s.lastRunAt ? ` · last ${new Date(s.lastRunAt).toISOString().slice(0, 16).replace('T', ' ')}` : ' · never run'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setScheduleEnabled(s.id, !s.enabled).then(refresh)}
                    className="rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: s.enabled ? 'rgba(0,255,150,0.12)' : '#1E3A5F', color: s.enabled ? '#3Fe0a0' : '#7A9CC0' }}
                  >
                    {s.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => deleteSchedule(s.id).then(refresh)} title="Delete" style={{ color: '#FF8080' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input placeholder="repo URL" value={sRepo} onChange={e => setSRepo(e.target.value)} className="col-span-2 rounded-lg px-3 py-2 text-sm" style={INPUT} data-testid="sched-repo" />
          <input placeholder="branch" value={sBranch} onChange={e => setSBranch(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={INPUT} />
          <input type="number" placeholder="interval (min)" value={sInterval} onChange={e => setSInterval(Number(e.target.value))} className="rounded-lg px-3 py-2 text-sm" style={INPUT} />
          <select value={sMode} onChange={e => setSMode(e.target.value as any)} className="rounded-lg px-3 py-2 text-sm" style={INPUT}>
            <option value="review">Review</option>
            <option value="conform">Conform</option>
          </select>
          <select value={sPolicy} onChange={e => setSPolicy(e.target.value as LoopGoalPolicy)} className="rounded-lg px-3 py-2 text-sm" style={INPUT}>
            <option value="full_coverage">Full coverage</option>
            <option value="zero_blocker">Zero blockers</option>
            <option value="zero_blocker_full_coverage">Zero blockers + coverage</option>
          </select>
          <button onClick={addSchedule} disabled={saving} className="col-span-2 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold" style={{ background: '#00BFFF', color: '#0A1628' }} data-testid="sched-add">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add schedule
          </button>
        </div>
      </section>

      {/* PR trigger policies */}
      <section className="rounded-xl p-4" style={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <GitPullRequest className="w-4 h-4" style={{ color: '#00BFFF' }} />
          <h2 className="text-sm font-bold" style={{ color: '#CFE0F0' }}>Pull-request triggers</h2>
        </div>

        {!loading && policies.length > 0 && (
          <ul className="space-y-2 mb-4">
            {policies.map(p => (
              <li key={p.repoFullName} className="rounded-lg px-3 py-2 text-[11px]" style={{ background: '#0A1628', color: '#CFE0F0' }}>
                <span className="font-semibold">{p.repoFullName}</span>
                <span style={label}> · base {p.baseBranchPattern} · {p.mode} · {p.blocking ? 'blocking' : 'advisory'} · {p.pushMode} · {p.enabled ? 'on' : 'off'}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input placeholder="owner/repo" value={pRepo} onChange={e => setPRepo(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={INPUT} data-testid="policy-repo" />
          <input placeholder="base branches (comma globs)" value={pBase} onChange={e => setPBase(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={INPUT} />
          <select value={pMode} onChange={e => setPMode(e.target.value as any)} className="rounded-lg px-3 py-2 text-sm" style={INPUT}>
            <option value="review">Review</option>
            <option value="conform">Conform (push fixes)</option>
          </select>
          <select value={pPush} onChange={e => setPPush(e.target.value as any)} className="rounded-lg px-3 py-2 text-sm" style={INPUT}>
            <option value="companion-pr">Companion PR</option>
            <option value="direct-to-head">Direct to head</option>
          </select>
          <label className="flex items-center gap-2 text-xs" style={label}>
            <input type="checkbox" checked={pEnabled} onChange={e => setPEnabled(e.target.checked)} />Enabled
          </label>
          <label className="flex items-center gap-2 text-xs" style={label}>
            <input type="checkbox" checked={pBlocking} onChange={e => setPBlocking(e.target.checked)} />Blocking check
          </label>
          <button onClick={savePolicy} disabled={savingP} className="col-span-2 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold" style={{ background: '#00BFFF', color: '#0A1628' }} data-testid="policy-save">
            {savingP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Save policy
          </button>
        </div>
      </section>
    </div>
  );
}
