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
        return MOCK_GROUPS.map((g) => {
          const gMembers = MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === g.id);
          return {
            ...g,
            member_count: g.member_count ?? gMembers.length,
            members_preview: gMembers.slice(0, 3).map((gm) => ({
              id: gm.user_id,
              full_name: gm.profile?.full_name,
              avatar_url: gm.profile?.avatar_url,
            })),
          };
        });
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

        const rawGroups = (members || [])
          .map((m: any) => (Array.isArray(m?.groups) ? m.groups[0] : m?.groups))
          .filter((g): g is Group => Boolean(g && typeof g === 'object' && g.id))
          .map((g: any) => ({
            ...g,
            name: typeof g.name === 'string' && g.name.trim().length > 0 ? g.name : 'Untitled Group',
          })) as Group[];

        const groupIds = rawGroups.map((g) => g.id);
        if (groupIds.length === 0) return [];

        // Batch-fetch all co-members to accurately compute member_count and prime member cache
        const { data: allMembers, error: membersErr } = await supabase
          .from('group_members')
          .select('group_id, user_id, profile:profiles(id, full_name, avatar_url)')
          .in('group_id', groupIds);

        if (!membersErr && allMembers) {
          const countMap = new Map<string, number>();
          const membersByGroup = new Map<string, GroupMember[]>();

          for (const gm of allMembers) {
            countMap.set(gm.group_id, (countMap.get(gm.group_id) || 0) + 1);
            const list = membersByGroup.get(gm.group_id) || [];
            list.push(gm as unknown as GroupMember);
            membersByGroup.set(gm.group_id, list);
          }

          // Prime the cache for individual groups (0ms cold start for GroupDetailPage)
          for (const [gId, gmList] of membersByGroup.entries()) {
            queryClient.setQueryData(queryKeys.groups.members(gId), gmList);
          }

          return rawGroups.map((g) => {
            const gMembers = membersByGroup.get(g.id) || [];
            return {
              ...g,
              member_count: countMap.get(g.id) ?? 1,
              members_preview: gMembers.slice(0, 3).map((m) => ({
                id: m.user_id,
                full_name: m.profile?.full_name,
                avatar_url: m.profile?.avatar_url,
              })),
            };
          });
        }

        return rawGroups.map((g) => ({
          ...g,
          member_count: g.member_count ?? 1,
        }));
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
