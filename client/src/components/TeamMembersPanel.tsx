// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: TeamMembersPanel
// client/src/components/TeamMembersPanel.tsx
//
// Shown in the Project Settings tab (or as a standalone panel).
// Lets owners view members, change roles, remove members, and send invites.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  userId:        string;
  email:         string;
  avatarInitial: string;
  role:          string;
  joinedAt:      string | null;
  lastActiveAt:  string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)    return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function Avatar({ initial, size = 'md' }: { initial: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initial}
    </div>
  );
}

const ROLES = ['viewer', 'member', 'owner'] as const;
type Role = typeof ROLES[number];

// ── Component ─────────────────────────────────────────────────────────────────

export interface TeamMembersPanelProps {
  projectId: string;
  currentUserId: string;
}

export function TeamMembersPanel({ projectId, currentUserId }: TeamMembersPanelProps) {
  const [members, setMembers]           = useState<Member[]>([]);
  const [loading, setLoading]           = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<Role>('member');
  const [inviting, setInviting]         = useState(false);
  const [inviteMsg, setInviteMsg]       = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const isOwner = members.find(m => m.userId === currentUserId)?.role === 'owner';

  // ── Fetch members ─────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      setMembers(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Update role ───────────────────────────────────────────────────────────

  const updateRole = async (userId: string, role: Role) => {
    try {
      await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ role }),
      });
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Remove member ─────────────────────────────────────────────────────────

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method:      'DELETE',
        credentials: 'include',
      });
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Invite ────────────────────────────────────────────────────────────────

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invite failed');

      if (data.invited) {
        setInviteMsg(`Invite sent to ${inviteEmail} (they'll receive a signup link)`);
      } else if (data.added) {
        setInviteMsg(`${inviteEmail} added to the project`);
        fetchMembers();
      } else if (data.reason === 'already_member') {
        setInviteMsg(`${inviteEmail} is already a member`);
      }
      setInviteEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">Loading members…</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700">
          Team Members ({members.length})
        </h3>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>

      {/* Member list */}
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
        {members.map(m => (
          <div key={m.userId} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
            <Avatar initial={m.avatarInitial} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{m.email}</div>
              <div className="text-xs text-slate-400">
                {m.role} · last active {timeAgo(m.lastActiveAt)}
              </div>
            </div>

            {/* Role selector — only for owners editing others */}
            {isOwner && m.userId !== currentUserId ? (
              <select
                value={m.role}
                onChange={e => updateRole(m.userId, e.target.value as Role)}
                className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 bg-white outline-none focus:ring-1 focus:ring-indigo-300"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                m.role === 'owner'  ? 'bg-indigo-100 text-indigo-700' :
                m.role === 'member' ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {m.role}
              </span>
            )}

            {isOwner && m.userId !== currentUserId && (
              <button
                onClick={() => removeMember(m.userId)}
                className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                title="Remove member"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            No members yet
          </div>
        )}
      </div>

      {/* Invite section */}
      {isOwner && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Invite Member
          </h4>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') inviteMember(); }}
              placeholder="colleague@company.com"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-600 bg-white outline-none"
            >
              <option value="viewer">viewer</option>
              <option value="member">member</option>
            </select>
            <button
              onClick={inviteMember}
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {inviting ? '…' : 'Invite'}
            </button>
          </div>
          {inviteMsg && (
            <div className="mt-2 text-xs text-emerald-600">{inviteMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}
