import { useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_CURRENT_USER } from '../lib/mockData';
import { queryKeys } from '../lib/queryKeys';
import {
  usePendingStagedExpensesQuery,
  registerStagedTombstone,
  evictStagedTombstone,
} from './queries/useStagedExpensesQuery';
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

  const inFlightRef = useRef<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: pendingExpenses, loading, refetch } = usePendingStagedExpensesQuery(userId);

  // Action: Approve as Personal Expense
  const approveAsPersonal = useCallback(
    async (staged: StagedExpense, customData?: CustomStagedExpenseData | string) => {
      // 1. Guard against double-clicks and concurrent processing
      if (inFlightRef.current.has(staged.id)) return false;
      inFlightRef.current.add(staged.id);
      setProcessingIds((prev) => new Set(prev).add(staged.id));

      // 2. Register tombstone immediately to block in-flight server GET clobbering
      registerStagedTombstone(staged.id);

      // 3. 0ms Optimistic removal from staged cache
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(userId),
        (prev = []) => prev.filter((item) => item.id !== staged.id)
      );

      if (DEMO_MODE) {
        inFlightRef.current.delete(staged.id);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(staged.id);
          return next;
        });
        return true;
      }
      if (!userId) {
        inFlightRef.current.delete(staged.id);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(staged.id);
          return next;
        });
        return false;
      }

      try {
        const isCustomObj = typeof customData === 'object' && customData !== null;
        const category = (isCustomObj ? customData.category : customData) || 'Other';
        const paymentMethod =
          isCustomObj && customData.paymentMethod
            ? customData.paymentMethod
            : staged.upi_ref
            ? 'UPI'
            : staged.bank_short_code
            ? 'BANK'
            : 'UPI';
        const rawDesc =
          isCustomObj && customData.description?.trim()
            ? customData.description.trim()
            : staged.merchant_name;
        const finalDescription = `[${paymentMethod}] ${rawDesc}`;
        const txType =
          isCustomObj && customData.type
            ? customData.type
            : staged.transaction_type === 'DEBIT'
            ? 'EXPENSE'
            : 'INCOME';

        // 4. Atomic conditional update: only update if still PENDING (multi-device safety)
        const { data: updatedRows, error: updateError } = await supabase
          .from('staged_expenses')
          .update({ status: 'APPROVED_PERSONAL' })
          .eq('id', staged.id)
          .eq('status', 'PENDING')
          .select('id');

        if (updateError || !updatedRows || updatedRows.length === 0) {
          console.warn('Staged expense was already processed or not pending:', updateError?.message);
          evictStagedTombstone(staged.id);
          queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
          return false;
        }

        // 5. Insert into personal_transactions
        const { error: txError } = await supabase.from('personal_transactions').insert({
          user_id: userId,
          amount: staged.amount_cents,
          type: txType,
          category,
          description: finalDescription,
          transaction_date: staged.transaction_date,
        });

        if (txError) {
          console.error('Failed to insert personal transaction:', txError.message);
          // Rollback staged expense back to PENDING
          await supabase.from('staged_expenses').update({ status: 'PENDING' }).eq('id', staged.id);
          evictStagedTombstone(staged.id);
          queryClient.invalidateQueries({ queryKey: queryKeys.stagedExpenses.pending(userId) });
          return false;
        }

        // Invalidate personal ledger to reflect new balance
        queryClient.invalidateQueries({ queryKey: queryKeys.personalLedger.all });
        return true;
      } catch (e) {
        console.error('Approve as personal exception:', e);
        evictStagedTombstone(staged.id);
        // Rollback optimistic cache removal on network failure
        queryClient.setQueryData<StagedExpense[]>(
          queryKeys.stagedExpenses.pending(userId),
          (prev = []) => {
            if (prev.some((e) => e.id === staged.id)) return prev;
            return [staged, ...prev];
          }
        );
        return false;
      } finally {
        inFlightRef.current.delete(staged.id);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(staged.id);
          return next;
        });
      }
    },
    [userId, queryClient]
  );

  // Action: Dismiss (Ignore transfer / self-deposit)
  const dismissStaged = useCallback(
    async (stagedId: string) => {
      if (inFlightRef.current.has(stagedId)) return;
      inFlightRef.current.add(stagedId);
      setProcessingIds((prev) => new Set(prev).add(stagedId));

      registerStagedTombstone(stagedId);

      // Optimistic removal
      let previousSnapshot: StagedExpense[] = [];
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(userId),
        (prev = []) => {
          previousSnapshot = prev;
          return prev.filter((item) => item.id !== stagedId);
        }
      );

      if (DEMO_MODE) {
        inFlightRef.current.delete(stagedId);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(stagedId);
          return next;
        });
        return;
      }

      try {
        await supabase
          .from('staged_expenses')
          .update({ status: 'DISMISSED' })
          .eq('id', stagedId)
          .eq('status', 'PENDING');
      } catch (e) {
        console.error('Dismiss staged failed:', e);
        evictStagedTombstone(stagedId);
        // Rollback cache
        queryClient.setQueryData(queryKeys.stagedExpenses.pending(userId), previousSnapshot);
      } finally {
        inFlightRef.current.delete(stagedId);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(stagedId);
          return next;
        });
      }
    },
    [userId, queryClient]
  );

  // Action: Mark as Split in Group
  const markAsGroupSplit = useCallback(
    async (stagedId: string) => {
      if (inFlightRef.current.has(stagedId)) return;
      inFlightRef.current.add(stagedId);
      setProcessingIds((prev) => new Set(prev).add(stagedId));

      registerStagedTombstone(stagedId);

      let previousSnapshot: StagedExpense[] = [];
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(userId),
        (prev = []) => {
          previousSnapshot = prev;
          return prev.filter((item) => item.id !== stagedId);
        }
      );

      if (DEMO_MODE) {
        inFlightRef.current.delete(stagedId);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(stagedId);
          return next;
        });
        return;
      }

      try {
        await supabase
          .from('staged_expenses')
          .update({ status: 'APPROVED_GROUP' })
          .eq('id', stagedId)
          .eq('status', 'PENDING');
      } catch (e) {
        console.error('Mark group split failed:', e);
        evictStagedTombstone(stagedId);
        queryClient.setQueryData(queryKeys.stagedExpenses.pending(userId), previousSnapshot);
      } finally {
        inFlightRef.current.delete(stagedId);
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(stagedId);
          return next;
        });
      }
    },
    [userId, queryClient]
  );

  return {
    pendingExpenses,
    loading,
    refresh: refetch,
    approveAsPersonal,
    dismissStaged,
    markAsGroupSplit,
    processingIds,
    isProcessingId: (id: string) => processingIds.has(id),
  };
}
