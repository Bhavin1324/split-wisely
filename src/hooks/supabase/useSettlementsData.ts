import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Settlement } from '../../types';

export function useSettlements(groupId: string | undefined) {
  const [data, setData] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettlements = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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

    // Listen for manual triggers from the AddExpenseModal and SettleUp interactions
    window.addEventListener('expenseAdded', fetchSettlements);

    if (!groupId) return;
    const channelId = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`realtime-settlements-${groupId}-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` },
        () => fetchSettlements(),
      )
      .subscribe();

    return () => {
      window.removeEventListener('expenseAdded', fetchSettlements);
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchSettlements]);

  return { data, loading, error, refetch: fetchSettlements };
}
