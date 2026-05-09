// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: ProgressDashboard
// client/src/components/ProgressDashboard.tsx
//
// Shows overall progress, per-module breakdown, and per-member stats.
// Data source: /api/projects/:id/planning-tcs
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { PlanningTC } from './PlanningBoard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ProgressBar({
  value,
  max,
  color = 'bg-indigo-500',
  height = 'h-2.5',
}: {
  value: number;
  max:   number;
  color?: string;
  height?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full bg-slate-100 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Avatar({ email }: { email: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {(email.charAt(0) ?? '?').toUpperCase()}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ProgressDashboardProps {
  projectId: string;
}

export function ProgressDashboard({ projectId }: ProgressDashboardProps) {
  const [tcs, setTcs]       = useState<PlanningTC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetchTcs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/planning-tcs`, {
        credentials: 'include',
      });
      if (res.ok) setTcs(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchTcs(); }, [fetchTcs]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-sm">{error}</div>;
  }

  // ── Compute stats ──────────────────────────────────────────────────────────

  const total     = tcs.length;
  const recorded  = tcs.filter(t => t.status === 'recorded').length;
  const assigned  = tcs.filter(t => t.status === 'assigned').length;
  const recording = tcs.filter(t => t.status === 'recording').length;
  const planned   = tcs.filter(t => t.status === 'planned').length;
  const pct       = total > 0 ? Math.round((recorded / total) * 100) : 0;

  // Per-module
  const moduleMap = new Map<string, { total: number; recorded: number }>();
  for (const tc of tcs) {
    const mod = tc.module || 'Unassigned';
    const entry = moduleMap.get(mod) ?? { total: 0, recorded: 0 };
    entry.total++;
    if (tc.status === 'recorded') entry.recorded++;
    moduleMap.set(mod, entry);
  }
  const moduleStats = Array.from(moduleMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.total - a.total);

  // Per-member (based on assignedTo)
  const memberMap = new Map<string, { recorded: number; assigned: number }>();
  for (const tc of tcs) {
    if (!tc.assignedTo) continue;
    const entry = memberMap.get(tc.assignedTo) ?? { recorded: 0, assigned: 0 };
    entry.assigned++;
    if (tc.status === 'recorded') entry.recorded++;
    memberMap.set(tc.assignedTo, entry);
  }
  const memberStats = Array.from(memberMap.entries())
    .map(([email, s]) => ({ email, ...s }))
    .sort((a, b) => b.recorded - a.recorded);
  const maxRecorded = Math.max(1, ...memberStats.map(m => m.recorded));

  // Velocity estimate (placeholder: assumes 10 TCs/day)
  const velocityPerDay = 10;
  const remaining      = total - recorded;
  const daysLeft       = remaining > 0 ? Math.ceil(remaining / velocityPerDay) : 0;
  const velocityTxt    = remaining === 0 ? 'All done! 🎉' : `~${daysLeft} day${daysLeft !== 1 ? 's' : ''} to completion at current pace`;

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">

      {/* Overall progress */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Overall Progress</h3>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-slate-600 mb-1.5">
              <span className="font-medium">{recorded} recorded</span>
              <span className="text-slate-400">{total} total</span>
            </div>
            <ProgressBar value={recorded} max={total} height="h-3" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 w-14 text-right">{pct}%</div>
        </div>

        {/* Status pills */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Planned',   count: planned,   color: 'bg-slate-50  text-slate-600' },
            { label: 'Assigned',  count: assigned,  color: 'bg-blue-50   text-blue-700'  },
            { label: 'Recording', count: recording, color: 'bg-amber-50  text-amber-700' },
            { label: 'Recorded',  count: recorded,  color: 'bg-emerald-50 text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-lg px-3 py-2 text-center`}>
              <div className="text-lg font-bold">{s.count}</div>
              <div className="text-[10px] font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-400 mt-3">{velocityTxt}</div>
      </div>

      {/* By Module */}
      {moduleStats.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <h3 className="text-sm font-bold text-slate-700 mb-4">By Module</h3>
          <div className="space-y-3">
            {moduleStats.map(m => (
              <div key={m.name}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-slate-400 ml-2 flex-shrink-0">{m.recorded}/{m.total}</span>
                </div>
                <ProgressBar value={m.recorded} max={m.total} height="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Member */}
      {memberStats.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <h3 className="text-sm font-bold text-slate-700 mb-4">By Member</h3>
          <div className="space-y-3">
            {memberStats.map(m => (
              <div key={m.email} className="flex items-center gap-3">
                <Avatar email={m.email} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="truncate font-medium">{m.email.split('@')[0]}</span>
                    <span className="text-slate-400 ml-2 flex-shrink-0">{m.recorded} recorded</span>
                  </div>
                  <ProgressBar value={m.recorded} max={maxRecorded} height="h-1.5" color="bg-indigo-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <div className="text-5xl opacity-20">📊</div>
          <div className="text-sm">No test cases yet</div>
          <div className="text-xs">Import from Excel or start recording</div>
        </div>
      )}
    </div>
  );
}
