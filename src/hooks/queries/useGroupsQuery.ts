import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUPS, MOCK_GROUP_MEMBERS } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { Group, GroupMember } from '../../types';

/**
 * Fetch all groups a user belongs to with caching and real-time synchronization.
 */
export function useUserGroupsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.groups.list(userId),
    queryFn: async (): Promise<Group[]> => {
      if (!userId) return [];
      if (DEMO_MODE) {
        return MOCK_GROUPS;
      }

      try {
        const { data: members, error } = await supabase
          .from('group_members')
          .select('group_id, groups(*)')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user groups:', error);
          return [];
        }

        const groups = (members || [])
          .map((m: any) => (Array.isArray(m?.groups) ? m.groups[0] : m?.groups))
          .filter((g): g is Group => Boolean(g && typeof g === 'object' && g.id))
          .map((g: any) => ({
            ...g,
            name: typeof g.name === 'string' && g.name.trim().length > 0 ? g.name : 'Untitled Group',
          })) as Group[];

        return groups;
      } catch (err) {
        console.error('Unexpected error fetching user groups:', err);
        return [];
      }
    },
    enabled: Boolean(userId),
  });

  // Scoped real-time subscription for group membership changes
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-user-groups', userId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(userId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
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
 * Fetch all members of a group with selective profile joins.
 */
export function useGroupMembersQuery(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: async (): Promise<GroupMember[]> => {
      if (!groupId) return [];
      if (DEMO_MODE) {
        return MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === groupId);
      }

      const { data, error } = await supabase
        .from('group_members')
        .select('*, profile:profiles(id, full_name, avatar_url)')
        .eq('group_id', groupId);

      if (error) throw error;
      return (data || []) as unknown as GroupMember[];
    },
    enabled: Boolean(groupId),
  });

  // Scoped real-time subscription for group members
  useEffect(() => {
    if (!groupId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-group-members', groupId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
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
