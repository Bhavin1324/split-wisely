import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_PERSONAL_TRANSACTIONS, MOCK_PERSONAL_BUDGETS, MOCK_EXPENSES, MOCK_GROUPS } from '../lib/mockData';
import type { PersonalTransaction, PersonalBudget, TransactionType, Expense, Group } from '../types';
import type {
  GroupSpendingBreakdown,
  PersonalSpendingBreakdown,
  HybridTotals,
  PersonalCategoryBreakdown,
  PersonalPaymentMethodBreakdown,
} from '../utils/analyticsCalculations';
import { v4 as uuidv4 } from 'uuid';

import {
  calculateLedgerSummary,
  getTxMonth,
  type PersonalLedgerSummary,
} from '../utils/personalLedgerCalculations';

export type { PersonalLedgerSummary };
export { getTxMonth };

export function usePersonalLedger(
  monthYear: string,
  liveExpenses?: Expense[],
  groups?: Group[]
) {
  const { user } = useAuth();
  const userId = user?.id ?? 'user-1';
  const prevMonthYear = dayjs(`${monthYear}-01`).subtract(1, 'month').format('YYYY-MM');

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [budget, setBudget] = useState<PersonalBudget | null>(null);
  const [previousBudget, setPreviousBudget] = useState<PersonalBudget | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLedgerData = useCallback(async () => {
    if (DEMO_MODE) {
      const userTx = MOCK_PERSONAL_TRANSACTIONS.filter((t) => t.user_id === userId || userId === 'user-1');
      const userB = MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) ?? null;
      const prevB = MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === prevMonthYear) ?? null;
      setTransactions([...userTx]);
      setBudget(userB ? { ...userB } : null);
      setPreviousBudget(prevB ? { ...prevB } : null);
      setLoading(false);
      return;
    }

    try {
      const [txRes, budgetRes, prevBudgetRes] = await Promise.all([
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
        supabase
          .from('personal_budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('month_year', prevMonthYear)
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

      if (prevBudgetRes.error && prevBudgetRes.error.code !== 'PGRST116') {
        setPreviousBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === prevMonthYear) || null);
      } else {
        setPreviousBudget((prevBudgetRes.data as PersonalBudget) || null);
      }
    } catch (e) {
      console.error('Error fetching personal ledger:', e);
      setTransactions([...MOCK_PERSONAL_TRANSACTIONS]);
      setBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === monthYear) || null);
      setPreviousBudget(MOCK_PERSONAL_BUDGETS.find((b) => b.month_year === prevMonthYear) || null);
    } finally {
      setLoading(false);
    }
  }, [userId, monthYear, prevMonthYear]);

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

  const effectiveGroups = useMemo(() => {
    if (groups && groups.length > 0) return groups;
    return DEMO_MODE ? MOCK_GROUPS : [];
  }, [groups]);

  const effectiveExpenses = useMemo(() => {
    if (liveExpenses && liveExpenses.length > 0) return liveExpenses;
    return DEMO_MODE ? MOCK_EXPENSES : [];
  }, [liveExpenses]);

  // Convert user's splits from group expenses into PersonalTransaction objects
  const groupTransactions = useMemo(() => {
    if (!effectiveExpenses || effectiveExpenses.length === 0) return [];

    const groupNameMap = new Map<string, string>();
    effectiveGroups.forEach((g) => groupNameMap.set(g.id, g.name));

    const result: PersonalTransaction[] = [];

    effectiveExpenses.forEach((ex) => {
      const userSplit = ex.splits?.find((s) => s.user_id === userId);
      if (!userSplit || userSplit.amount_owed <= 0) return;

      const dateStr = ex.expense_date || ex.created_at;
      const groupName = ex.group_id ? (groupNameMap.get(ex.group_id) || 'Group Expense') : 'Shared Bill';

      const categoryName =
        typeof ex.category === 'object' && ex.category?.name
          ? ex.category.name
          : typeof ex.category === 'string'
          ? ex.category
          : 'Other';

      result.push({
        id: `group-split-${ex.id}-${userSplit.user_id || 'user'}`,
        user_id: userId,
        type: 'EXPENSE',
        amount: userSplit.amount_owed,
        category: categoryName,
        description: ex.description,
        transaction_date: dateStr,
        created_at: ex.created_at,
        source: 'GROUP',
        group_id: ex.group_id || undefined,
        group_name: groupName,
        expense_id: ex.id,
        raw_expense: ex,
        total_expense_amount: ex.total_amount,
      });
    });

    return result;
  }, [effectiveExpenses, effectiveGroups, userId]);

  // Combined transactions (Solo + Group shares)
  const combinedTransactions = useMemo(() => {
    return [...transactions, ...groupTransactions];
  }, [transactions, groupTransactions]);

  // Math Calculations for month M (True Cost including group shares)
  const summary: PersonalLedgerSummary = useMemo(() => {
    return calculateLedgerSummary({ transactions: combinedTransactions, budget, previousBudget, monthYear });
  }, [combinedTransactions, budget, previousBudget, monthYear]);

  // Current Month Transactions (Sorted newest first)
  const currentMonthTransactions = useMemo(() => {
    return combinedTransactions
      .filter((t) => getTxMonth(t.transaction_date) === monthYear)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [combinedTransactions, monthYear]);

  // Breakdown Calculations for Breakdown Modal (Solo vs Group)
  const currPersonal = useMemo(() => {
    return transactions.filter(
      (t) => t.type === 'EXPENSE' && getTxMonth(t.transaction_date) === monthYear
    );
  }, [transactions, monthYear]);

  const currGroupExpenses = useMemo(() => {
    return effectiveExpenses.filter(
      (ex) => getTxMonth(ex.expense_date || ex.created_at) === monthYear
    );
  }, [effectiveExpenses, monthYear]);

  const hybrid: HybridTotals = useMemo(() => {
    let personalExpenseCents = 0;
    currPersonal.forEach((t) => (personalExpenseCents += t.amount));

    let groupNetShareCents = 0;
    let totalOutlayCents = personalExpenseCents;

    currGroupExpenses.forEach((ex) => {
      const userSplit = ex.splits?.find((s) => s.user_id === userId);
      if (userSplit) {
        groupNetShareCents += userSplit.amount_owed;
      }
      if (ex.payer_id === userId) {
        totalOutlayCents += ex.total_amount;
      }
    });

    const totalTrueCostCents = personalExpenseCents + groupNetShareCents;
    const reimbursementPendingCents = Math.max(0, totalOutlayCents - totalTrueCostCents);

    return {
      personalExpenseCents,
      groupNetShareCents,
      totalTrueCostCents,
      totalOutlayCents,
      reimbursementPendingCents,
    };
  }, [currPersonal, currGroupExpenses, userId]);

  const groupBreakdowns: GroupSpendingBreakdown[] = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        groupType?: string;
        myShareCents: number;
        totalGroupVolumeCents: number;
        myPaidOutlayCents: number;
        expenseCount: number;
      }
    >();

    currGroupExpenses.forEach((ex) => {
      const gId = ex.group_id || 'standalone';
      const grpObj = effectiveGroups.find((g) => g.id === gId);
      const grpName = grpObj ? grpObj.name : 'Shared Bills';

      if (!groupMap.has(gId)) {
        groupMap.set(gId, {
          groupId: gId,
          groupName: grpName,
          myShareCents: 0,
          totalGroupVolumeCents: 0,
          myPaidOutlayCents: 0,
          expenseCount: 0,
        });
      }

      const gData = groupMap.get(gId)!;
      gData.totalGroupVolumeCents += ex.total_amount;
      gData.expenseCount += 1;

      const userSplit = ex.splits?.find((s) => s.user_id === userId);
      if (userSplit) {
        gData.myShareCents += userSplit.amount_owed;
      }

      if (ex.payer_id === userId) {
        gData.myPaidOutlayCents += ex.total_amount;
      }
    });

    return Array.from(groupMap.values())
      .map((g) => ({
        ...g,
        percentageOfTotalGroupShares:
          hybrid.groupNetShareCents > 0
            ? Math.round((g.myShareCents / hybrid.groupNetShareCents) * 100)
            : 0,
      }))
      .sort((a, b) => b.myShareCents - a.myShareCents);
  }, [currGroupExpenses, effectiveGroups, hybrid.groupNetShareCents, userId]);

  const personalBreakdown: PersonalSpendingBreakdown = useMemo(() => {
    const personalCatMap = new Map<string, { totalCents: number; count: number }>();
    const methodMap = new Map<string, { totalCents: number; count: number }>();

    currPersonal.forEach((tx) => {
      const cat = tx.category || 'Other';
      const cVal = personalCatMap.get(cat) || { totalCents: 0, count: 0 };
      cVal.totalCents += tx.amount;
      cVal.count += 1;
      personalCatMap.set(cat, cVal);

      let method = 'UPI';
      const match = (tx.description || '').match(/^\[(UPI|CARD|CASH|BANK)\]/i);
      if (match) {
        method = match[1].toUpperCase();
      }
      const mVal = methodMap.get(method) || { totalCents: 0, count: 0 };
      mVal.totalCents += tx.amount;
      mVal.count += 1;
      methodMap.set(method, mVal);
    });

    const personalCategories: PersonalCategoryBreakdown[] = Array.from(personalCatMap.entries())
      .map(([name, val]) => ({
        name,
        totalCents: val.totalCents,
        count: val.count,
        percentage:
          hybrid.personalExpenseCents > 0
            ? Math.round((val.totalCents / hybrid.personalExpenseCents) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    const personalPaymentMethods: PersonalPaymentMethodBreakdown[] = Array.from(methodMap.entries())
      .map(([method, val]) => ({
        method: method as any,
        totalCents: val.totalCents,
        count: val.count,
        percentage:
          hybrid.personalExpenseCents > 0
            ? Math.round((val.totalCents / hybrid.personalExpenseCents) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    return {
      totalExpenseCents: hybrid.personalExpenseCents,
      transactionCount: currPersonal.length,
      averageTxCents:
        currPersonal.length > 0
          ? Math.round(hybrid.personalExpenseCents / currPersonal.length)
          : 0,
      categories: personalCategories,
      paymentMethods: personalPaymentMethods,
    };
  }, [currPersonal, hybrid.personalExpenseCents]);

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
  const setMonthlyBudget = async (
    amountCents: number | null,
    openingBalanceCents: number | null = null,
    isManual: boolean = false,
    dynamicBudgetEnabled: boolean = false
  ) => {
    const hasData = amountCents !== null || isManual || dynamicBudgetEnabled;
    const updatedBudget: PersonalBudget | null = hasData
      ? {
          id: budget?.id || uuidv4(),
          user_id: userId,
          month_year: monthYear,
          budget_amount: amountCents,
          opening_balance: isManual ? openingBalanceCents : null,
          is_opening_manual: isManual,
          dynamic_budget_enabled: dynamicBudgetEnabled,
          created_at: budget?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null;

    setBudget(updatedBudget);

    if (DEMO_MODE) {
      const existingIdx = MOCK_PERSONAL_BUDGETS.findIndex((b) => b.month_year === monthYear);
      if (existingIdx !== -1) {
        if (!hasData) {
          MOCK_PERSONAL_BUDGETS.splice(existingIdx, 1);
        } else {
          MOCK_PERSONAL_BUDGETS[existingIdx].budget_amount = amountCents;
          MOCK_PERSONAL_BUDGETS[existingIdx].opening_balance = isManual ? openingBalanceCents : null;
          MOCK_PERSONAL_BUDGETS[existingIdx].is_opening_manual = isManual;
          MOCK_PERSONAL_BUDGETS[existingIdx].dynamic_budget_enabled = dynamicBudgetEnabled;
        }
      } else if (updatedBudget) {
        MOCK_PERSONAL_BUDGETS.push(updatedBudget);
      }
      return;
    }

    try {
      if (updatedBudget) {
        const { error } = await supabase.from('personal_budgets').upsert(
          {
            user_id: userId,
            month_year: monthYear,
            budget_amount: amountCents,
            opening_balance: isManual ? openingBalanceCents : null,
            is_opening_manual: isManual,
            dynamic_budget_enabled: dynamicBudgetEnabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month_year' }
        );
        if (error) {
          console.error('Supabase budget upsert error:', error.message);
          throw error;
        }
      } else if (budget?.id) {
        const { error } = await supabase.from('personal_budgets').delete().eq('id', budget.id);
        if (error) {
          console.error('Supabase budget delete error:', error.message);
          throw error;
        }
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
    hybrid,
    groupBreakdowns,
    personalBreakdown,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setMonthlyBudget,
    refetch: fetchLedgerData,
  };
}
