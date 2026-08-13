import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Group, GroupMember } from '../../types';

export function useGroups(userId: string | undefined) {
  const [data, setData] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: members, error: err } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', userId);

      if (err) throw err;
      
      const groups = (members || [])
        .map(m => m.groups)
        .filter(Boolean) as unknown as Group[];
        
      setData(groups);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { data, loading, error, refetch: fetchGroups };
}

export function useGroupMembers(groupId: string | undefined) {
  const [data, setData] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: members, error: err } = await supabase
        .from('group_members')
        .select('*, profile:profiles(*)')
        .eq('group_id', groupId);

      if (err) throw err;
      setData(members as unknown as GroupMember[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();

    if (!groupId) return;
    const channelName = `realtime-members-${groupId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => fetchMembers(),
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMembers]);

  return { data, loading, error, refetch: fetchMembers };
}
