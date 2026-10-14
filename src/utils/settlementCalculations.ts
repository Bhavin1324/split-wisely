import { DebtSimplifier, type DebtExpense, type DebtSettlement, type DebtGroupMember } from '../core/domain/DebtSimplifier';
import type { Expense, Settlement, Group } from '../types';

export interface GroupDebtDetail {
  group: Group;
  debtorId: string;
  creditorId: string;
  amountCents: number;
  isSimplified: boolean;
}

export interface GroupPairwiseDebtResult {
  payerOwesPayeeCents: number;
  payeeOwesPayerCents: number;
  isSimplified: boolean;
}

/**
 * Computes the exact pairwise debt between two members inside a group,
 * strictly honoring the group's `simplify_debts` setting.
 */
export function computeGroupSettlementDebts(params: {
  group: Group;
  expenses: Expense[];
  settlements: Settlement[];
  payerId: string;
  payeeId: string;
}): GroupPairwiseDebtResult {
  const { group, expenses, settlements, payerId, payeeId } = params;

  if (!payerId || !payeeId || payerId === payeeId) {
    return { payerOwesPayeeCents: 0, payeeOwesPayerCents: 0, isSimplified: group?.simplify_debts !== false };
  }

  const isSimplified = group?.simplify_debts !== false;

  // Extract all distinct participating member IDs across expenses and settlements
  const memberIdSet = new Set<string>();
  for (const e of expenses) {
    if (e.payer_id) memberIdSet.add(e.payer_id);
    if (Array.isArray(e.splits)) {
      for (const sp of e.splits) {
        if (sp.user_id) memberIdSet.add(sp.user_id);
      }
    }
  }
  for (const s of settlements) {
    if (s.payer_id) memberIdSet.add(s.payer_id);
    if (s.payee_id) memberIdSet.add(s.payee_id);
  }
  memberIdSet.add(payerId);
  memberIdSet.add(payeeId);

  const groupMembers: DebtGroupMember[] = Array.from(memberIdSet).map((id) => ({ user_id: id }));

  // Normalize expenses to DebtExpense format with defensive fallbacks for both Demo and Live Supabase
  const debtExpenses: DebtExpense[] = expenses.map((e) => ({
    payer_id: e.payer_id,
    base_currency_amount: e.base_currency_amount ?? e.total_amount ?? 0,
    splits: (e.splits ?? []).map((sp) => ({
      user_id: sp.user_id,
      amount_owed: sp.amount_owed ?? 0,
    })),
  }));

  // Normalize settlements to DebtSettlement format
  const debtSettlements: DebtSettlement[] = settlements.map((s) => ({
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: s.amount ?? 0,
  }));

  const debts = isSimplified
    ? DebtSimplifier.simplifyDebts(debtExpenses, debtSettlements, groupMembers)
    : DebtSimplifier.calculateIndividualDebts(debtExpenses, debtSettlements, groupMembers);

  const payerOwes = debts.find((d) => d.from === payerId && d.to === payeeId)?.amount ?? 0;
  const payeeOwes = debts.find((d) => d.from === payeeId && d.to === payerId)?.amount ?? 0;

  return {
    payerOwesPayeeCents: Math.round(payerOwes),
    payeeOwesPayerCents: Math.round(payeeOwes),
    isSimplified,
  };
}

/**
 * Computes all open group debts in both directions across shared groups between payerId and payeeId.
 * Guarantees that each group's debt respects its individual `simplify_debts` setting.
 */
export function computeAllGroupSettlementDebts(params: {
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  payerId: string;
  payeeId: string;
}): GroupDebtDetail[] {
  const { groups, expenses, settlements, payerId, payeeId } = params;

  if (!payerId || !payeeId || payerId === payeeId) return [];

  // Pre-bucket expenses and settlements by group_id in a single O(E + S) pass
  const expensesByGroup = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (!e.group_id) continue;
    let list = expensesByGroup.get(e.group_id);
    if (!list) {
      list = [];
      expensesByGroup.set(e.group_id, list);
    }
    list.push(e);
  }

  const settlementsByGroup = new Map<string, Settlement[]>();
  for (const s of settlements) {
    if (!s.group_id) continue;
    let list = settlementsByGroup.get(s.group_id);
    if (!list) {
      list = [];
      settlementsByGroup.set(s.group_id, list);
    }
    list.push(s);
  }

  const results: GroupDebtDetail[] = [];

  for (const group of groups) {
    const gExp = expensesByGroup.get(group.id) || [];
    const gSett = settlementsByGroup.get(group.id) || [];
    if (gExp.length === 0 && gSett.length === 0) continue;

    // Check participation
    const isPayerInvolved =
      gExp.some((e) => e.payer_id === payerId || e.splits?.some((sp) => sp.user_id === payerId)) ||
      gSett.some((s) => s.payer_id === payerId || s.payee_id === payerId);
    const isPayeeInvolved =
      gExp.some((e) => e.payer_id === payeeId || e.splits?.some((sp) => sp.user_id === payeeId)) ||
      gSett.some((s) => s.payer_id === payeeId || s.payee_id === payeeId);

    if (!isPayerInvolved || !isPayeeInvolved) continue;

    const { payerOwesPayeeCents, payeeOwesPayerCents, isSimplified } = computeGroupSettlementDebts({
      group,
      expenses: gExp,
      settlements: gSett,
      payerId,
      payeeId,
    });

    if (payerOwesPayeeCents > 0) {
      results.push({
        group,
        debtorId: payerId,
        creditorId: payeeId,
        amountCents: payerOwesPayeeCents,
        isSimplified,
      });
    }

    if (payeeOwesPayerCents > 0) {
      results.push({
        group,
        debtorId: payeeId,
        creditorId: payerId,
        amountCents: payeeOwesPayerCents,
        isSimplified,
      });
    }
  }

  return results;
}
