import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

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

    try {
      setLoading(true);
      setError(null);
      
      const { data: myGroups, error: groupsErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (groupsErr) throw groupsErr;
      
      const groupIds = (myGroups || []).map(g => g.group_id);
      
      if (groupIds.length === 0) {
        setData([]);
        return;
      }
      
      const { data: otherMembers, error: membersErr } = await supabase
        .from('group_members')
        .select('*, profile:profiles(*)')
        .in('group_id', groupIds)
        .neq('user_id', userId);

      if (membersErr) throw membersErr;
      
      const uniqueProfiles = new Map<string, Profile>();
      (otherMembers || []).forEach((m: any) => {
        if (m.profile && !uniqueProfiles.has(m.profile.id)) {
          uniqueProfiles.set(m.profile.id, m.profile as Profile);
        }
      });
      
      setData(Array.from(uniqueProfiles.values()));
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
