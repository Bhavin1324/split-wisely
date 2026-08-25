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

    const settlements = DEMO_MODE ? MOCK_SETTLEMENTS : allSettlements;
    const groupMembers = DEMO_MODE ? MOCK_GROUP_MEMBERS : [];

    groups.forEach((group) => {
      const groupExpenses = allExpenses.filter((e) => e.group_id === group.id);
      const groupSettlements = settlements.filter((s) => s.group_id === group.id);
      const members = DEMO_MODE ? groupMembers.filter((gm) => gm.group_id === group.id) : [];

      const memberIds = DEMO_MODE
        ? members.map((m) => ({ user_id: m.user_id }))
        : Array.from(
            new Set(
              groupExpenses.flatMap((e) => [
                e.payer_id,
                ...(e.splits ?? []).map((s) => s.user_id),
              ]),
            ),
          ).map((id) => ({ user_id: id }));

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
    const sorted = [...allExpenses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const monthMap = new Map<string, Expense[]>();

    sorted.forEach((expense) => {
      const key = getMonthYearKey(expense.created_at);
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
