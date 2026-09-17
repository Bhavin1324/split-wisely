import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_PERSONAL_TRANSACTIONS, MOCK_PERSONAL_BUDGETS } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { PersonalTransaction, PersonalBudget } from '../../types';

/**
 * Fetch personal transactions for a user.
 */
export function usePersonalTransactionsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.personalLedger.transactions(userId),
    queryFn: async (): Promise<PersonalTransaction[]> => {
      if (!userId) return [];
      if (DEMO_MODE) {
        return MOCK_PERSONAL_TRANSACTIONS.filter((t) => t.user_id === userId || userId === 'user-1');
      }

      const { data, error } = await supabase
        .from('personal_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.warn('Personal transactions fetch fallback:', error.message);
        return MOCK_PERSONAL_TRANSACTIONS;
      }
      return (data || []) as PersonalTransaction[];
    },
    enabled: Boolean(userId),
  });

  // Scoped real-time subscription for personal transactions
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-personal-tx', userId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personal_transactions', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.personalLedger.transactions(userId) });
        }
      );
    });
  }, [userId, queryClient]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * Fetch budget for a specific user and month.
 */
export function usePersonalBudgetQuery(userId: string | undefined, monthYear: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.personalLedger.budget(userId, monthYear),
    queryFn: async (): Promise<PersonalBudget | null> => {
      if (!userId || !monthYear) return null;
      if (DEMO_MODE) {
        return MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) ?? null;
      }

      const { data, error } = await supabase
        .from('personal_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Personal budget fetch fallback:', error.message);
        return MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null;
      }
      return (data as PersonalBudget) || null;
    },
    enabled: Boolean(userId && monthYear),
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
