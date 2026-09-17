import { useMemo } from 'react';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import { getMonthYearKey } from '../utils/date';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_SETTLEMENTS, MOCK_GROUP_MEMBERS } from '../lib/mockData';
import type { Expense, Group, SimplifiedTransaction, Settlement } from '../types';

export function useDashboardData(userId: string, groups: Group[], allExpenses: Expense[], allSettlements: Settlement[]) {
  const balances = useMemo(() => {
    let totalOwed = 0;
    let totalOwing = 0;
    const groupBalances: Record<string, number> = {};
    const groupDebtsMap: Record<string, SimplifiedTransaction[]> = {};

    const settlements = DEMO_MODE ? MOCK_SETTLEMENTS : (allSettlements || []);
    const groupMembers = DEMO_MODE ? MOCK_GROUP_MEMBERS : [];

    // Pre-bucket expenses and settlements by group_id in a single O(N) pass
    const expensesByGroup = new Map<string, Expense[]>();
    for (const exp of allExpenses) {
      if (!exp.group_id) continue;
      const list = expensesByGroup.get(exp.group_id);
      if (list) {
        list.push(exp);
      } else {
        expensesByGroup.set(exp.group_id, [exp]);
      }
    }

    const settlementsByGroup = new Map<string, Settlement[]>();
    for (const st of settlements) {
      if (!st.group_id) continue;
      const list = settlementsByGroup.get(st.group_id);
      if (list) {
        list.push(st);
      } else {
        settlementsByGroup.set(st.group_id, [st]);
      }
    }

    groups.forEach((group) => {
      const groupExpenses = expensesByGroup.get(group.id) || [];
      const groupSettlements = settlementsByGroup.get(group.id) || [];
      const members = DEMO_MODE ? groupMembers.filter((gm) => gm.group_id === group.id) : [];

      let memberIds: { user_id: string }[];
      if (DEMO_MODE) {
        memberIds = members.map((m) => ({ user_id: m.user_id }));
      } else {
        const uniqueMemberIds = new Set<string>();
        for (const e of groupExpenses) {
          if (e.payer_id) uniqueMemberIds.add(e.payer_id);
          if (e.splits) {
            for (const s of e.splits) {
              if (s.user_id) uniqueMemberIds.add(s.user_id);
            }
          }
        }
        memberIds = Array.from(uniqueMemberIds, (id) => ({ user_id: id }));
      }

      const debts = group?.simplify_debts !== false
        ? DebtSimplifier.simplifyDebts(
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
            memberIds,
          )
        : DebtSimplifier.calculateIndividualDebts(
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
            memberIds,
          );

      let groupOwed = 0;
      let groupOwing = 0;

      debts.forEach((d) => {
        if (d.from === userId) {
          totalOwing += d.amount;
          groupOwing += d.amount;
        }
        if (d.to === userId) {
          totalOwed += d.amount;
          groupOwed += d.amount;
        }
      });

      groupBalances[group.id] = groupOwed - groupOwing;
      groupDebtsMap[group.id] = debts;
    });

    return {
      totalBalance: totalOwed - totalOwing,
      youOwe: totalOwing,
      youAreOwed: totalOwed,
      groupBalances,
      groupDebtsMap,
    };
  }, [userId, groups, allExpenses, allSettlements]);

  const expensesByMonth = useMemo(() => {
    const sorted = [...allExpenses].sort((a, b) => {
      const dateA = a.expense_date || a.created_at || '';
      const dateB = b.expense_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    });

    const monthMap = new Map<string, Expense[]>();

    sorted.forEach((expense) => {
      const key = getMonthYearKey(expense.expense_date ?? expense.created_at);
      const existing = monthMap.get(key);
      if (existing) {
        existing.push(expense);
      } else {
        monthMap.set(key, [expense]);
      }
    });

    return Array.from(monthMap.entries()).map(([month, exps]) => ({
      month,
      expenses: exps,
    }));
  }, [allExpenses]);

  return {
    balances,
    expensesByMonth,
  };
}
