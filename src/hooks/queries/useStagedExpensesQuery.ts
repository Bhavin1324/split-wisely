import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { StagedExpense } from '../../types/stagedExpense';

const MOCK_PENDING_STAGED: StagedExpense[] = [
  {
    id: 'mock-staged-1',
    user_id: 'mock-user',
    amount_cents: 45000,
    transaction_type: 'DEBIT',
    merchant_name: 'SWIGGY',
    bank_short_code: 'HDFC',
    account_last4: '4821',
    upi_ref: '429182749102',
    raw_sms_hash: 'mock-hash-1',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    transaction_date: new Date().toISOString(),
  },
];

// Short-lived in-memory tombstone map to prevent in-flight server GET responses from resurrecting actioned items (5s TTL)
const tombstoneMap = new Map<string, number>();
const TOMBSTONE_TTL_MS = 5000;

export function registerStagedTombstone(id: string) {
  tombstoneMap.set(id, Date.now() + TOMBSTONE_TTL_MS);
}

export function evictStagedTombstone(id: string) {
  tombstoneMap.delete(id);
}

export function isStagedTombstoned(id: string): boolean {
  const expiresAt = tombstoneMap.get(id);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    tombstoneMap.delete(id);
    return false;
  }
  return true;
}

/**
 * Fetch pending staged SMS expenses for a user with real-time sync.
 * Incorporates 0ms cache reactivity, Map-based deduplication, deterministic date sorting,
 * and debounced background reconciliation to prevent burst race conditions.
 */
export function usePendingStagedExpensesQuery(userId: string | undefined) {
  const queryClient = useQueryClient();
  const reconcileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consolidated debounced background reconciliation (1,500ms debounce window)
  const scheduleDebouncedReconciliation = useCallback(() => {
    if (reconcileTimeoutRef.current) {
      clearTimeout(reconcileTimeoutRef.current);
    }
    reconcileTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.all });
    }, 1500);
  }, [queryClient]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (reconcileTimeoutRef.current) {
        clearTimeout(reconcileTimeoutRef.current);
      }
    };
  }, []);

  const query = useQuery({
    queryKey: queryKeys.stagedExpenses.pending(userId),
    queryFn: async (): Promise<StagedExpense[]> => {
      if (DEMO_MODE) {
        return MOCK_PENDING_STAGED;
      }
      if (!userId) return [];

      const { data, error } = await supabase
        .from('staged_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'PENDING')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.warn('Failed to fetch staged expenses:', error.message);
        return [];
      }

      // Bi-directional merge: preserve any pending items received via WebSocket while queryFn was in-flight
      // Filter out any tombstoned IDs to guarantee that in-flight GETs never resurrect actioned items
      const currentCached =
        queryClient.getQueryData<StagedExpense[]>(
          queryKeys.stagedExpenses.pending(userId)
        ) || [];

      const map = new Map(
        (data || [])
          .filter((item) => !isStagedTombstoned(item.id))
          .map((item) => [item.id, item as StagedExpense])
      );
      for (const item of currentCached) {
        if (!map.has(item.id) && item.status === 'PENDING' && !isStagedTombstoned(item.id)) {
          map.set(item.id, item);
        }
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      );
    },
    enabled: Boolean(userId) || DEMO_MODE,
  });

  // Scoped real-time subscription for incoming companion SMS with 0ms cache reactivity
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription(
      'realtime-staged-expenses',
      userId,
      (channel) => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'staged_expenses',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const eventType = payload.eventType;

            if (eventType === 'INSERT') {
              const newStaged = payload.new as StagedExpense;
              if (newStaged && newStaged.status === 'PENDING' && !isStagedTombstoned(newStaged.id)) {
                // Immediate 0ms cache injection with Map deduplication & date sorting
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => {
                    const map = new Map(prev.map((item) => [item.id, item]));
                    map.set(newStaged.id, newStaged);
                    return Array.from(map.values()).sort(
                      (a, b) =>
                        new Date(b.transaction_date).getTime() -
                        new Date(a.transaction_date).getTime()
                    );
                  }
                );
                // Schedule debounced reconciliation (resets 1.5s timer per packet)
                scheduleDebouncedReconciliation();
              }
            } else if (eventType === 'UPDATE') {
              const updated = payload.new as StagedExpense;
              if (updated) {
                if (updated.status !== 'PENDING') {
                  registerStagedTombstone(updated.id);
                }
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => {
                    if (updated.status !== 'PENDING') {
                      return prev.filter((item) => item.id !== updated.id);
                    }
                    const map = new Map(prev.map((item) => [item.id, item]));
                    map.set(updated.id, updated);
                    return Array.from(map.values()).sort(
                      (a, b) =>
                        new Date(b.transaction_date).getTime() -
                        new Date(a.transaction_date).getTime()
                    );
                  }
                );
                scheduleDebouncedReconciliation();
              }
            } else if (eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                registerStagedTombstone(deletedId);
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => prev.filter((item) => item.id !== deletedId)
                );
                scheduleDebouncedReconciliation();
              }
            }
          }
        );
      },
      (status) => {
        // When channel successfully connects or recovers from phone sleep/doze mode, debounce reconciliation
        if (status === 'SUBSCRIBED') {
          scheduleDebouncedReconciliation();
        }
      }
    );
  }, [userId, queryClient, scheduleDebouncedReconciliation]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
