import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getFriendsForUser } from '../../lib/mockData';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import type { Profile } from '../../types';

/**
 * Fetch all friends (group co-members + direct friends) for a user with caching and real-time synchronization.
 */
export function useFriendsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.friends.list(userId),
    queryFn: async (): Promise<Profile[]> => {
      if (!userId) return [];
      if (DEMO_MODE) {
        return getFriendsForUser(userId);
      }

      // 1. Fetch group co-members
      const { data: myGroups, error: groupsErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (groupsErr) throw groupsErr;

      const groupIds = (myGroups || []).map((g) => g.group_id);

      let groupMemberUserIds: string[] = [];
      if (groupIds.length > 0) {
        const { data: otherMembers, error: membersErr } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', userId);

        if (membersErr) throw membersErr;
        groupMemberUserIds = (otherMembers || []).map((m) => m.user_id);
      }

      // 2. Fetch direct standalone friends (with graceful fallback if table missing)
      let directFriendUserIds: string[] = [];
      try {
        const { data: directFriends, error: friendsErr } = await supabase
          .from('user_friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (!friendsErr && directFriends) {
          directFriendUserIds = directFriends.map((df) =>
            df.user_id === userId ? df.friend_id : df.user_id
          );
        }
      } catch (dfErr) {
        console.warn('user_friends query non-fatal warning:', dfErr);
      }

      const uniqueUserIds = Array.from(new Set([...groupMemberUserIds, ...directFriendUserIds]));

      if (uniqueUserIds.length === 0) {
        return [];
      }

      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueUserIds);

      if (profilesErr) throw profilesErr;

      return (profiles || []) as Profile[];
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes stale time for smooth navigation
  });

  // Scoped real-time subscription for friend updates
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-friends', userId, (channel) => {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(userId) });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_friends' },
          () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(userId) });
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
