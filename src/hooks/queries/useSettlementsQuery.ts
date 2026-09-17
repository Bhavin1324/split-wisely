import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_SETTLEMENTS } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { Settlement } from '../../types';

const SETTLEMENT_SELECT_COLUMNS =
  '*, payer:profiles!payer_id(id, full_name, avatar_url), payee:profiles!payee_id(id, full_name, avatar_url)';

/**
 * Fetch settlements for a specific group with caching and real-time synchronization.
 */
export function useGroupSettlementsQuery(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.settlements.byGroup(groupId),
    queryFn: async (): Promise<Settlement[]> => {
      if (!groupId) return [];
      if (DEMO_MODE) {
        return MOCK_SETTLEMENTS.filter((s) => s.group_id === groupId);
      }

      const { data, error } = await supabase
        .from('settlements')
        .select(SETTLEMENT_SELECT_COLUMNS)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Settlement[];
    },
    enabled: Boolean(groupId),
  });

  // Scoped real-time subscription for the active group
  useEffect(() => {
    if (!groupId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-group-settlements', groupId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.settlements.byGroup(groupId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all });
        }
      );
    });
  }, [groupId, queryClient]);

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * Fetch all settlements across all user groups plus direct 1-on-1 settlements.
 */
export function useAllSettlementsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.settlements.byUser(userId),
    queryFn: async (): Promise<Settlement[]> => {
      if (!userId) return [];
      if (DEMO_MODE) {
        return MOCK_SETTLEMENTS;
      }

      // Step 1: Fetch all groups the user belongs to
      const { data: members, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      const groupIds = (members || []).map((m) => m.group_id).filter(Boolean);

      // Step 2: Fetch all settlements in user's groups OR direct 1-on-1 settlements
      let q = supabase
        .from('settlements')
        .select(SETTLEMENT_SELECT_COLUMNS)
        .order('created_at', { ascending: false });

      if (groupIds.length > 0) {
        q = q.or(`group_id.in.(${groupIds.join(',')}),payer_id.eq.${userId},payee_id.eq.${userId}`);
      } else {
        q = q.or(`payer_id.eq.${userId},payee_id.eq.${userId}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []) as unknown as Settlement[];
    },
    enabled: Boolean(userId),
  });

  // Scoped real-time subscription for the user
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-user-settlements', userId, (channel) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all });
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
