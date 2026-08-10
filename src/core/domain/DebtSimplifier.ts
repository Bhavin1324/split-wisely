import type { SimplifiedTransaction } from '../../types';

export interface DebtExpense {
  payer_id: string;
  base_currency_amount: number;
  splits: { user_id: string; amount_owed: number }[];
}

export interface DebtSettlement {
  payer_id: string;
  payee_id: string;
  amount: number;
}

export interface DebtGroupMember {
  user_id: string;
}

/**
 * Greedy debt minimization algorithm.
 * Compresses complex webs of debts into minimum number of settlements.
 */
export class DebtSimplifier {
  static simplifyDebts(
    expenses: DebtExpense[],
    settlements: DebtSettlement[],
    groupMembers: DebtGroupMember[]
  ): SimplifiedTransaction[] {
    const balances: Record<string, number> = {};
    groupMembers.forEach(m => (balances[m.user_id] = 0));

    expenses.forEach(e => {
      balances[e.payer_id] = (balances[e.payer_id] ?? 0) + e.base_currency_amount;
      e.splits.forEach(s => {
        balances[s.user_id] = (balances[s.user_id] ?? 0) - s.amount_owed;
      });
    });

    settlements.forEach(s => {
      balances[s.payer_id] = (balances[s.payer_id] ?? 0) + s.amount;
      balances[s.payee_id] = (balances[s.payee_id] ?? 0) - s.amount;
    });

    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    Object.entries(balances).forEach(([userId, amount]) => {
      if (amount < 0) debtors.push({ userId, amount: -amount });
      else if (amount > 0) creditors.push({ userId, amount });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedTransactions: SimplifiedTransaction[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      simplifiedTransactions.push({ from: debtor.userId, to: creditor.userId, amount: settleAmount });
      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }
    return simplifiedTransactions;
  }

  static calculateIndividualDebts(
    expenses: DebtExpense[],
    settlements: DebtSettlement[],
    groupMembers: DebtGroupMember[]
  ): SimplifiedTransaction[] {
    const debts: Record<string, Record<string, number>> = {};
    
    groupMembers.forEach(m => {
      debts[m.user_id] = {};
    });

    expenses.forEach(e => {
      e.splits.forEach(s => {
        if (s.user_id !== e.payer_id) {
          if (!debts[s.user_id]) debts[s.user_id] = {};
          debts[s.user_id][e.payer_id] = (debts[s.user_id][e.payer_id] ?? 0) + s.amount_owed;
        }
      });
    });

    settlements.forEach(s => {
      if (!debts[s.payer_id]) debts[s.payer_id] = {};
      debts[s.payer_id][s.payee_id] = (debts[s.payer_id][s.payee_id] ?? 0) - s.amount;
    });

    const individualTransactions: SimplifiedTransaction[] = [];
    const processedPairs = new Set<string>();

    Object.keys(debts).forEach(userA => {
      Object.keys(debts[userA]).forEach(userB => {
        const pairId = [userA, userB].sort().join('-');
        if (processedPairs.has(pairId)) return;
        processedPairs.add(pairId);

        const aOwesB = debts[userA][userB] ?? 0;
        const bOwesA = debts[userB]?.[userA] ?? 0;
        const net = aOwesB - bOwesA;

        if (net > 0) {
          individualTransactions.push({ from: userA, to: userB, amount: net });
        } else if (net < 0) {
          individualTransactions.push({ from: userB, to: userA, amount: -net });
        }
      });
    });

    return individualTransactions;
  }
}
