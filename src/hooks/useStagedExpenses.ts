import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DEMO_MODE } from '../context/AppDataContext';
import type { StagedExpense } from '../types/stagedExpense';

export function useStagedExpenses() {
  const { user } = useAuth();
  const userId = user?.id;

  const [pendingExpenses, setPendingExpenses] = useState<StagedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingExpenses = useCallback(async () => {
    if (DEMO_MODE || !userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staged_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'PENDING')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.warn('Failed to fetch staged expenses:', error.message);
      } else if (data) {
        setPendingExpenses(data as StagedExpense[]);
      }
    } catch (e) {
      console.error('Error fetching staged expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPendingExpenses();

    if (DEMO_MODE || !userId) return;

    // Realtime subscription for incoming SMS from Android companion app
    const channel = supabase
      .channel('staged_expenses_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staged_expenses',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPendingExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchPendingExpenses]);

  // Action: Approve as Personal Expense
  const approveAsPersonal = async (staged: StagedExpense, category: string = 'General') => {
    if (!userId) return;

    try {
      // 1. Insert into personal_transactions
      const { error: txError } = await supabase.from('personal_transactions').insert({
        user_id: userId,
        amount: staged.amount_cents,
        type: staged.transaction_type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
        category,
        description: `[${staged.bank_short_code || 'BANK'}] ${staged.merchant_name}`,
        transaction_date: staged.transaction_date,
      });

      if (txError) {
        console.error('Failed to create personal transaction from staged:', txError.message);
        return false;
      }

      // 2. Mark staged expense as APPROVED_PERSONAL
      await supabase
        .from('staged_expenses')
        .update({ status: 'APPROVED_PERSONAL' })
        .eq('id', staged.id);

      setPendingExpenses((prev) => prev.filter((item) => item.id !== staged.id));
      return true;
    } catch (e) {
      console.error('Approve as personal failed:', e);
      return false;
    }
  };

  // Action: Dismiss (Ignore transfer / self-deposit)
  const dismissStaged = async (stagedId: string) => {
    try {
      await supabase
        .from('staged_expenses')
        .update({ status: 'DISMISSED' })
        .eq('id', stagedId);

      setPendingExpenses((prev) => prev.filter((item) => item.id !== stagedId));
    } catch (e) {
      console.error('Dismiss staged failed:', e);
    }
  };

  // Action: Mark as Split in Group
  const markAsGroupSplit = async (stagedId: string) => {
    try {
      await supabase
        .from('staged_expenses')
        .update({ status: 'APPROVED_GROUP' })
        .eq('id', stagedId);

      setPendingExpenses((prev) => prev.filter((item) => item.id !== stagedId));
    } catch (e) {
      console.error('Mark group split failed:', e);
    }
  };

  return {
    pendingExpenses,
    loading,
    refresh: fetchPendingExpenses,
    approveAsPersonal,
    dismissStaged,
    markAsGroupSplit,
  };
}
