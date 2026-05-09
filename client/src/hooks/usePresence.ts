// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: usePresence hook
// client/src/hooks/usePresence.ts
//
// Establishes an SSE connection to the presence-stream endpoint.
// Tracks who is online, their current activity, and a rolling activity feed.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId:        string;
  email:         string;
  avatarInitial: string;
  action:        string;   // 'viewing' | 'recording' | 'reviewing'
  moduleId?:     string;
  featureId?:    string;
  tcId?:         string;
  joinedAt:      string;
}

export interface ActivityEvent {
  id:          string;
  type:        string;   // 'tc_saved' | 'conflict_detected' | 'user_joined' | ...
  timestamp:   string;
  userId:      string;
  email:       string;
  tcId?:       string;
  tcSequence?: string;
  tcName?:     string;
  moduleName?: string;
  featureName?: string;
  conflictId?: string;
  assetKey?:   string;
  conflictType?: string;
  mergeResult?: { added: number; skipped: number; conflicts: number };
  message?:    string;
}

export interface UsePresenceResult {
  onlineUsers:    PresenceUser[];
  activities:     ActivityEvent[];
  updatePresence: (activity: Partial<PresenceUser>) => Promise<void>;
  isConnected:    boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePresence(
  projectId: string | null,
  callbacks?: {
    onTcSaved?:           (event: ActivityEvent) => void;
    onConflictDetected?:  (event: ActivityEvent) => void;
    onTcStatusChanged?:   (event: any) => void;
  },
): UsePresenceResult {
  const [onlineUsers, setOnlineUsers]   = useState<PresenceUser[]>([]);
  const [activities, setActivities]     = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected]   = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!projectId) {
      setOnlineUsers([]);
      setActivities([]);
      setIsConnected(false);
      return;
    }

    const es = new EventSource(
      `/api/projects/${projectId}/presence-stream`,
      { withCredentials: true },
    );

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (e: MessageEvent) => {
      let event: any;
      try { event = JSON.parse(e.data); } catch { return; }

      switch (event.type) {
        case 'current_presence':
          setOnlineUsers(event.users ?? []);
          break;

        case 'user_joined':
          setOnlineUsers(prev => {
            if (prev.find(u => u.userId === event.userId)) return prev;
            return [...prev, event as PresenceUser];
          });
          pushActivity(event, `${event.email} joined`);
          break;

        case 'user_left':
          setOnlineUsers(prev => prev.filter(u => u.userId !== event.userId));
          break;

        case 'user_activity':
          setOnlineUsers(prev =>
            prev.map(u =>
              u.userId === event.userId
                ? { ...u, action: event.action, moduleId: event.moduleId, featureId: event.featureId, tcId: event.tcId }
                : u,
            ),
          );
          break;

        case 'tc_saved':
          pushActivity(event, `${event.email} saved ${event.tcSequence}`);
          callbacksRef.current?.onTcSaved?.(toActivityEvent(event));
          break;

        case 'conflict_detected':
          pushActivity(event, `Conflict on ${event.assetKey}`);
          callbacksRef.current?.onConflictDetected?.(toActivityEvent(event));
          break;

        case 'tc_recording_started':
          setOnlineUsers(prev =>
            prev.map(u =>
              u.userId === event.userId ? { ...u, action: 'recording', tcId: event.tcId } : u,
            ),
          );
          pushActivity(event, `${event.email} started recording ${event.tcId}`);
          break;

        case 'tc_recording_stopped':
          setOnlineUsers(prev =>
            prev.map(u =>
              u.userId === event.userId ? { ...u, action: 'viewing', tcId: undefined } : u,
            ),
          );
          break;

        case 'tc_status_changed':
          callbacksRef.current?.onTcStatusChanged?.(event);
          break;

        default:
          break;
      }
    };

    function pushActivity(raw: any, message: string) {
      const item: ActivityEvent = {
        id:          `${Date.now()}-${Math.random()}`,
        type:        raw.type,
        timestamp:   new Date().toISOString(),
        userId:      raw.userId ?? '',
        email:       raw.email  ?? '',
        tcId:        raw.tcId,
        tcSequence:  raw.tcSequence,
        tcName:      raw.tcName,
        moduleName:  raw.moduleName,
        featureName: raw.featureName,
        conflictId:  raw.conflictId,
        assetKey:    raw.assetKey,
        conflictType: raw.conflictType,
        mergeResult: raw.mergeResult,
        message,
      };
      setActivities(prev => [item, ...prev].slice(0, 50));
    }

    function toActivityEvent(raw: any): ActivityEvent {
      return {
        id:          `${Date.now()}`,
        type:        raw.type,
        timestamp:   new Date().toISOString(),
        userId:      raw.userId ?? '',
        email:       raw.email  ?? '',
        tcId:        raw.tcId,
        tcSequence:  raw.tcSequence,
        tcName:      raw.tcName,
        moduleName:  raw.moduleName,
        featureName: raw.featureName,
        conflictId:  raw.conflictId,
        assetKey:    raw.assetKey,
        conflictType: raw.conflictType,
        mergeResult: raw.mergeResult,
        message:     '',
      };
    }

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [projectId]);

  // ── Update own presence ───────────────────────────────────────────────────

  const updatePresence = useCallback(async (activity: Partial<PresenceUser>) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/presence`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(activity),
      });
    } catch {
      // non-fatal
    }
  }, [projectId]);

  return { onlineUsers, activities, updatePresence, isConnected };
}
