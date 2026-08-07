import type { SplitParticipant } from '../../types';

/**
 * Core split calculation engine.
 * All inputs and outputs operate on integer cents to avoid floating-point errors.
 */
export class SplitEngine {
  /** Equal split with remainder distribution to first N participants */
  static equalSplit(totalAmount: number, userIds: string[]): SplitParticipant[] {
    if (!userIds.length) return [];
    const baseShare = Math.trunc(totalAmount / userIds.length);
    const remainder = totalAmount % userIds.length;
    const sign = Math.sign(remainder);
    const absRemainder = Math.abs(remainder);
    return userIds.map((userId, index) => ({
      userId,
      amountOwed: baseShare + (index < absRemainder ? sign : 0),
    }));
  }

  /** Exact amount split with validation */
  static exactSplit(totalAmount: number, exactAmounts: { userId: string; amount: number }[]): SplitParticipant[] {
    const sum = exactAmounts.reduce((acc, curr) => acc + curr.amount, 0);
    if (sum !== totalAmount) {
      throw new Error(`Exact amounts sum (${sum}) must equal total amount (${totalAmount})`);
    }
    return exactAmounts.map((ea) => ({ userId: ea.userId, amountOwed: ea.amount }));
  }

  /** Percentage split with rounding reconciliation on largest share */
  static percentageSplit(totalAmount: number, percentages: { userId: string; percentage: number }[]): SplitParticipant[] {
    const sumPercentages = percentages.reduce((acc, curr) => acc + curr.percentage, 0);
    // Safe tolerance checking to account for floating-point 99.99 sum (0.010000000000005)
    if (Math.abs(sumPercentages - 100) > 0.011) {
      throw new Error(`Percentages sum (${sumPercentages}) must equal 100`);
    }
    let calculatedSum = 0;
    const splits = percentages.map((p) => {
      const amountOwed = Math.round((p.percentage / 100) * totalAmount);
      calculatedSum += amountOwed;
      return { userId: p.userId, amountOwed, percentage: p.percentage };
    });
    const diff = totalAmount - calculatedSum;
    if (diff !== 0 && splits.length > 0) {
      const sorted = [...splits].sort((a, b) => b.percentage - a.percentage);
      let i = 0;
      const sign = Math.sign(diff);
      let absDiff = Math.abs(diff);
      while (absDiff > 0) {
        sorted[i % sorted.length].amountOwed += sign;
        absDiff -= 1;
        i++;
      }
    }
    return splits.map((s) => ({ userId: s.userId, amountOwed: s.amountOwed }));
  }

  /** Shares-based split with leftover distribution to largest shareholders */
  static sharesSplit(totalAmount: number, shares: { userId: string; share: number }[]): SplitParticipant[] {
    const totalShares = shares.reduce((acc, curr) => acc + curr.share, 0);
    if (totalShares === 0) throw new Error('Total shares must be greater than 0');
    let calculatedSum = 0;
    const splits = shares.map((s) => {
      const amountOwed = Math.floor((s.share / totalShares) * totalAmount);
      calculatedSum += amountOwed;
      return { userId: s.userId, amountOwed, share: s.share };
    });
    let diff = totalAmount - calculatedSum;
    if (diff > 0) {
      const sorted = [...splits].sort((a, b) => b.share - a.share);
      let i = 0;
      while (diff > 0) {
        sorted[i % sorted.length].amountOwed += 1;
        diff -= 1;
        i++;
      }
    }
    return splits.map((s) => ({ userId: s.userId, amountOwed: s.amountOwed }));
  }

  /** Adjustment split: equal base + per-user adjustments */
  static adjustmentSplit(totalAmount: number, adjustments: { userId: string; adjustment: number }[]): SplitParticipant[] {
    if (!adjustments.length) return [];
    const sumAdjustments = adjustments.reduce((acc, curr) => acc + curr.adjustment, 0);
    const remainingToSplit = totalAmount - sumAdjustments;
    const equalParts = this.equalSplit(remainingToSplit, adjustments.map(a => a.userId));
    return adjustments.map(adj => {
      const equalPart = equalParts.find(e => e.userId === adj.userId)?.amountOwed ?? 0;
      return { userId: adj.userId, amountOwed: equalPart + adj.adjustment };
    });
  }

  /** Pro itemized split with proportional tax/tip allocation */
  static itemizedSplit(
    totalAmount: number,
    receiptItems: { price: number; assignedUserIds: { userId: string; shareMultiplier: number }[] }[]
  ): SplitParticipant[] {
    let itemsSubtotal = 0;
    const userItemsSubtotal: Record<string, number> = {};

    receiptItems.forEach(item => {
      itemsSubtotal += item.price;
      const totalSharesForItem = item.assignedUserIds.reduce((sum, u) => sum + u.shareMultiplier, 0);

      let itemCalculatedSum = 0;
      const itemSplits = item.assignedUserIds.map(u => {
        const shareAmount = Math.floor((u.shareMultiplier / totalSharesForItem) * item.price);
        itemCalculatedSum += shareAmount;
        return { userId: u.userId, shareAmount, shareMultiplier: u.shareMultiplier };
      });

      let itemDiff = item.price - itemCalculatedSum;
      if (itemDiff > 0) {
        const sortedItemSplits = [...itemSplits].sort((a, b) => b.shareMultiplier - a.shareMultiplier);
        let idx = 0;
        while (itemDiff > 0) {
          sortedItemSplits[idx % sortedItemSplits.length].shareAmount += 1;
          itemDiff -= 1;
          idx++;
        }
      }

      itemSplits.forEach(split => {
        userItemsSubtotal[split.userId] = (userItemsSubtotal[split.userId] ?? 0) + split.shareAmount;
      });
    });

    const taxAndTip = totalAmount - itemsSubtotal;
    let finalCalculatedSum = 0;
    const finalSplits = Object.keys(userItemsSubtotal).map(userId => {
      const userSub = userItemsSubtotal[userId];
      const userTaxTipShare = itemsSubtotal > 0 ? Math.round((userSub / itemsSubtotal) * taxAndTip) : 0;
      const amountOwed = userSub + userTaxTipShare;
      finalCalculatedSum += amountOwed;
      return { userId, amountOwed, userSub };
    });

    let diff = totalAmount - finalCalculatedSum;
    if (diff !== 0 && finalSplits.length > 0) {
      const sortedFinalSplits = [...finalSplits].sort((a, b) => b.userSub - a.userSub);
      let i = 0;
      const sign = Math.sign(diff);
      let absDiff = Math.abs(diff);
      while (absDiff > 0) {
        sortedFinalSplits[i % sortedFinalSplits.length].amountOwed += sign;
        absDiff -= 1;
        i++;
      }
    }

    return finalSplits.map(s => ({ userId: s.userId, amountOwed: s.amountOwed }));
  }
}
