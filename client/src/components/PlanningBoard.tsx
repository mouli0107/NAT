// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: Planning Board (Kanban)
// client/src/components/PlanningBoard.tsx
//
// Kanban columns: Planned | Assigned | Recording | Recorded
// Uses /api/projects/:id/planning-tcs
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanningTC {
  id:         string;
  assetKey:   string;
  name:       string;
  status:     string;   // 'planned' | 'assigned' | 'recording' | 'recorded'
  module:     string;
  feature:    string;
  priority:   string;
  assignedTo: string | null;
  assetType:  string;
}

interface Member {
  userId: string;
  email:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'planned',   label: 'Planned',   color: 'bg-slate-100 text-slate-600' },
  { key: 'assigned',  label: 'Assigned',  color: 'bg-blue-100 text-blue-700'   },
  { key: 'recording', label: 'Recording', color: 'bg-amber-100 text-amber-700' },
  { key: 'recorded',  label: 'Recorded',  color: 'bg-emerald-100 text-emerald-700' },
];

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-orange-100 text-orange-700',
  P3: 'bg-slate-100 text-slate-600',
};

function Avatar({ email, size = 'sm' }: { email: string; size?: 'xs' | 'sm' }) {
  const sz = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  return (
    <div className={`${sz} rounded-full bg-indigo-400 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {(email.charAt(0) ?? '?').toUpperCase()}
    </div>
  );
}

// ── TC Card ───────────────────────────────────────────────────────────────────

function TCCard({
  tc,
  members,
  onAssign,
  onStatusChange,
}: {
  tc:             PlanningTC;
  members:        Member[];
  onAssign:       (tcId: string, email: string) => void;
  onStatusChange: (tcId: string, status: string) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* TC sequence */}
      <div className="font-mono text-[10px] text-slate-400 mb-1">{tc.assetKey}</div>
      {/* Name */}
      <div className="text-sm font-medium text-slate-800 leading-snug">{tc.name}</div>
      {/* Module / Feature */}
      {tc.module && (
        <div className="text-[10px] text-slate-400 mt-1 truncate">{tc.module}{tc.feature ? ` / ${tc.feature}` : ''}</div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${PRIORITY_COLORS[tc.priority] ?? PRIORITY_COLORS['P2']}`}>
          {tc.priority}
        </span>

        {tc.assignedTo ? (
          <div className="flex items-center gap-1">
            <Avatar email={tc.assignedTo} size="xs" />
            <span className="text-[10px] text-slate-500">{tc.assignedTo.split('@')[0]}</span>
          </div>
        ) : tc.status === 'planned' ? (
          <div className="relative">
            <button
              onClick={() => setShowAssign(v => !v)}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
            >
              Assign →
            </button>
            {showAssign && (
              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-10 overflow-hidden">
                {members.map(m => (
                  <button
                    key={m.userId}
                    onClick={() => { onAssign(tc.id, m.email); setShowAssign(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2"
                  >
                    <Avatar email={m.email} size="xs" />
                    {m.email.split('@')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Status move (quick actions for planned/assigned) */}
      {tc.status === 'assigned' && (
        <button
          onClick={() => onStatusChange(tc.id, 'recording')}
          className="mt-2 w-full text-[10px] text-center py-1 border border-dashed border-amber-300 text-amber-600 rounded hover:bg-amber-50"
        >
          Mark as Recording
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export interface PlanningBoardProps {
  projectId: string;
  onAddTC?:  () => void;
}

export function PlanningBoard({ projectId, onAddTC }: PlanningBoardProps) {
  const [tcs, setTcs]       = useState<PlanningTC[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tcsRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/planning-tcs`, { credentials: 'include' }),
        fetch(`/api/projects/${projectId}/members`,      { credentials: 'include' }),
      ]);
      if (tcsRes.ok)     setTcs(await tcsRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Assign TC ───────────────────────────────────────────────────────────────

  const handleAssign = async (tcId: string, email: string) => {
    // Optimistic update
    setTcs(prev =>
      prev.map(t => t.id === tcId ? { ...t, assignedTo: email, status: 'assigned' } : t),
    );
    try {
      await fetch(`/api/projects/${projectId}/planning-tcs/${tcId}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ assignedTo: email, status: 'assigned' }),
      });
    } catch {
      fetchAll(); // rollback on error
    }
  };

  // ── Status change ────────────────────────────────────────────────────────────

  const handleStatusChange = async (tcId: string, status: string) => {
    setTcs(prev => prev.map(t => t.id === tcId ? { ...t, status } : t));
    try {
      await fetch(`/api/projects/${projectId}/planning-tcs/${tcId}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ status }),
      });
    } catch {
      fetchAll();
    }
  };

  // ── Group by status ─────────────────────────────────────────────────────────

  const byStatus: Record<string, PlanningTC[]> = {};
  for (const col of COLUMNS) byStatus[col.key] = [];
  for (const tc of tcs) {
    const key = COLUMNS.find(c => c.key === tc.status) ? tc.status : 'planned';
    byStatus[key].push(tc);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Loading board…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">{error}</div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4 h-full items-start">
      {COLUMNS.map(col => (
        <div key={col.key} className="flex-shrink-0 w-64 flex flex-col">
          {/* Column header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {col.label}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${col.color}`}>
                {byStatus[col.key].length}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-2 flex-1">
            {byStatus[col.key].map(tc => (
              <TCCard
                key={tc.id}
                tc={tc}
                members={members}
                onAssign={handleAssign}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Add TC button for planned column */}
          {col.key === 'planned' && (
            <button
              onClick={onAddTC}
              className="mt-3 w-full py-2 border-dashed border-2 border-slate-200 rounded-lg text-xs text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-colors"
            >
              + Add TC
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
