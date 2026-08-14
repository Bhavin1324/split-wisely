import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_PERSONAL_TRANSACTIONS, MOCK_PERSONAL_BUDGETS } from '../lib/mockData';
import type { PersonalTransaction, PersonalBudget, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface PersonalLedgerSummary {
  openingBalance: number; // in cents
  totalIncome: number;    // in cents
  totalExpense: number;   // in cents
  closingBalance: number; // in cents
  budgetAmount: number | null; // in cents
  remainingBudget: number | null; // in cents
  safeDailyLimit: number | null; // in cents per day
  daysRemaining: number;
}

const getTxMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.length >= 7 && dateStr[4] === '-') {
    return dateStr.substring(0, 7);
  }
  return dayjs(dateStr).format('YYYY-MM');
};

export function usePersonalLedger(monthYear: string) {
  const { user } = useAuth();
  const userId = user?.id ?? 'user-1';

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [budget, setBudget] = useState<PersonalBudget | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLedgerData = useCallback(async () => {
    if (DEMO_MODE) {
      const userTx = MOCK_PERSONAL_TRANSACTIONS.filter((t) => t.user_id === userId || userId === 'user-1');
      const userB = MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) ?? null;
      setTransactions([...userTx]);
      setBudget(userB ? { ...userB } : null);
      setLoading(false);
      return;
    }

    try {
      const [txRes, budgetRes] = await Promise.all([
        supabase
          .from('personal_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('personal_budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('month_year', monthYear)
          .maybeSingle(),
      ]);

      if (txRes.error) {
        console.warn('Personal transactions fetch fallback:', txRes.error.message);
        setTransactions([...MOCK_PERSONAL_TRANSACTIONS]);
      } else {
        setTransactions((txRes.data as PersonalTransaction[]) || []);
      }

      if (budgetRes.error && budgetRes.error.code !== 'PGRST116') {
        console.warn('Personal budget fetch fallback:', budgetRes.error.message);
        setBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null);
      } else {
        setBudget((budgetRes.data as PersonalBudget) || null);
      }
    } catch (e) {
      console.error('Error fetching personal ledger:', e);
      setTransactions([...MOCK_PERSONAL_TRANSACTIONS]);
      setBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null);
    } finally {
      setLoading(false);
    }
  }, [userId, monthYear]);

  // Initial Fetch and Realtime Subscription
  useEffect(() => {
    fetchLedgerData();

    if (DEMO_MODE || !userId || userId === 'user-1') return;

    const channelName = `realtime-personal-ledger-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personal_transactions', filter: `user_id=eq.${userId}` },
        () => fetchLedgerData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personal_budgets', filter: `user_id=eq.${userId}` },
        () => fetchLedgerData()
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime personal ledger error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchLedgerData]);

  // Math Calculations for month M
  const summary: PersonalLedgerSummary = useMemo(() => {
    const [targetYearStr, targetMonthStr] = monthYear.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthStr, 10);

    // 1. Opening Balance (Sum of prior months < M)
    let openingBalance = 0;
    transactions.forEach((tx) => {
      const txMonth = getTxMonth(tx.transaction_date);
      if (txMonth && txMonth < monthYear) {
        if (tx.type === 'INCOME') openingBalance += tx.amount;
        if (tx.type === 'EXPENSE') openingBalance -= tx.amount;
      }
    });

    // 2. Month M transactions
    const monthTransactions = transactions.filter((tx) => getTxMonth(tx.transaction_date) === monthYear);
    let totalIncome = 0;
    let totalExpense = 0;

    monthTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });

    // 3. Closing Balance & Budgets
    const closingBalance = openingBalance + totalIncome - totalExpense;
    const budgetAmount = budget?.budget_amount ?? null;
    const remainingBudget = budgetAmount !== null ? budgetAmount - totalExpense : null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    let daysRemaining = 0;
    if (targetYear === currentYear && targetMonth === currentMonth) {
      daysRemaining = Math.max(1, totalDaysInMonth - now.getDate() + 1);
    } else if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth)) {
      daysRemaining = 0;
    } else {
      daysRemaining = totalDaysInMonth;
    }

    let safeDailyLimit: number | null = null;
    if (remainingBudget !== null && daysRemaining > 0) {
      safeDailyLimit = Math.max(0, Math.floor(remainingBudget / daysRemaining));
    }

    return {
      openingBalance,
      totalIncome,
      totalExpense,
      closingBalance,
      budgetAmount,
      remainingBudget,
      safeDailyLimit,
      daysRemaining,
    };
  }, [transactions, budget, monthYear]);

  // Current Month Transactions (Sorted newest first)
  const currentMonthTransactions = useMemo(() => {
    return transactions
      .filter((t) => getTxMonth(t.transaction_date) === monthYear)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, monthYear]);

  // Action: Add Transaction
  const addTransaction = async (data: {
    type: TransactionType;
    amount: number; // in cents
    category: string;
    description: string;
    transaction_date: string;
  }) => {
    const txDate = data.transaction_date || new Date().toISOString();
    const newTx: PersonalTransaction = {
      id: uuidv4(),
      user_id: userId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description || '',
      transaction_date: txDate,
      created_at: new Date().toISOString(),
    };

    // Immediate local optimistic update
    setTransactions((prev) => [newTx, ...prev]);

    if (DEMO_MODE) {
      MOCK_PERSONAL_TRANSACTIONS.unshift(newTx);
      return;
    }

    try {
      const { data: inserted, error } = await supabase
        .from('personal_transactions')
        .insert({
          user_id: userId,
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description || '',
          transaction_date: txDate,
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert error, keeping fallback:', error.message);
      } else if (inserted) {
        const insertedTx = inserted as PersonalTransaction;
        setTransactions((prev) => [insertedTx, ...prev.filter((t) => t.id !== newTx.id && t.id !== insertedTx.id)]);
      }
      await fetchLedgerData();
    } catch (e) {
      console.error('Add transaction failed:', e);
    }
  };

  // Action: Delete Transaction
  const deleteTransaction = async (id: string) => {
    // Immediate local optimistic update
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (DEMO_MODE) {
      const idx = MOCK_PERSONAL_TRANSACTIONS.findIndex((t) => t.id === id);
      if (idx !== -1) MOCK_PERSONAL_TRANSACTIONS.splice(idx, 1);
      return;
    }

    try {
      const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
      await fetchLedgerData();
    } catch (e) {
      console.error('Delete transaction failed:', e);
    }
  };

  // Action: Update Transaction
  const updateTransaction = async (
    id: string,
    data: {
      type: TransactionType;
      amount: number; // in cents
      category: string;
      description: string;
      transaction_date: string;
    }
  ) => {
    // Immediate local optimistic update
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );

    if (DEMO_MODE) {
      const idx = MOCK_PERSONAL_TRANSACTIONS.findIndex((t) => t.id === id);
      if (idx !== -1) {
        MOCK_PERSONAL_TRANSACTIONS[idx] = { ...MOCK_PERSONAL_TRANSACTIONS[idx], ...data };
      }
      return;
    }

    try {
      const { data: updated, error } = await supabase
        .from('personal_transactions')
        .update({
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description || '',
          transaction_date: data.transaction_date,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Supabase update fallback:', error.message);
      } else if (updated) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? (updated as PersonalTransaction) : t))
        );
      }
      await fetchLedgerData();
    } catch (e) {
      console.error('Update transaction failed:', e);
    }
  };

  // Action: Set Monthly Budget
  const setMonthlyBudget = async (amountCents: number | null) => {
    const updatedBudget: PersonalBudget | null =
      amountCents !== null
        ? {
            id: budget?.id || uuidv4(),
            user_id: userId,
            month_year: monthYear,
            budget_amount: amountCents,
            created_at: budget?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : null;

    setBudget(updatedBudget);

    if (DEMO_MODE) {
      const existingIdx = MOCK_PERSONAL_BUDGETS.findIndex((b) => b.month_year === monthYear);
      if (existingIdx !== -1) {
        if (amountCents === null) {
          MOCK_PERSONAL_BUDGETS.splice(existingIdx, 1);
        } else {
          MOCK_PERSONAL_BUDGETS[existingIdx].budget_amount = amountCents;
        }
      } else if (updatedBudget) {
        MOCK_PERSONAL_BUDGETS.push(updatedBudget);
      }
      return;
    }

    try {
      const { error } = await supabase.from('personal_budgets').upsert(
        {
          user_id: userId,
          month_year: monthYear,
          budget_amount: amountCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,month_year' }
      );
      if (error) {
        console.error('Supabase budget upsert error:', error.message);
        throw error;
      }
      await fetchLedgerData();
    } catch (e) {
      console.error('Set budget failed:', e);
      throw e;
    }
  };

  return {
    transactions: currentMonthTransactions,
    budget,
    summary,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setMonthlyBudget,
    refetch: fetchLedgerData,
  };
}
