import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUP_ACTIVITIES } from '../../lib/mockData';
import type { GroupActivityItem } from '../../types';

export function useGroupActivities(groupId: string | undefined) {
  const [data, setData] = useState<GroupActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }

    if (DEMO_MODE) {
      const items = MOCK_GROUP_ACTIVITIES
        .filter((a) => a.group_id === groupId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setData([...items]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: activities, error: err } = await supabase
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

      if (err) throw err;
      setData((activities as unknown as GroupActivityItem[]) || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchActivities();

    if (!groupId || DEMO_MODE) return;

    const channelName = `realtime-group-activities-${groupId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_activities', filter: `group_id=eq.${groupId}` },
        () => fetchActivities()
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchActivities]);

  return { data, loading, error, refetch: fetchActivities };
}
