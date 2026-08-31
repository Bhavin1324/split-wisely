import { useMemo, useCallback } from 'react';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import { getProfileById, MOCK_GROUP_MEMBERS, MOCK_EXPENSES, MOCK_SETTLEMENTS } from '../lib/mockData';
import { useGroupMembers } from './supabase/useGroupsData';
import { useExpenses } from './supabase/useExpensesData';
import { useSettlements } from './supabase/useSettlementsData';
import { DEMO_MODE } from '../context/AppDataContext';
import type { Profile, Group } from '../types';

export function useGroupCalculations(groupId: string | undefined, userId: string, group: Group | undefined) {
  const { data: liveMembers, loading: membersLoading, refetch: refetchMembers } = useGroupMembers(groupId);
  const { data: liveExpenses, loading: expensesLoading, refetch: refetchExpenses } = useExpenses(groupId);
  const { data: liveSettlements, loading: settlementsLoading, refetch: refetchSettlements } = useSettlements(groupId);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchMembers(),
      refetchExpenses(),
      refetchSettlements(),
    ]);
  }, [refetchMembers, refetchExpenses, refetchSettlements]);

  const loading = membersLoading || expensesLoading || settlementsLoading;

  const groupMembers = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === groupId);
    }
    return liveMembers || [];
  }, [groupId, liveMembers]);

  const groupExpenses = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_EXPENSES.filter((e) => e.group_id === groupId).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return liveExpenses || [];
  }, [groupId, liveExpenses]);

  const groupSettlements = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_SETTLEMENTS.filter((s) => s.group_id === groupId);
    }
    return liveSettlements || [];
  }, [groupId, liveSettlements]);

  const feedItems = useMemo(() => {
    const items: { type: 'expense' | 'settlement'; data: any; date: number }[] = [
      ...groupExpenses.map((e) => ({ type: 'expense' as const, data: e, date: new Date(e.created_at).getTime() })),
      ...groupSettlements.map((s) => ({ type: 'settlement' as const, data: s, date: new Date(s.created_at).getTime() })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [groupExpenses, groupSettlements]);

  const calculationArgs = useMemo(() => {
    if (!groupId) return null;
    return [
      groupExpenses.map((e) => ({
        payer_id: e.payer_id,
        base_currency_amount: e.base_currency_amount,
        splits: (e.splits ?? []).map((s) => ({
          user_id: s.user_id,
          amount_owed: s.amount_owed,
        })),
      })),
      groupSettlements.map((s) => ({
        payer_id: s.payer_id,
        payee_id: s.payee_id,
        amount: s.amount,
      })),
      groupMembers.map((m) => ({ user_id: m.user_id })),
    ] as const;
  }, [groupId, groupExpenses, groupSettlements, groupMembers]);

  const simplifiedDebts = useMemo(() => {
    if (!calculationArgs) return [];
    return DebtSimplifier.simplifyDebts(...calculationArgs);
  }, [calculationArgs]);

  const rawDebts = useMemo(() => {
    if (!calculationArgs) return [];
    return DebtSimplifier.calculateIndividualDebts(...calculationArgs);
  }, [calculationArgs]);

  const isSimplified = group?.simplify_debts !== false;
  const displayedDebts = isSimplified ? simplifiedDebts : rawDebts;

  const { userNetBalance, userOwes, userIsOwed } = useMemo(() => {
    let balance = 0;
    let owes = 0;
    let isOwed = 0;
    displayedDebts.forEach((debt) => {
      if (debt.from === userId) {
        balance -= debt.amount;
        owes += debt.amount;
      }
      if (debt.to === userId) {
        balance += debt.amount;
        isOwed += debt.amount;
      }
    });
    return { userNetBalance: balance, userOwes: owes, userIsOwed: isOwed };
  }, [displayedDebts, userId]);

  const myDebts = useMemo(() => {
    return displayedDebts.filter(d => d.from === userId || d.to === userId);
  }, [displayedDebts, userId]);

  const getProfile = (id: string) => {
    if (DEMO_MODE) return getProfileById(id) as Profile | undefined;
    const member = liveMembers?.find(m => m.user_id === id);
    return member?.profile as Profile | undefined;
  };

  const memberLedgers = useMemo(() => {
    const ledgers = groupMembers.map(m => {
      const profile = getProfile(m.user_id);
      const name = profile?.full_name ?? m.user_id;
      return {
        userId: m.user_id,
        name,
        avatarChar: name.charAt(0),
        expensesPaid: 0,
        expenseShare: 0,
        paymentsSent: 0,
        paymentsReceived: 0,
        expensesPaidList: [] as { description: string; amount: number }[],
        expenseShareList: [] as { description: string; amount: number }[],
        paymentsSentList: [] as { description: string; amount: number }[],
        paymentsReceivedList: [] as { description: string; amount: number }[],
        netBalance: 0
      };
    });

    const ledgerMap = new Map(ledgers.map(l => [l.userId, l]));

    groupExpenses.forEach(exp => {
      const payerLedger = ledgerMap.get(exp.payer_id);
      if (payerLedger) {
        payerLedger.expensesPaid += exp.base_currency_amount;
        payerLedger.expensesPaidList.push({ description: exp.description, amount: exp.base_currency_amount });
      }

      exp.splits?.forEach(s => {
        const splitLedger = ledgerMap.get(s.user_id);
        if (splitLedger) {
          splitLedger.expenseShare += s.amount_owed;
          splitLedger.expenseShareList.push({ description: exp.description, amount: s.amount_owed });
        }
      });
    });

    groupSettlements.forEach(s => {
      const payerProfile = getProfile(s.payer_id);
      const payeeProfile = getProfile(s.payee_id);
      const payerName = payerProfile?.full_name ?? "Someone";
      const payeeName = payeeProfile?.full_name ?? "Someone";

      const payerLedger = ledgerMap.get(s.payer_id);
      if (payerLedger) {
        payerLedger.paymentsSent += s.amount;
        payerLedger.paymentsSentList.push({ description: `To ${payeeName}`, amount: s.amount });
      }

      const payeeLedger = ledgerMap.get(s.payee_id);
      if (payeeLedger) {
        payeeLedger.paymentsReceived += s.amount;
        payeeLedger.paymentsReceivedList.push({ description: `From ${payerName}`, amount: s.amount });
      }
    });

    ledgers.forEach(l => {
      l.netBalance = (l.expensesPaid - l.expenseShare) + (l.paymentsSent - l.paymentsReceived);
    });

    return ledgers.sort((a, b) => b.netBalance - a.netBalance);
  }, [groupMembers, groupExpenses, groupSettlements, getProfile]);

  return {
    groupMembers,
    refetchMembers,
    refetchExpenses,
    refetchSettlements,
    refetchAll,
    feedItems,
    displayedDebts,
    simplifiedDebts,
    rawDebts,
    isSimplified,
    userNetBalance,
    userOwes,
    userIsOwed,
    myDebts,
    getProfile,
    memberLedgers,
    groupExpenses,
    groupSettlements,
    loading
  };
}
