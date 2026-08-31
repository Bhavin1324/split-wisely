import { DebtSimplifier, type DebtExpense, type DebtSettlement, type DebtGroupMember } from '../core/domain/DebtSimplifier';
import { formatCents } from './currency';

export interface DirectDebtReason {
  description: string;
  amountCents: number;
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

export interface UserDebtStory {
  userId: string;
  userName: string;
  userAvatar: string | null;
  // Direct (Before Simplification)
  directReceivables: DirectDebtItem[]; // Money friends owe this user directly
  directPayables: DirectDebtItem[];    // Money this user owes friends directly
  totalDirectInflowCents: number;
  totalDirectOutflowCents: number;
  directNetBalanceCents: number;
  // Simplified (After Simplification)
  simplifiedReceivables: SimplifiedTransferItem[]; // Who pays this user in simplified mode
  simplifiedPayables: SimplifiedTransferItem[];    // Who this user pays in simplified mode
  totalSimplifiedInflowCents: number;
  totalSimplifiedOutflowCents: number;
  simplifiedNetBalanceCents: number;
  // Dynamic Human-Readable Explanation
  status: 'RECEIVING' | 'PAYING' | 'SETTLED';
  shortcutExplanation: string;
}

export interface GroupDebtVisualizationData {
  groupId: string;
  members: Array<{ id: string; name: string; avatarUrl: string | null }>;
  allDirectDebts: SimplifiedTransferItem[];
  allSimplifiedDebts: SimplifiedTransferItem[];
  totalDirectTransfersCount: number;
  totalSimplifiedTransfersCount: number;
  transfersSavedCount: number;
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
  splits?: Array<{ user_id: string; amount_owed: number }>;
}

interface SettlementLike {
  payer_id: string;
  payee_id: string;
  amount: number;
}

/**
 * Calculates the dynamic debt visualizer story for all members in a group.
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
  const debtExpenses: DebtExpense[] = expenses.map(e => ({
    payer_id: e.payer_id,
    base_currency_amount: e.base_currency_amount ?? e.total_amount ?? 0,
    splits: (e.splits || []).map(s => ({
      user_id: s.user_id,
      amount_owed: s.amount_owed,
    })),
  }));

  const debtSettlements: DebtSettlement[] = settlements.map(s => ({
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: s.amount,
  }));

  const debtMembers: DebtGroupMember[] = groupMembers.map(id => ({ user_id: id }));

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

  const allDirectDebts: SimplifiedTransferItem[] = rawDirectDebts.map(d => ({
    fromId: d.from,
    fromName: getProfileName(d.from),
    fromAvatar: getProfileAvatar(d.from),
    toId: d.to,
    toName: getProfileName(d.to),
    toAvatar: getProfileAvatar(d.to),
    amountCents: d.amount,
  }));

  const allSimplifiedDebts: SimplifiedTransferItem[] = rawSimplifiedDebts.map(d => ({
    fromId: d.from,
    fromName: getProfileName(d.from),
    fromAvatar: getProfileAvatar(d.from),
    toId: d.to,
    toName: getProfileName(d.to),
    toAvatar: getProfileAvatar(d.to),
    amountCents: d.amount,
  }));

  // Build itemized expense reasons between bilateral pairs
  // pairKey = `${payerId}->${debtorId}`
  const pairReasonsMap = new Map<string, DirectDebtReason[]>();
  expenses.forEach(e => {
    e.splits?.forEach(s => {
      if (s.user_id !== e.payer_id && s.amount_owed > 0) {
        const key = `${s.user_id}->${e.payer_id}`;
        if (!pairReasonsMap.has(key)) {
          pairReasonsMap.set(key, []);
        }
        pairReasonsMap.get(key)!.push({
          description: e.description || 'Expense Split',
          amountCents: s.amount_owed,
        });
      }
    });
  });

  // 3. Build User Story for Each Group Member
  const userStories: Record<string, UserDebtStory> = {};

  groupMembers.forEach(uid => {
    const userName = getProfileName(uid);
    const userAvatar = getProfileAvatar(uid);

    // Direct receivables (people who owe this user)
    const directReceivables: DirectDebtItem[] = allDirectDebts
      .filter(d => d.toId === uid)
      .map(d => ({
        friendId: d.fromId,
        friendName: d.fromName,
        avatarUrl: d.fromAvatar,
        amountCents: d.amountCents,
        reasons: pairReasonsMap.get(`${d.fromId}->${uid}`) || [],
      }));

    // Direct payables (people this user owes)
    const directPayables: DirectDebtItem[] = allDirectDebts
      .filter(d => d.fromId === uid)
      .map(d => ({
        friendId: d.toId,
        friendName: d.toName,
        avatarUrl: d.toAvatar,
        amountCents: d.amountCents,
        reasons: pairReasonsMap.get(`${uid}->${d.toId}`) || [],
      }));

    const totalDirectInflowCents = directReceivables.reduce((sum, item) => sum + item.amountCents, 0);
    const totalDirectOutflowCents = directPayables.reduce((sum, item) => sum + item.amountCents, 0);
    const directNetBalanceCents = totalDirectInflowCents - totalDirectOutflowCents;

    // Simplified transfers for this user
    const simplifiedReceivables = allSimplifiedDebts.filter(d => d.toId === uid);
    const simplifiedPayables = allSimplifiedDebts.filter(d => d.fromId === uid);

    const totalSimplifiedInflowCents = simplifiedReceivables.reduce((sum, item) => sum + item.amountCents, 0);
    const totalSimplifiedOutflowCents = simplifiedPayables.reduce((sum, item) => sum + item.amountCents, 0);
    const simplifiedNetBalanceCents = totalSimplifiedInflowCents - totalSimplifiedOutflowCents;

    // Determine status
    let status: 'RECEIVING' | 'PAYING' | 'SETTLED' = 'SETTLED';
    if (simplifiedNetBalanceCents > 0) status = 'RECEIVING';
    else if (simplifiedNetBalanceCents < 0) status = 'PAYING';

    // Generate plain-English explanation
    let shortcutExplanation = '';
    if (status === 'SETTLED') {
      shortcutExplanation = 'You are completely settled up! You do not need to send or receive any money.';
    } else if (status === 'RECEIVING') {
      const payersList = simplifiedReceivables.map(r => `${r.fromName} (${formatCents(r.amountCents)})`).join(' and ');
      if (directPayables.length > 0 && directReceivables.length > 0) {
        shortcutExplanation = `Instead of collecting from ${directReceivables.map(r => r.friendName).join(', ')} and making a second transfer to ${directPayables.map(p => p.friendName).join(', ')}, ${payersList} pays your net difference directly. You save multiple bank transfers!`;
      } else {
        shortcutExplanation = `${payersList} sends money directly to your account to settle your share of group expenses.`;
      }
    } else {
      // PAYING
      const payeesList = simplifiedPayables.map(p => `${p.toName} (${formatCents(p.amountCents)})`).join(' and ');
      if (directPayables.length > 1) {
        shortcutExplanation = `Instead of sending multiple small payments to ${directPayables.map(p => p.friendName).join(', ')}, your debt is combined into a single clean transfer to ${payeesList}.`;
      } else {
        shortcutExplanation = `You pay ${payeesList} to settle your share of group expenses in 1 easy tap.`;
      }
    }

    userStories[uid] = {
      userId: uid,
      userName,
      userAvatar,
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
    };
  });

  const totalDirectTransfersCount = allDirectDebts.length;
  const totalSimplifiedTransfersCount = allSimplifiedDebts.length;
  const transfersSavedCount = Math.max(0, totalDirectTransfersCount - totalSimplifiedTransfersCount);

  return {
    groupId,
    members: groupMembers.map(id => ({
      id,
      name: getProfileName(id),
      avatarUrl: getProfileAvatar(id),
    })),
    allDirectDebts,
    allSimplifiedDebts,
    totalDirectTransfersCount,
    totalSimplifiedTransfersCount,
    transfersSavedCount,
    userStories,
  };
}
