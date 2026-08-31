import { DebtSimplifier, type DebtExpense, type DebtSettlement, type DebtGroupMember } from '../core/domain/DebtSimplifier';
import { formatCents } from './currency';
import { formatDate } from './date';

export interface DirectDebtReason {
  description: string;
  amountCents: number;
  date?: string;
}

export interface DirectDebtItem {
  friendId: string;
  friendName: string;
  avatarUrl: string | null;
  amountCents: number;
  reasons: DirectDebtReason[];
}

export interface SimplifiedTransferItem {
  fromId: string;
  fromName: string;
  fromAvatar: string | null;
  toId: string;
  toName: string;
  toAvatar: string | null;
  amountCents: number;
}

export interface PairwiseBillItem {
  expenseId: string;
  description: string;
  amountCents: number;
  date?: string;
}

export interface PairwiseOffsetDetail {
  friendId: string;
  friendName: string;
  avatarUrl: string | null;
  theyOweYouBills: PairwiseBillItem[];
  theyOweYouTotalCents: number;
  youOweThemBills: PairwiseBillItem[];
  youOweThemTotalCents: number;
  netDirectDebtCents: number;
  direction: 'THEY_OWE_YOU' | 'YOU_OWE_THEM' | 'SETTLED';
  subtractionEquation: string;
}

export interface ReceiptAccumulation {
  totalPaidCents: number;
  totalConsumedCents: number;
  netTakeHomeCents: number;
  paidBillsCount: number;
  consumedBillsCount: number;
  paidReceipts: Array<{
    id: string;
    description: string;
    totalAmountCents: number;
    date: string;
  }>;
  consumedReceipts: Array<{
    id: string;
    description: string;
    payerName: string;
    yourShareCents: number;
    date: string;
  }>;
}

export interface ZeroSumTallyItem {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  startingNetBalanceCents: number;
  isCreditor: boolean;
  status: 'OWES' | 'OWED' | 'SETTLED';
  actions: string[];
  finalBalanceCents: number;
}

export interface ZeroSumReconciliation {
  totalCreditorsCents: number;
  totalDebtorsCents: number;
  netSumCents: number;
  tallies: ZeroSumTallyItem[];
}

export interface UserDebtStory {
  userId: string;
  userName: string;
  userAvatar: string | null;
  // Stage 1: Receipt Accumulation
  receiptAccumulation: ReceiptAccumulation;
  // Stage 2: 1-on-1 Pairwise Mutual Offsetting
  pairwiseOffsets: PairwiseOffsetDetail[];
  directReceivables: DirectDebtItem[];
  directPayables: DirectDebtItem[];
  totalDirectInflowCents: number;
  totalDirectOutflowCents: number;
  directNetBalanceCents: number;
  // Stage 3: Multi-Party Shortcut Routing
  simplifiedReceivables: SimplifiedTransferItem[];
  simplifiedPayables: SimplifiedTransferItem[];
  totalSimplifiedInflowCents: number;
  totalSimplifiedOutflowCents: number;
  simplifiedNetBalanceCents: number;
  status: 'RECEIVING' | 'PAYING' | 'SETTLED';
  shortcutExplanation: string;
  transitiveClearingDetails: string[];
}

export interface GroupDebtVisualizationData {
  groupId: string;
  members: Array<{ id: string; name: string; avatarUrl: string | null }>;
  allDirectDebts: SimplifiedTransferItem[];
  allSimplifiedDebts: SimplifiedTransferItem[];
  totalDirectTransfersCount: number;
  totalSimplifiedTransfersCount: number;
  transfersSavedCount: number;
  zeroSumBoard: ZeroSumReconciliation;
  userStories: Record<string, UserDebtStory>;
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
  created_at?: string;
}

/**
 * Calculates the dynamic 3-stage debt visualizer and zero-sum proof for all members in a group.
 */
export function calculateGroupDebtVisualization({
  groupId,
  groupMembers,
  expenses,
  settlements,
  profilesMap,
}: {
  groupId: string;
  groupMembers: string[];
  expenses: ExpenseLike[];
  settlements: SettlementLike[];
  profilesMap: Record<string, ProfileLike>;
}): GroupDebtVisualizationData {
  // Normalize debt inputs for DebtSimplifier
  const debtExpenses: DebtExpense[] = expenses.map((e) => ({
    payer_id: e.payer_id,
    base_currency_amount: e.base_currency_amount ?? e.total_amount ?? 0,
    splits: (e.splits || []).map((s) => ({
      user_id: s.user_id,
      amount_owed: s.amount_owed,
    })),
  }));

  const debtSettlements: DebtSettlement[] = settlements.map((s) => ({
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: s.amount,
  }));

  const debtMembers: DebtGroupMember[] = groupMembers.map((id) => ({ user_id: id }));

  // 1. Calculate All Direct (Bilateral) Debts
  const rawDirectDebts = DebtSimplifier.calculateIndividualDebts(
    debtExpenses,
    debtSettlements,
    debtMembers
  );

  // 2. Calculate All Simplified Debts
  const rawSimplifiedDebts = DebtSimplifier.simplifyDebts(
    debtExpenses,
    debtSettlements,
    debtMembers
  );

  const getProfileName = (id: string) => profilesMap[id]?.full_name || 'Member';
  const getProfileAvatar = (id: string) => profilesMap[id]?.avatar_url || null;

  const allDirectDebts: SimplifiedTransferItem[] = rawDirectDebts.map((d) => ({
    fromId: d.from,
    fromName: getProfileName(d.from),
    fromAvatar: getProfileAvatar(d.from),
    toId: d.to,
    toName: getProfileName(d.to),
    toAvatar: getProfileAvatar(d.to),
    amountCents: d.amount,
  }));

  const allSimplifiedDebts: SimplifiedTransferItem[] = rawSimplifiedDebts.map((d) => ({
    fromId: d.from,
    fromName: getProfileName(d.from),
    fromAvatar: getProfileAvatar(d.from),
    toId: d.to,
    toName: getProfileName(d.to),
    toAvatar: getProfileAvatar(d.to),
    amountCents: d.amount,
  }));

  // Map itemized splits between bilateral pairs
  // pairKey = `${debtorId}->${payerId}`
  const pairReasonsMap = new Map<string, DirectDebtReason[]>();
  expenses.forEach((e) => {
    const rawDate = e.expense_date ?? e.created_at ?? '';
    const formattedD = rawDate ? formatDate(rawDate) : '';
    e.splits?.forEach((s) => {
      if (s.user_id !== e.payer_id && s.amount_owed > 0) {
        const key = `${s.user_id}->${e.payer_id}`;
        if (!pairReasonsMap.has(key)) {
          pairReasonsMap.set(key, []);
        }
        pairReasonsMap.get(key)!.push({
          description: e.description || 'Expense Split',
          amountCents: s.amount_owed,
          date: formattedD,
        });
      }
    });
  });

  // 3. Build User Story for Each Group Member
  const userStories: Record<string, UserDebtStory> = {};

  groupMembers.forEach((uid) => {
    const userName = getProfileName(uid);
    const userAvatar = getProfileAvatar(uid);

    // ── STAGE 1: Receipt Accumulation ──
    const paidReceipts: ReceiptAccumulation['paidReceipts'] = [];
    const consumedReceipts: ReceiptAccumulation['consumedReceipts'] = [];
    let totalPaidCents = 0;
    let totalConsumedCents = 0;

    expenses.forEach((e) => {
      const rawDate = e.expense_date ?? e.created_at ?? '';
      const formattedD = rawDate ? formatDate(rawDate) : '';
      const totalAmount = e.total_amount ?? e.base_currency_amount ?? 0;

      if (e.payer_id === uid) {
        totalPaidCents += totalAmount;
        paidReceipts.push({
          id: e.id,
          description: e.description || 'Expense',
          totalAmountCents: totalAmount,
          date: formattedD,
        });
      }

      const userSplit = e.splits?.find((s) => s.user_id === uid);
      if (userSplit && userSplit.amount_owed > 0) {
        totalConsumedCents += userSplit.amount_owed;
        consumedReceipts.push({
          id: e.id,
          description: e.description || 'Expense',
          payerName: getProfileName(e.payer_id),
          yourShareCents: userSplit.amount_owed,
          date: formattedD,
        });
      }
    });

    const netTakeHomeCents = totalPaidCents - totalConsumedCents;
    const receiptAccumulation: ReceiptAccumulation = {
      totalPaidCents,
      totalConsumedCents,
      netTakeHomeCents,
      paidBillsCount: paidReceipts.length,
      consumedBillsCount: consumedReceipts.length,
      paidReceipts,
      consumedReceipts,
    };

    // ── STAGE 2: 1-on-1 Pairwise Mutual Offsetting ──
    const pairwiseOffsets: PairwiseOffsetDetail[] = [];

    groupMembers.forEach((otherId) => {
      if (otherId === uid) return;

      const theyOweYouList: PairwiseBillItem[] = [];
      const youOweThemList: PairwiseBillItem[] = [];

      expenses.forEach((e) => {
        const rawDate = e.expense_date ?? e.created_at ?? '';
        const formattedD = rawDate ? formatDate(rawDate) : '';

        // Did uid pay and otherId owe?
        if (e.payer_id === uid) {
          const split = e.splits?.find((s) => s.user_id === otherId);
          if (split && split.amount_owed > 0) {
            theyOweYouList.push({
              expenseId: e.id,
              description: e.description || 'Expense',
              amountCents: split.amount_owed,
              date: formattedD,
            });
          }
        }

        // Did otherId pay and uid owe?
        if (e.payer_id === otherId) {
          const split = e.splits?.find((s) => s.user_id === uid);
          if (split && split.amount_owed > 0) {
            youOweThemList.push({
              expenseId: e.id,
              description: e.description || 'Expense',
              amountCents: split.amount_owed,
              date: formattedD,
            });
          }
        }
      });

      const theyOweYouTotalCents = theyOweYouList.reduce((sum, item) => sum + item.amountCents, 0);
      const youOweThemTotalCents = youOweThemList.reduce((sum, item) => sum + item.amountCents, 0);

      if (theyOweYouTotalCents > 0 || youOweThemTotalCents > 0) {
        const otherName = getProfileName(otherId);
        const diff = theyOweYouTotalCents - youOweThemTotalCents;
        const absDiff = Math.abs(diff);

        let direction: PairwiseOffsetDetail['direction'] = 'SETTLED';
        let equation = '';

        if (diff > 0) {
          direction = 'THEY_OWE_YOU';
          equation = `${otherName} owes you ${formatCents(theyOweYouTotalCents)} − you owe ${otherName} ${formatCents(youOweThemTotalCents)} = ${otherName} owes you ${formatCents(absDiff)}`;
        } else if (diff < 0) {
          direction = 'YOU_OWE_THEM';
          equation = `You owe ${otherName} ${formatCents(youOweThemTotalCents)} − ${otherName} owes you ${formatCents(theyOweYouTotalCents)} = you owe ${otherName} ${formatCents(absDiff)}`;
        } else {
          direction = 'SETTLED';
          equation = `Both debts cancel out equally at ${formatCents(theyOweYouTotalCents)} (Fully Offset)`;
        }

        pairwiseOffsets.push({
          friendId: otherId,
          friendName: otherName,
          avatarUrl: getProfileAvatar(otherId),
          theyOweYouBills: theyOweYouList,
          theyOweYouTotalCents,
          youOweThemBills: youOweThemList,
          youOweThemTotalCents,
          netDirectDebtCents: absDiff,
          direction,
          subtractionEquation: equation,
        });
      }
    });

    // Direct receivables & payables for summary cards
    const directReceivables: DirectDebtItem[] = allDirectDebts
      .filter((d) => d.toId === uid)
      .map((d) => ({
        friendId: d.fromId,
        friendName: d.fromName,
        avatarUrl: d.fromAvatar,
        amountCents: d.amountCents,
        reasons: pairReasonsMap.get(`${d.fromId}->${uid}`) || [],
      }));

    const directPayables: DirectDebtItem[] = allDirectDebts
      .filter((d) => d.fromId === uid)
      .map((d) => ({
        friendId: d.toId,
        friendName: d.toName,
        avatarUrl: d.toAvatar,
        amountCents: d.amountCents,
        reasons: pairReasonsMap.get(`${uid}->${d.toId}`) || [],
      }));

    const totalDirectInflowCents = directReceivables.reduce((sum, item) => sum + item.amountCents, 0);
    const totalDirectOutflowCents = directPayables.reduce((sum, item) => sum + item.amountCents, 0);
    const directNetBalanceCents = totalDirectInflowCents - totalDirectOutflowCents;

    // ── STAGE 3: Simplified Transfers ──
    const simplifiedReceivables = allSimplifiedDebts.filter((d) => d.toId === uid);
    const simplifiedPayables = allSimplifiedDebts.filter((d) => d.fromId === uid);

    const totalSimplifiedInflowCents = simplifiedReceivables.reduce((sum, item) => sum + item.amountCents, 0);
    const totalSimplifiedOutflowCents = simplifiedPayables.reduce((sum, item) => sum + item.amountCents, 0);
    const simplifiedNetBalanceCents = totalSimplifiedInflowCents - totalSimplifiedOutflowCents;

    let status: 'RECEIVING' | 'PAYING' | 'SETTLED' = 'SETTLED';
    if (simplifiedNetBalanceCents > 0) status = 'RECEIVING';
    else if (simplifiedNetBalanceCents < 0) status = 'PAYING';

    const transitiveClearingDetails: string[] = [];
    let shortcutExplanation = '';

    if (status === 'SETTLED') {
      shortcutExplanation = 'You are completely settled up! You do not need to send or receive any money.';
    } else if (status === 'RECEIVING') {
      const payersList = simplifiedReceivables.map((r) => `${r.fromName} (${formatCents(r.amountCents)})`).join(' and ');
      if (directPayables.length > 0) {
        shortcutExplanation = `Instead of collecting from multiple roommates and making second transfers, ${payersList} pays your net credit directly.`;
      } else {
        shortcutExplanation = `${payersList} sends money directly to your account to settle your share of group expenses.`;
      }

      // Check if any direct debtor is replaced by another simplified payer
      directReceivables.forEach((dr) => {
        const isStillPayingDirectly = simplifiedReceivables.some((sr) => sr.fromId === dr.friendId);
        if (!isStillPayingDirectly) {
          transitiveClearingDetails.push(
            `${dr.friendName} originally owed you ${formatCents(dr.amountCents)}, but paid another roommate on your behalf to eliminate extra transfer steps.`
          );
        }
      });
    } else {
      // PAYING
      const payeesList = simplifiedPayables.map((p) => `${p.toName} (${formatCents(p.amountCents)})`).join(' and ');
      if (directPayables.length > 1) {
        shortcutExplanation = `Instead of sending multiple small payments, your debt is combined into a single clean transfer to ${payeesList}.`;
      } else {
        shortcutExplanation = `You pay ${payeesList} to settle your share of group expenses in 1 easy payment.`;
      }

      directPayables.forEach((dp) => {
        const isStillPayingDirectly = simplifiedPayables.some((sp) => sp.toId === dp.friendId);
        if (!isStillPayingDirectly) {
          transitiveClearingDetails.push(
            `You originally owed ${dp.friendName} ${formatCents(dp.amountCents)}, but pay ${payeesList} directly because ${dp.friendName} is owed money by the group.`
          );
        }
      });
    }

    userStories[uid] = {
      userId: uid,
      userName,
      userAvatar,
      receiptAccumulation,
      pairwiseOffsets,
      directReceivables,
      directPayables,
      totalDirectInflowCents,
      totalDirectOutflowCents,
      directNetBalanceCents,
      simplifiedReceivables,
      simplifiedPayables,
      totalSimplifiedInflowCents,
      totalSimplifiedOutflowCents,
      simplifiedNetBalanceCents,
      status,
      shortcutExplanation,
      transitiveClearingDetails,
    };
  });

  // ── STAGE 4: Zero-Sum Reconciliation Board ──
  const zeroSumTallies: ZeroSumTallyItem[] = groupMembers.map((uid) => {
    const story = userStories[uid];
    const net = story.simplifiedNetBalanceCents;
    const isCreditor = net > 0;
    const actions: string[] = [];

    if (story.simplifiedPayables.length > 0) {
      story.simplifiedPayables.forEach((sp) => {
        actions.push(`Pays ${formatCents(sp.amountCents)} to ${sp.toName}`);
      });
    }
    if (story.simplifiedReceivables.length > 0) {
      story.simplifiedReceivables.forEach((sr) => {
        actions.push(`Receives ${formatCents(sr.amountCents)} from ${sr.fromName}`);
      });
    }
    if (actions.length === 0) {
      actions.push('Fully settled (₹0.00)');
    }

    return {
      userId: uid,
      userName: story.userName,
      avatarUrl: story.userAvatar,
      startingNetBalanceCents: net,
      isCreditor,
      status: story.status === 'RECEIVING' ? 'OWED' : story.status === 'PAYING' ? 'OWES' : 'SETTLED',
      actions,
      finalBalanceCents: 0,
    };
  });

  let totalCreditorsCents = 0;
  let totalDebtorsCents = 0;
  zeroSumTallies.forEach((t) => {
    if (t.startingNetBalanceCents > 0) {
      totalCreditorsCents += t.startingNetBalanceCents;
    } else {
      totalDebtorsCents += Math.abs(t.startingNetBalanceCents);
    }
  });

  const zeroSumBoard: ZeroSumReconciliation = {
    totalCreditorsCents,
    totalDebtorsCents,
    netSumCents: totalCreditorsCents - totalDebtorsCents,
    tallies: zeroSumTallies,
  };

  const totalDirectTransfersCount = allDirectDebts.length;
  const totalSimplifiedTransfersCount = allSimplifiedDebts.length;
  const transfersSavedCount = Math.max(0, totalDirectTransfersCount - totalSimplifiedTransfersCount);

  return {
    groupId,
    members: groupMembers.map((id) => ({
      id,
      name: getProfileName(id),
      avatarUrl: getProfileAvatar(id),
    })),
    allDirectDebts,
    allSimplifiedDebts,
    totalDirectTransfersCount,
    totalSimplifiedTransfersCount,
    transfersSavedCount,
    zeroSumBoard,
    userStories,
  };
}
