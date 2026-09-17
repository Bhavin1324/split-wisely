import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_CURRENT_USER } from '../lib/mockData';
import { queryKeys } from '../lib/queryKeys';
import { usePendingStagedExpensesQuery } from './queries/useStagedExpensesQuery';
import type { StagedExpense } from '../types/stagedExpense';

export interface CustomStagedExpenseData {
  description?: string;
  category?: string;
  paymentMethod?: 'UPI' | 'CARD' | 'CASH' | 'BANK';
  type?: 'EXPENSE' | 'INCOME';
}

export function useStagedExpenses(explicitUserId?: string) {
  const { user } = useAuth();
  const userId = explicitUserId || user?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : undefined);
  const queryClient = useQueryClient();

  const { data: pendingExpenses, loading, refetch } = usePendingStagedExpensesQuery(userId);

  // Action: Approve as Personal Expense
  const approveAsPersonal = async (
    staged: StagedExpense,
    customData?: CustomStagedExpenseData | string
  ) => {
    // Optimistic removal from staged cache
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(userId),
      (prev = []) => prev.filter((item) => item.id !== staged.id)
    );

    if (DEMO_MODE) {
      return true;
    }
    if (!userId) return false;

    try {
      const isCustomObj = typeof customData === 'object' && customData !== null;
      const category = (isCustomObj ? customData.category : customData) || 'Other';
      const paymentMethod = (isCustomObj && customData.paymentMethod)
        ? customData.paymentMethod
        : (staged.upi_ref ? 'UPI' : (staged.bank_short_code ? 'BANK' : 'UPI'));
      const rawDesc = (isCustomObj && customData.description?.trim())
        ? customData.description.trim()
        : staged.merchant_name;
      const finalDescription = `[${paymentMethod}] ${rawDesc}`;
      const txType = (isCustomObj && customData.type)
        ? customData.type
        : (staged.transaction_type === 'DEBIT' ? 'EXPENSE' : 'INCOME');

      // 1. Insert into personal_transactions
      const { error: txError } = await supabase.from('personal_transactions').insert({
        user_id: userId,
        amount: staged.amount_cents,
        type: txType,
        category,
        description: finalDescription,
        transaction_date: staged.transaction_date,
      });

      if (txError) {
        console.error('Failed to create personal transaction from staged:', txError.message);
        queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
        return false;
      }

      // 2. Mark staged expense as APPROVED_PERSONAL
      await supabase
        .from('staged_expenses')
        .update({ status: 'APPROVED_PERSONAL' })
        .eq('id', staged.id);

      // Invalidate personal transactions & staged expenses
      queryClient.invalidateQueries({ queryKey: queryKeys.personalLedger.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
      return true;
    } catch (e) {
      console.error('Approve as personal failed:', e);
      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
      return false;
    }
  };

  // Action: Dismiss (Ignore transfer / self-deposit)
  const dismissStaged = async (stagedId: string) => {
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(userId),
      (prev = []) => prev.filter((item) => item.id !== stagedId)
    );

    if (DEMO_MODE) return;

    try {
      await supabase
        .from('staged_expenses')
        .update({ status: 'DISMISSED' })
        .eq('id', stagedId);

      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
    } catch (e) {
      console.error('Dismiss staged failed:', e);
      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
    }
  };

  // Action: Mark as Split in Group
  const markAsGroupSplit = async (stagedId: string) => {
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(userId),
      (prev = []) => prev.filter((item) => item.id !== stagedId)
    );

    if (DEMO_MODE) return;

    try {
      await supabase
        .from('staged_expenses')
        .update({ status: 'APPROVED_GROUP' })
        .eq('id', stagedId);

      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
    } catch (e) {
      console.error('Mark group split failed:', e);
      queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
    }
  };

  return {
    pendingExpenses,
    loading,
    refresh: refetch,
    approveAsPersonal,
    dismissStaged,
    markAsGroupSplit,
  };
}
