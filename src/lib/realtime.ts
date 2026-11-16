import { useEffect, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ALL_REALTIME_TABLES, supabase } from './supabase';
import { RELATED_TABLE_KEYS } from './queryKeys';

export type RealtimeConnectionState = 'SUBSCRIBED' | 'RECONNECTING' | 'OFFLINE';

interface RealtimeListenerStore {
  state: RealtimeConnectionState;
  listeners: Set<(state: RealtimeConnectionState) => void>;
}

const realtimeStore: RealtimeListenerStore = {
  state: 'RECONNECTING',
  listeners: new Set(),
};

function setRealtimeState(nextState: RealtimeConnectionState): void {
  if (realtimeStore.state === nextState) return;
  realtimeStore.state = nextState;
  realtimeStore.listeners.forEach((listener) => listener(nextState));
}

/**
 * Hook for UI components (e.g. AppShell header badge) to observe live Realtime status
 * and trigger an immediate full query invalidation if clicked.
 */
export function useRealtimeStatus() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeConnectionState>(realtimeStore.state);

  useEffect(() => {
    const handler = (next: RealtimeConnectionState) => setStatus(next);
    realtimeStore.listeners.add(handler);
    return () => {
      realtimeStore.listeners.delete(handler);
    };
  }, []);

  const refreshAll = () => {
    queryClient.invalidateQueries();
  };

  return { status, isLive: status === 'SUBSCRIBED', refreshAll };
}

// Module-scoped singleton guards to prevent duplicate channels under React 18 StrictMode
let activeChannel: RealtimeChannel | null = null;
let activeSubscriberCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupTearDownTimer: ReturnType<typeof setTimeout> | null = null;
let hadDisconnectBeforeSubscribe = false;
let backoffAttempt = 0;

const tableDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingTablesToInvalidate = new Set<string>();

function scheduleTableInvalidation(queryClient: QueryClient, table: string): void {
  pendingTablesToInvalidate.add(table);
  const related = RELATED_TABLE_KEYS[table];
  if (related) {
    for (const rel of related) {
      pendingTablesToInvalidate.add(rel);
    }
  }

  const existingTimer = tableDebounceTimers.get(table);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    tableDebounceTimers.delete(table);
    const tablesToFlush = Array.from(pendingTablesToInvalidate);
    pendingTablesToInvalidate.clear();
    for (const t of tablesToFlush) {
      queryClient.invalidateQueries({ queryKey: [t] });
    }
  }, 150);

  tableDebounceTimers.set(table, timer);
}

function createAndSubscribeChannel(queryClient: QueryClient): void {
  if (activeChannel) return;

  let channel = supabase.channel('erp-realtime-sync');

  for (const table of ALL_REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        if (import.meta.env.DEV) {
          console.debug(`[REALTIME] ${table} -> ${payload.eventType}`);
        }
        scheduleTableInvalidation(queryClient, table);
      }
    );
  }

  activeChannel = channel;

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      backoffAttempt = 0;
      setRealtimeState('SUBSCRIBED');
      if (hadDisconnectBeforeSubscribe) {
        hadDisconnectBeforeSubscribe = false;
        queryClient.invalidateQueries();
      }
      return;
    }

    if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      hadDisconnectBeforeSubscribe = true;
      setRealtimeState('RECONNECTING');

      if (activeSubscriberCount <= 0) return;

      if (reconnectTimer) clearTimeout(reconnectTimer);
      const delayMs = Math.min(30_000, 1000 * Math.pow(2, backoffAttempt));
      backoffAttempt += 1;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (activeChannel) {
          const stale = activeChannel;
          activeChannel = null;
          supabase.removeChannel(stale).catch(() => null);
        }
        if (activeSubscriberCount > 0) {
          createAndSubscribeChannel(queryClient);
        }
      }, delayMs);
    }
  });
}

/**
 * Mounted ONCE inside `QueryClientProvider` after authentication.
 * Subscribes to `postgres_changes` across all ERP tables on a single channel
 * (`erp-realtime-sync`), debounces per-table query invalidations (~150 ms),
 * and recovers automatically on reconnect, tab visibility, and network online events.
 */
export function useRealtimeSync(enabled: boolean = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (cleanupTearDownTimer) {
      clearTimeout(cleanupTearDownTimer);
      cleanupTearDownTimer = null;
    }

    activeSubscriberCount += 1;
    createAndSubscribeChannel(queryClient);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries();
      }
    };

    const handleOnline = () => {
      setRealtimeState('RECONNECTING');
      queryClient.invalidateQueries();
      if (!activeChannel && activeSubscriberCount > 0) {
        createAndSubscribeChannel(queryClient);
      }
    };

    const handleOffline = () => {
      hadDisconnectBeforeSubscribe = true;
      setRealtimeState('RECONNECTING');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);

      // Defer teardown slightly to guard against React 18 StrictMode unmount/remount
      cleanupTearDownTimer = setTimeout(() => {
        if (activeSubscriberCount === 0) {
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          if (activeChannel) {
            const chan = activeChannel;
            activeChannel = null;
            supabase.removeChannel(chan).catch(() => null);
          }
        }
      }, 100);
    };
  }, [enabled, queryClient]);
}
