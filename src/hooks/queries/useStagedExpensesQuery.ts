import { useEffect } from 'react';
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

/**
 * Fetch pending staged SMS expenses for a user with real-time sync.
 */
export function usePendingStagedExpensesQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

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
      return (data || []) as StagedExpense[];
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
              if (newStaged && newStaged.status === 'PENDING') {
                // Immediate 0ms cache injection: mounts StagedTransactionsBanner with 0ms latency
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => {
                    if (prev.some((item) => item.id === newStaged.id)) return prev;
                    return [newStaged, ...prev];
                  }
                );
              }
            } else if (eventType === 'UPDATE') {
              const updated = payload.new as StagedExpense;
              if (updated) {
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => {
                    if (updated.status !== 'PENDING') {
                      return prev.filter((item) => item.id !== updated.id);
                    }
                    return prev.map((item) => (item.id === updated.id ? updated : item));
                  }
                );
              }
            } else if (eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                queryClient.setQueryData<StagedExpense[]>(
                  queryKeys.stagedExpenses.pending(userId),
                  (prev = []) => prev.filter((item) => item.id !== deletedId)
                );
              }
            }

            // Invalidate in background to ensure perfect eventual consistency
            queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.all });
          }
        );
      },
      (status) => {
        // When channel successfully connects or recovers from phone sleep/doze mode, refresh staged queue
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
        }
      }
    );
  }, [userId, queryClient]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
