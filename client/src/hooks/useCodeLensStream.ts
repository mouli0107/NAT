import { useEffect, useRef, useCallback } from 'react';
import type { CodeLensEvent } from '@/components/code-lens/codeLensTypes';
import { SSE_EVENT_TYPES } from '@/components/code-lens/codeLensTypes';

/**
 * Subscribes to the Code Lens SSE stream for a given sessionId.
 * Uses named event listeners because the backend emits named SSE events
 * (event: violation_found\ndata: {...}\n\n), not unnamed messages.
 * Reconnects automatically after 3 s on connection loss.
 */
export function useCodeLensStream(
  sessionId: string | null,
  onEvent: (event: CodeLensEvent) => void,
) {
  const esRef   = useRef<EventSource | null>(null);
  // Stable ref so reconnect timer always calls the latest callback
  const cbRef   = useRef(onEvent);
  cbRef.current = onEvent;

  const connect = useCallback(() => {
    if (!sessionId) return;
    esRef.current?.close();

    const es = new EventSource(`/api/v1/codelens/review/stream?sessionId=${sessionId}`);
    esRef.current = es;

    for (const eventType of SSE_EVENT_TYPES) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as CodeLensEvent;
          cbRef.current(parsed);
        } catch {
          console.error('[CodeLens] SSE parse error', e.data);
        }
      });
    }

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Distinguish a transient drop from a dead session (server restart / TTL
      // purge). If the session no longer exists, stop reconnecting and surface it.
      fetch(`/api/v1/codelens/review/exists?sessionId=${sessionId}`)
        .then(r => r.json())
        .then((d: { exists: boolean }) => {
          if (d.exists) setTimeout(connect, 3000);
          else cbRef.current({ event: 'error', message: 'SESSION_EXPIRED' });
        })
        .catch(() => setTimeout(connect, 3000)); // network blip → keep retrying
    };
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
