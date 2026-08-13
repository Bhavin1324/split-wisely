import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import type { Expense, Settlement, Group, GroupMember, SimplifiedTransaction } from '../types';

export interface FriendBalanceResult {
  totalNetBalance: number; // in cents (Positive = friend owes user, Negative = user owes friend)
  groupBreakdown: { group: Group; netBalance: number; debts: SimplifiedTransaction[] }[];
  nonGroupBalance: number; // in cents
}

/**
 * Computes the unified net balance between the current user and a friend.
 * Sums the exact net balance derived from DebtSimplifier across all shared groups,
 * plus direct non-group expenses and settlements.
 */
export function computeFriendNetBalance(params: {
  userId: string;
  friendId: string;
  groups: Group[];
  allExpenses: Expense[];
  allSettlements: Settlement[];
  allGroupMembers?: GroupMember[];
}): FriendBalanceResult {
  const { userId, friendId, groups, allExpenses, allSettlements, allGroupMembers = [] } = params;

  let totalNetBalance = 0;
  const groupBreakdown: { group: Group; netBalance: number; debts: SimplifiedTransaction[] }[] = [];

  // 1. Calculate balance per shared group using DebtSimplifier
  groups.forEach((group) => {
    const groupExpenses = allExpenses.filter((e) => e.group_id === group.id);
    const groupSettlements = allSettlements.filter((s) => s.group_id === group.id);
    const members = allGroupMembers.filter((gm) => gm.group_id === group.id);

    const memberIds = Array.from(
      new Set([
        ...groupExpenses.flatMap((e) => [
          e.payer_id,
          ...(e.splits ?? []).map((s) => s.user_id),
        ]),
        ...groupSettlements.flatMap((s) => [s.payer_id, s.payee_id]),
        ...members.map((m) => m.user_id),
      ])
    ).map((id) => ({ user_id: id }));

    const userInGroup = memberIds.some((m) => m.user_id === userId);
    const friendInGroup = memberIds.some((m) => m.user_id === friendId);

    if (!userInGroup || !friendInGroup) return;

    const calculationArgs = [
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
    ] as const;

    const debts = group.simplify_debts !== false
      ? DebtSimplifier.simplifyDebts(...calculationArgs)
      : DebtSimplifier.calculateIndividualDebts(...calculationArgs);

    let groupNetBalance = 0;
    debts.forEach((debt) => {
      if (debt.from === friendId && debt.to === userId) {
        groupNetBalance += debt.amount;
      } else if (debt.from === userId && debt.to === friendId) {
        groupNetBalance -= debt.amount;
      }
    });

    groupBreakdown.push({
      group,
      netBalance: groupNetBalance,
      debts: debts.filter((d) => (d.from === userId && d.to === friendId) || (d.from === friendId && d.to === userId)),
    });

    totalNetBalance += groupNetBalance;
  });

  // 2. Calculate non-group balance (expenses and settlements without a group_id)
  let nonGroupBalance = 0;

  const nonGroupExpenses = allExpenses.filter(
    (e) => !e.group_id || !groups.some((g) => g.id === e.group_id)
  );

  nonGroupExpenses.forEach((expense) => {
    if (!expense.splits) return;

    if (expense.payer_id === userId) {
      const friendSplit = expense.splits.find((s) => s.user_id === friendId);
      if (friendSplit) {
        nonGroupBalance += friendSplit.amount_owed;
      }
    } else if (expense.payer_id === friendId) {
      const userSplit = expense.splits.find((s) => s.user_id === userId);
      if (userSplit) {
        nonGroupBalance -= userSplit.amount_owed;
      }
    }
  });

  const nonGroupSettlements = allSettlements.filter(
    (s) => !s.group_id || !groups.some((g) => g.id === s.group_id)
  );

  nonGroupSettlements.forEach((settlement) => {
    if (settlement.payer_id === friendId && settlement.payee_id === userId) {
      nonGroupBalance -= settlement.amount;
    } else if (settlement.payer_id === userId && settlement.payee_id === friendId) {
      nonGroupBalance += settlement.amount;
    }
  });

  totalNetBalance += nonGroupBalance;

  return {
    totalNetBalance: Math.round(totalNetBalance),
    groupBreakdown,
    nonGroupBalance: Math.round(nonGroupBalance),
  };
}
