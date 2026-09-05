import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Settlement } from '../../types';

export function useSettlements(groupId: string | undefined) {
  const [data, setData] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<Settlement[]>([]);
  dataRef.current = data;

  const fetchSettlements = useCallback(async (isSilent = false) => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      if (!isSilent && dataRef.current.length === 0) {
        setLoading(true);
      }
      setError(null);
      const { data: settlements, error: err } = await supabase
        .from('settlements')
        .select('*, payer:profiles!payer_id(*), payee:profiles!payee_id(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setData(settlements as unknown as Settlement[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchSettlements();

    if (!groupId) return;
    const channelName = `realtime-settlements-${groupId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => fetchSettlements(true),
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchSettlements]);

  return { data, loading, error, refetch: fetchSettlements };
}

export function useAllSettlements(userId: string | undefined) {
  const [data, setData] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllSettlements = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all groups the user belongs to
      const { data: members, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      const groupIds = (members || []).map((m: any) => m.group_id).filter(Boolean);

      // 2. Fetch all settlements in user's groups OR direct 1-on-1 settlements
      let query = supabase
        .from('settlements')
        .select('*, payer:profiles!payer_id(*), payee:profiles!payee_id(*)')
        .order('created_at', { ascending: false });

      if (groupIds.length > 0) {
        query = query.or(`group_id.in.(${groupIds.join(',')}),payer_id.eq.${userId},payee_id.eq.${userId}`);
      } else {
        query = query.or(`payer_id.eq.${userId},payee_id.eq.${userId}`);
      }

      const { data: settlements, error: err } = await query;

      if (err) throw err;
      setData(settlements as unknown as Settlement[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAllSettlements();

    if (!userId) return;
    const channelName = `all-settlements-sync-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => fetchAllSettlements()
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchAllSettlements]);

  return { data, loading, error, refetch: fetchAllSettlements };
}
