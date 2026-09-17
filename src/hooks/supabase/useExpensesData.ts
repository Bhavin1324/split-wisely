import { useGroupExpensesQuery, useAllExpensesQuery } from '../queries/useExpensesQuery';
import { useCategoriesQuery } from '../queries/useProfileQuery';
import type { Expense, Category } from '../../types';

/**
 * Hook to retrieve expenses for a specific group with caching and real-time synchronization.
 * Backed by TanStack Query.
 */
export function useExpenses(groupId: string | undefined) {
  const { data, loading, error, refetch, addOptimisticExpense } = useGroupExpensesQuery(groupId);
  return { data, loading, error, refetch, addOptimisticExpense };
}

/**
 * Hook to retrieve all expenses across all groups the user belongs to.
 * Backed by TanStack Query.
 */
export function useAllExpenses(userId: string | undefined) {
  const { data, loading, error, refetch } = useAllExpensesQuery(userId);
  return { data, loading, error, refetch };
}

/**
 * Hook to retrieve all expense categories with caching.
 * Backed by TanStack Query.
 */
export function useCategories() {
  const query = useCategoriesQuery();
  return {
    data: (query.data || []) as Category[],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export type { Expense, Category };
