import { useGroupSettlementsQuery, useAllSettlementsQuery } from '../queries/useSettlementsQuery';
import type { Settlement } from '../../types';

/**
 * Hook to retrieve settlements for a specific group with caching and real-time synchronization.
 * Backed by TanStack Query.
 */
export function useSettlements(groupId: string | undefined) {
  const { data, loading, error, refetch } = useGroupSettlementsQuery(groupId);
  return { data, loading, error, refetch };
}

/**
 * Hook to retrieve all settlements across user's groups and direct 1-on-1 settlements.
 * Backed by TanStack Query.
 */
export function useAllSettlements(userId: string | undefined) {
  const { data, loading, error, refetch } = useAllSettlementsQuery(userId);
  return { data, loading, error, refetch };
}

export type { Settlement };
