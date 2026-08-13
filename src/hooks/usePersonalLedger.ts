import { useState, useEffect, useCallback, useMemo } from 'react';
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

export function usePersonalLedger(monthYear: string) {
  const { user } = useAuth();
  const userId = user?.id ?? 'user-1';

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [budget, setBudget] = useState<PersonalBudget | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);

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
        console.warn('Falling back to local transactions state:', txRes.error.message);
        setTransactions([...MOCK_PERSONAL_TRANSACTIONS]);
      } else {
        setTransactions(txRes.data as PersonalTransaction[] || []);
      }

      if (budgetRes.error && budgetRes.error.code !== 'PGRST116') {
        console.warn('Falling back to local budget state:', budgetRes.error.message);
        setBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null);
      } else {
        setBudget(budgetRes.data as PersonalBudget || null);
      }
    } catch (e) {
      console.error('Error fetching personal ledger:', e);
      setTransactions([...MOCK_PERSONAL_TRANSACTIONS]);
      setBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null);
    } finally {
      setLoading(false);
    }
  }, [userId, monthYear]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Math Calculations for month M
  const summary: PersonalLedgerSummary = useMemo(() => {
    const [targetYearStr, targetMonthStr] = monthYear.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthStr, 10); // 1-12

    const monthStartIso = `${monthYear}-01T00:00:00.000Z`;

    // 1. Opening Balance (Sum of prior months < M)
    let openingBalance = 0;
    transactions.forEach((tx) => {
      if (tx.transaction_date < monthStartIso) {
        if (tx.type === 'INCOME') openingBalance += tx.amount;
        if (tx.type === 'EXPENSE') openingBalance -= tx.amount;
      }
    });

    // 2. Month M transactions
    const monthTransactions = transactions.filter((tx) => {
      return tx.transaction_date.startsWith(monthYear);
    });

    let totalIncome = 0;
    let totalExpense = 0;

    monthTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });

    // 3. Closing Balance
    const closingBalance = openingBalance + totalIncome - totalExpense;

    // 4. Budget & Safe Daily Limit
    const budgetAmount = budget?.budget_amount ?? null;
    const remainingBudget = budgetAmount !== null ? budgetAmount - totalExpense : null;

    // Days Remaining Calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    let daysRemaining = 0;
    if (targetYear === currentYear && targetMonth === currentMonth) {
      const today = now.getDate();
      daysRemaining = Math.max(1, totalDaysInMonth - today + 1);
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
      .filter((t) => t.transaction_date.startsWith(monthYear))
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
    const newTx: PersonalTransaction = {
      id: uuidv4(),
      user_id: userId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description || '',
      transaction_date: data.transaction_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (DEMO_MODE) {
      MOCK_PERSONAL_TRANSACTIONS.unshift(newTx);
      setTransactions((prev) => [newTx, ...prev]);
      return;
    }

    try {
      const { error } = await supabase.from('personal_transactions').insert({
        user_id: userId,
        type: data.type,
        amount: data.amount,
        category: data.category,
        description: data.description || '',
        transaction_date: data.transaction_date || new Date().toISOString(),
      });
      if (error) {
        console.warn('Supabase insert fallback:', error.message);
        MOCK_PERSONAL_TRANSACTIONS.unshift(newTx);
        setTransactions((prev) => [newTx, ...prev]);
      } else {
        await fetchLedgerData();
      }
    } catch (e) {
      console.error('Add transaction failed:', e);
      MOCK_PERSONAL_TRANSACTIONS.unshift(newTx);
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  // Action: Delete Transaction
  const deleteTransaction = async (id: string) => {
    if (DEMO_MODE) {
      const idx = MOCK_PERSONAL_TRANSACTIONS.findIndex((t) => t.id === id);
      if (idx !== -1) MOCK_PERSONAL_TRANSACTIONS.splice(idx, 1);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
      if (error) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } else {
        await fetchLedgerData();
      }
    } catch (e) {
      console.error('Delete transaction failed:', e);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
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
    if (DEMO_MODE) {
      const idx = MOCK_PERSONAL_TRANSACTIONS.findIndex((t) => t.id === id);
      if (idx !== -1) {
        MOCK_PERSONAL_TRANSACTIONS[idx] = {
          ...MOCK_PERSONAL_TRANSACTIONS[idx],
          ...data,
        };
      }
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('personal_transactions')
        .update({
          type: data.type,
          amount: data.amount,
          category: data.category,
          description: data.description || '',
          transaction_date: data.transaction_date,
        })
        .eq('id', id);

      if (error) {
        console.warn('Supabase update fallback:', error.message);
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data } : t))
        );
      } else {
        await fetchLedgerData();
      }
    } catch (e) {
      console.error('Update transaction failed:', e);
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data } : t))
      );
    }
  };

  // Action: Set Monthly Budget
  const setMonthlyBudget = async (amountCents: number | null) => {
    const updatedBudget: PersonalBudget = {
      id: budget?.id || uuidv4(),
      user_id: userId,
      month_year: monthYear,
      budget_amount: amountCents,
      created_at: budget?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (DEMO_MODE) {
      const existingIdx = MOCK_PERSONAL_BUDGETS.findIndex((b) => b.month_year === monthYear);
      if (existingIdx !== -1) {
        MOCK_PERSONAL_BUDGETS[existingIdx].budget_amount = amountCents;
      } else {
        MOCK_PERSONAL_BUDGETS.push(updatedBudget);
      }
      setBudget(updatedBudget);
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
        console.warn('Supabase budget upsert fallback:', error.message);
        setBudget(updatedBudget);
      } else {
        await fetchLedgerData();
      }
    } catch (e) {
      console.error('Set budget failed:', e);
      setBudget(updatedBudget);
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

