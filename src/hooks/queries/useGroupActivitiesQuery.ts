import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUP_ACTIVITIES } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { GroupActivityItem } from '../../types';

/**
 * Fetch group activities with caching and real-time synchronization.
 */
export function useGroupActivitiesQuery(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.groups.activities(groupId),
    queryFn: async (): Promise<GroupActivityItem[]> => {
      if (!groupId) return [];
      if (DEMO_MODE) {
        return MOCK_GROUP_ACTIVITIES
          .filter((a) => a.group_id === groupId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const { data: activities, error } = await supabase
        .from('group_activities')
        .select(`
          id,
          group_id,
          actor_id,
          action_type,
          description,
          metadata,
          created_at,
          actor:profiles!group_activities_actor_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (activities as unknown as GroupActivityItem[]) || [];
    },
    enabled: Boolean(groupId),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Scoped real-time subscription for new group activities
  useEffect(() => {
    if (!groupId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-group-activities', groupId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_activities', filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.groups.activities(groupId) });
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
