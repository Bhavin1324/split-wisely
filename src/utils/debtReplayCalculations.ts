import { DebtSimplifier, type DebtExpense, type DebtSettlement, type DebtGroupMember } from '../core/domain/DebtSimplifier';
import { formatCents } from './currency';

export interface ExpenseReplayStep {
  stepIndex: number;
  totalSteps: number;
  expenseId: string;
  description: string;
  date: string;
  payerId: string;
  payerName: string;
  totalAmountCents: number;
  myPaidCents: number;
  myShareCents: number;
  deltaCents: number;
  previousBalanceCents: number;
  newBalanceCents: number;
  allRunningBalances: Record<string, number>;
  explanation: string;
  isUserInvolved: boolean;
}

export interface GroupTallyMember {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  netBalanceCents: number;
  status: 'OWES' | 'OWED' | 'SETTLED';
}

export interface SettlementReplayStep {
  stepIndex: number;
  totalSteps: number;
  fromId: string;
  fromName: string;
  fromAvatar: string | null;
  toId: string;
  toName: string;
  toAvatar: string | null;
  amountCents: number;
  explanation: string;
  isUserInvolved: boolean;
  remainingBalancesBefore: Record<string, number>;
  remainingBalancesAfter: Record<string, number>;
}

export interface DebtReplayData {
  groupId: string;
  groupName: string;
  totalExpensesCount: number;
  userInvolvedExpensesCount: number;
  expenseSteps: ExpenseReplayStep[];
  finalTallies: GroupTallyMember[];
  settlementSteps: SettlementReplayStep[];
  totalSettlementsCount: number;
  totalDirectTransfersCount: number;
  transfersSavedCount: number;
}

interface ProfileLike {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface ExpenseLike {
  id: string;
  payer_id: string;
  description: string;
  base_currency_amount?: number;
  total_amount?: number;
  expense_date?: string;
  created_at?: string;
  splits?: Array<{ user_id: string; amount_owed: number }>;
}

interface SettlementLike {
  payer_id: string;
  payee_id: string;
  amount: number;
}

/**
 * Calculates step-by-step chronological expense replay and settlement resolution.
 */
export function calculateGroupReplayData({
  userId,
  groupId,
  groupName,
  groupMembers,
  expenses,
  settlements,
  profilesMap,
}: {
  userId: string;
  groupId: string;
  groupName: string;
  groupMembers: string[];
  expenses: ExpenseLike[];
  settlements: SettlementLike[];
  profilesMap: Record<string, ProfileLike>;
}): DebtReplayData {
  const getProfileName = (id: string) => profilesMap[id]?.full_name || 'Member';
  const getProfileAvatar = (id: string) => profilesMap[id]?.avatar_url || null;

  // Sort expenses chronologically (oldest first)
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.expense_date || a.created_at || 0).getTime();
    const dateB = new Date(b.expense_date || b.created_at || 0).getTime();
    return dateA - dateB;
  });

  // Track running balances for each member
  const runningBalances: Record<string, number> = {};
  groupMembers.forEach(uid => (runningBalances[uid] = 0));

  // 1. Phase 1: Build Chronological Expense Steps
  const expenseSteps: ExpenseReplayStep[] = [];

  sortedExpenses.forEach((exp, idx) => {
    const payerName = getProfileName(exp.payer_id);
    const totalAmount = exp.base_currency_amount ?? exp.total_amount ?? 0;
    const isPayer = exp.payer_id === userId;

    const userSplit = (exp.splits || []).find(s => s.user_id === userId);
    const myShareCents = userSplit ? userSplit.amount_owed : 0;
    const myPaidCents = isPayer ? totalAmount : 0;
    const deltaCents = myPaidCents - myShareCents;

    const previousBalanceCents = runningBalances[userId] || 0;

    // Apply expense to all members' running balances
    runningBalances[exp.payer_id] = (runningBalances[exp.payer_id] || 0) + totalAmount;
    (exp.splits || []).forEach(s => {
      runningBalances[s.user_id] = (runningBalances[s.user_id] || 0) - s.amount_owed;
    });

    const newBalanceCents = runningBalances[userId] || 0;
    const isUserInvolved = isPayer || myShareCents > 0;

    // Generate plain explanation
    let explanation = '';
    if (isPayer && myShareCents === 0) {
      explanation = `You paid ${formatCents(totalAmount)} for the group. Your balance increases by +${formatCents(totalAmount)}.`;
    } else if (isPayer && myShareCents > 0) {
      explanation = `You paid ${formatCents(totalAmount)}. After your share (${formatCents(myShareCents)}), your balance increases by +${formatCents(deltaCents)}.`;
    } else if (!isPayer && myShareCents > 0) {
      explanation = `${payerName} paid ${formatCents(totalAmount)}. Your portion (${formatCents(myShareCents)}) is deducted from your balance.`;
    } else {
      explanation = `${payerName} paid ${formatCents(totalAmount)}. You were not part of this split, so your balance is unchanged.`;
    }

    expenseSteps.push({
      stepIndex: idx,
      totalSteps: sortedExpenses.length,
      expenseId: exp.id,
      description: exp.description || 'Group Expense',
      date: exp.expense_date || exp.created_at || new Date().toISOString(),
      payerId: exp.payer_id,
      payerName,
      totalAmountCents: totalAmount,
      myPaidCents,
      myShareCents,
      deltaCents,
      previousBalanceCents,
      newBalanceCents,
      allRunningBalances: { ...runningBalances },
      explanation,
      isUserInvolved,
    });
  });

  // Apply settlements to running balances
  settlements.forEach(s => {
    runningBalances[s.payer_id] = (runningBalances[s.payer_id] || 0) + s.amount;
    runningBalances[s.payee_id] = (runningBalances[s.payee_id] || 0) - s.amount;
  });

  // 2. Phase 2: Build Final Group Tallies
  const finalTallies: GroupTallyMember[] = groupMembers.map(uid => {
    const bal = runningBalances[uid] || 0;
    let status: 'OWES' | 'OWED' | 'SETTLED' = 'SETTLED';
    if (bal > 0) status = 'OWED';
    else if (bal < 0) status = 'OWES';

    return {
      userId: uid,
      userName: getProfileName(uid),
      avatarUrl: getProfileAvatar(uid),
      netBalanceCents: bal,
      status,
    };
  }).sort((a, b) => b.netBalanceCents - a.netBalanceCents);

  // 3. Phase 3: Step-by-Step Greedy Settlement Resolution Solver
  const debtExpenses: DebtExpense[] = expenses.map(e => ({
    payer_id: e.payer_id,
    base_currency_amount: e.base_currency_amount ?? e.total_amount ?? 0,
    splits: (e.splits || []).map(s => ({ user_id: s.user_id, amount_owed: s.amount_owed })),
  }));

  const debtSettlements: DebtSettlement[] = settlements.map(s => ({
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: s.amount,
  }));

  const debtMembers: DebtGroupMember[] = groupMembers.map(id => ({ user_id: id }));

  const rawDirectDebts = DebtSimplifier.calculateIndividualDebts(debtExpenses, debtSettlements, debtMembers);

  // Compute step-by-step resolution simulation
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  Object.entries(runningBalances).forEach(([uid, amount]) => {
    if (amount < 0) debtors.push({ userId: uid, amount: -amount });
    else if (amount > 0) creditors.push({ userId: uid, amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlementSteps: SettlementReplayStep[] = [];
  const simBalances: Record<string, number> = { ...runningBalances };

  let i = 0;
  let j = 0;
  let sIndex = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    const beforeState = { ...simBalances };

    simBalances[debtor.userId] += settleAmount;
    simBalances[creditor.userId] -= settleAmount;

    const afterState = { ...simBalances };

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    const fromName = getProfileName(debtor.userId);
    const toName = getProfileName(creditor.userId);
    const isUserInvolved = debtor.userId === userId || creditor.userId === userId;

    let explanation = '';
    if (debtor.amount === 0 && creditor.amount === 0) {
      explanation = `${fromName} pays ${formatCents(settleAmount)} to ${toName}. Both are now 100% settled!`;
    } else if (debtor.amount === 0) {
      explanation = `${fromName} pays ${formatCents(settleAmount)} to ${toName}. ${fromName} is 100% settled! ${toName} still needs ${formatCents(creditor.amount)}.`;
    } else {
      explanation = `${fromName} pays ${formatCents(settleAmount)} to ${toName}. ${toName} is 100% settled! ${fromName} still has ${formatCents(debtor.amount)} remaining.`;
    }

    settlementSteps.push({
      stepIndex: sIndex,
      totalSteps: 0, // updated after loop
      fromId: debtor.userId,
      fromName,
      fromAvatar: getProfileAvatar(debtor.userId),
      toId: creditor.userId,
      toName,
      toAvatar: getProfileAvatar(creditor.userId),
      amountCents: settleAmount,
      explanation,
      isUserInvolved,
      remainingBalancesBefore: beforeState,
      remainingBalancesAfter: afterState,
    });

    sIndex++;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  settlementSteps.forEach(s => (s.totalSteps = settlementSteps.length));

  const totalDirectTransfersCount = rawDirectDebts.length;
  const totalSettlementsCount = settlementSteps.length;
  const transfersSavedCount = Math.max(0, totalDirectTransfersCount - totalSettlementsCount);

  return {
    groupId,
    groupName,
    totalExpensesCount: expenseSteps.length,
    userInvolvedExpensesCount: expenseSteps.filter(s => s.isUserInvolved).length,
    expenseSteps,
    finalTallies,
    settlementSteps,
    totalSettlementsCount,
    totalDirectTransfersCount,
    transfersSavedCount,
  };
}
