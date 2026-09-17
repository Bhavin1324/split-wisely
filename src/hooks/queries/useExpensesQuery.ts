import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_EXPENSES } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { Expense } from '../../types';

// Trimmed select columns: omits upi_id to bypass expensive PostgreSQL pgp_sym_decrypt calls
const EXPENSE_SELECT_COLUMNS = 
  '*, payer:profiles!payer_id(id, full_name, avatar_url), category:categories(*), splits:expense_splits(*, user:profiles(id, full_name, avatar_url))';

/**
 * Fetch expenses for a specific group with caching and real-time synchronization.
 */
export function useGroupExpensesQuery(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.expenses.byGroup(groupId),
    queryFn: async (): Promise<Expense[]> => {
      if (!groupId) return [];
      if (DEMO_MODE) {
        return MOCK_EXPENSES.filter((e) => e.group_id === groupId);
      }

      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT_COLUMNS)
        .eq('group_id', groupId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Expense[];
    },
    enabled: Boolean(groupId),
  });

  // Scoped real-time subscription for the active group
  useEffect(() => {
    if (!groupId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-group-expenses', groupId, (channel) => {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expense_splits' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
          }
        );
    });
  }, [groupId, queryClient]);

  const addOptimisticExpense = (expense: Expense) => {
    queryClient.setQueryData<Expense[]>(
      queryKeys.expenses.byGroup(groupId),
      (prev = []) => {
        if (prev.some((e) => e.id === expense.id)) return prev;
        return [expense, ...prev];
      }
    );
  };

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    addOptimisticExpense,
  };
}

/**
 * Fetch all expenses across all groups the user is a member of.
 */
export function useAllExpensesQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.expenses.byUser(userId),
    queryFn: async (): Promise<Expense[]> => {
      if (!userId) return [];
      if (DEMO_MODE) {
        return MOCK_EXPENSES;
      }

      // Step 1: Find all groups the user belongs to
      const { data: members, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      const groupIds = (members || []).map((m) => m.group_id).filter(Boolean);
      if (groupIds.length === 0) return [];

      // Step 2: Fetch expenses for these groups with selective non-decrypted profile joins
      const { data: expenses, error: err } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT_COLUMNS)
        .in('group_id', groupIds)
        .order('expense_date', { ascending: false });

      if (err) throw err;
      return (expenses || []) as unknown as Expense[];
    },
    enabled: Boolean(userId),
  });

  // Scoped real-time subscription for the user
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-user-expenses', userId, (channel) => {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
        });
    });
  }, [userId, queryClient]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
