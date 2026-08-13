import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getFriendsForUser } from '../../lib/mockData';

export function useProfile(userId: string | undefined) {
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: profile, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (err) throw err;
      setData(profile as Profile);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { data, loading, error, refetch: fetchProfile };
}

export function useFriends(userId: string | undefined) {
  const [data, setData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    if (DEMO_MODE) {
      setData(getFriendsForUser(userId));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch group co-members
      const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      const groupIds = (myGroups || []).map(g => g.group_id);
      
      let groupMemberUserIds: string[] = [];
      if (groupIds.length > 0) {
        const { data: otherMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', userId);
        groupMemberUserIds = (otherMembers || []).map(m => m.user_id);
      }

      // 2. Fetch direct standalone friends (with graceful fallback if table missing)
      let directFriendUserIds: string[] = [];
      try {
        const { data: directFriends, error: friendsErr } = await supabase
          .from('user_friends')
          .select('user_id, friend_id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (!friendsErr && directFriends) {
          directFriendUserIds = directFriends.map(df => 
            df.user_id === userId ? df.friend_id : df.user_id
          );
        }
      } catch (dfErr) {
        console.warn('user_friends query non-fatal warning:', dfErr);
      }

      const uniqueUserIds = Array.from(new Set([...groupMemberUserIds, ...directFriendUserIds]));

      if (uniqueUserIds.length === 0) {
        setData([]);
        return;
      }

      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueUserIds);

      if (profilesErr) throw profilesErr;

      setData((profiles || []) as Profile[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return { data, loading, error, refetch: fetchFriends };
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', `%${query.trim()}%`)
    .limit(10);

  if (error) throw error;
  return (data as Profile[]) || [];
}
