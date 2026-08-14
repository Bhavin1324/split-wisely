import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Expense, Category } from '../../types';

export function useExpenses(groupId: string | undefined) {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data: expenses, error: err } = await supabase
        .from('expenses')
        .select('*, payer:profiles!payer_id(*), category:categories(*), splits:expense_splits(*, user:profiles(*))')
        .eq('group_id', groupId)
        .order('expense_date', { ascending: false });

      if (err) throw err;
      setData(expenses as unknown as Expense[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchExpenses();

    if (!groupId) return;
    const channelName = `realtime-expenses-${groupId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        () => fetchExpenses(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => fetchExpenses(),
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchExpenses]);

  return { data, loading, error, refetch: fetchExpenses };
}

export function useAllExpenses(userId: string | undefined) {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllExpenses = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: members, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberErr) throw memberErr;

      const groupIds = (members || []).map(m => m.group_id);
      
      if (groupIds.length === 0) {
        setData([]);
        return;
      }

      const { data: expenses, error: err } = await supabase
        .from('expenses')
        .select('*, payer:profiles!payer_id(*), category:categories(*), splits:expense_splits(*, user:profiles(*))')
        .in('group_id', groupIds)
        .order('expense_date', { ascending: false });

      if (err) throw err;
      setData(expenses as unknown as Expense[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAllExpenses();

    if (!userId) return;
    const channelName = `all-expenses-sync-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => fetchAllExpenses()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => fetchAllExpenses()
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchAllExpenses]);

  return { data, loading, error, refetch: fetchAllExpenses };
}

export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: categories, error: err } = await supabase
        .from('categories')
        .select('*');

      if (err) throw err;
      setData(categories as Category[]);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { data, loading, error, refetch: fetchCategories };
}
