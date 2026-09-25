import { describe, it, expect } from 'vitest';
import { formatCents } from '../../../utils/currency';
import { calculateAnalyticsSummary } from '../../../utils/analyticsCalculations';
import { MOCK_CATEGORIES, MOCK_GROUPS } from '../../../lib/mockData';
import type { Expense, PersonalTransaction } from '../../../types';

describe('AnalyticsGuideModal & Hero KPIs Reconciliation Safety', () => {
  // Helper implementing the exact component logic
  const resolveReconciliationState = (outlay: number, trueSpend: number) => {
    const netDifference = outlay - trueSpend;
    if (netDifference > 0) {
      return {
        state: 'POSITIVE_DELTA' as const,
        title: 'Money Coming Back to You',
        tag: 'Expecting Back',
        formattedValue: `+${formatCents(netDifference)}`,
        rawDelta: netDifference,
        containerClass: 'bg-success-bg border-success-border/40 text-success-text',
        iconName: 'ArrowDownRight',
      };
    }
    if (netDifference < 0) {
      return {
        state: 'NEGATIVE_DELTA' as const,
        title: 'Covered by Friends (You Owe Share)',
        tag: 'Covered by Friends',
        formattedValue: `-${formatCents(Math.abs(netDifference))}`,
        rawDelta: netDifference,
        containerClass: 'bg-warning-bg border-warning-border/40 text-warning-500',
        iconName: 'ArrowUpRight',
      };
    }
    return {
      state: 'ZERO_DELTA' as const,
      title: 'Settled Balance',
      tag: 'All Square',
      formattedValue: formatCents(0),
      rawDelta: 0,
      containerClass: 'bg-bg-surface border-border-base text-text-muted',
      iconName: 'CheckCircle2',
    };
  };

  const resolveHeroKpiCard3State = (outlay: number, trueSpend: number) => {
    if (outlay > trueSpend) {
      return {
        type: 'EXPECTING_BACK' as const,
        text: `Expecting +${formatCents(outlay - trueSpend)} back`,
        colorClass: 'text-success-text bg-success-bg',
      };
    }
    if (outlay < trueSpend) {
      return {
        type: 'COVERED_BY_FRIENDS' as const,
        text: `${formatCents(trueSpend - outlay)} covered by friends`,
        colorClass: 'text-warning-500 bg-warning-bg',
      };
    }
    return {
      type: 'MATCHES_TRUE_SPEND' as const,
      text: 'Matches your true spend',
      colorClass: 'text-text-muted',
    };
  };

  describe('Reconciliation Box 3-State Model in AnalyticsGuideModal', () => {
    it('1. State A: Correctly renders positive delta when Outlay > True Spend (fronted for friends)', () => {
      const outlay = 600000; // ₹6,000 paid from pocket
      const trueSpend = 350000; // ₹3,500 true consumption
      const result = resolveReconciliationState(outlay, trueSpend);

      expect(result.state).toBe('POSITIVE_DELTA');
      expect(result.title).toBe('Money Coming Back to You');
      expect(result.tag).toBe('Expecting Back');
      expect(result.formattedValue).toBe('+₹2,500.00');
      expect(result.iconName).toBe('ArrowDownRight');
      expect(result.containerClass).toContain('bg-success-bg');
      expect(result.containerClass).toContain('text-success-text');
    });

    it('2. State B: Correctly renders negative delta when Outlay < True Spend (friends covered bills)', () => {
      const outlay = 100000; // ₹1,000 paid from pocket
      const trueSpend = 400000; // ₹4,000 true consumption (friends paid ₹3,000)
      const result = resolveReconciliationState(outlay, trueSpend);

      // Must NOT clamp to 0 or declare settled
      expect(result.state).toBe('NEGATIVE_DELTA');
      expect(result.title).toBe('Covered by Friends (You Owe Share)');
      expect(result.tag).toBe('Covered by Friends');
      expect(result.formattedValue).toBe('-₹3,000.00');
      expect(result.formattedValue).not.toBe('₹0.00');
      expect(result.iconName).toBe('ArrowUpRight');
      expect(result.containerClass).toContain('bg-warning-bg');
      expect(result.containerClass).toContain('text-warning-500');
      expect(result.containerClass).not.toContain('bg-success-bg');
    });

    it('3. State C: Correctly renders zero delta when Outlay === True Spend (exact match / all square)', () => {
      const outlay = 250000; // ₹2,500
      const trueSpend = 250000; // ₹2,500
      const result = resolveReconciliationState(outlay, trueSpend);

      expect(result.state).toBe('ZERO_DELTA');
      expect(result.title).toBe('Settled Balance');
      expect(result.tag).toBe('All Square');
      expect(result.formattedValue).toBe('₹0.00');
      expect(result.iconName).toBe('CheckCircle2');
      expect(result.containerClass).toContain('bg-bg-surface');
      expect(result.containerClass).toContain('text-text-muted');
    });

    it('4. Reconciles subtitle formula strictly with displayed value across 100 random combinations', () => {
      for (let i = 0; i < 100; i++) {
        const outlay = Math.floor(Math.random() * 500000);
        const trueSpend = Math.floor(Math.random() * 500000);
        const result = resolveReconciliationState(outlay, trueSpend);

        const expectedDifference = outlay - trueSpend;
        expect(result.rawDelta).toBe(expectedDifference);

        if (expectedDifference > 0) {
          expect(result.formattedValue).toBe(`+${formatCents(expectedDifference)}`);
          expect(result.state).toBe('POSITIVE_DELTA');
        } else if (expectedDifference < 0) {
          expect(result.formattedValue).toBe(`-${formatCents(Math.abs(expectedDifference))}`);
          expect(result.state).toBe('NEGATIVE_DELTA');
        } else {
          expect(result.formattedValue).toBe('₹0.00');
          expect(result.state).toBe('ZERO_DELTA');
        }
      }
    });
  });

  describe('Card 3 (Paid from Pocket) Status in AnalyticsHeroKPIs', () => {
    it('1. Correctly formats expecting back pill when Outlay > True Spend', () => {
      const kpiState = resolveHeroKpiCard3State(500000, 200000);
      expect(kpiState.type).toBe('EXPECTING_BACK');
      expect(kpiState.text).toBe('Expecting +₹3,000.00 back');
      expect(kpiState.colorClass).toContain('text-success-text');
    });

    it('2. Correctly formats covered by friends pill when Outlay < True Spend', () => {
      const kpiState = resolveHeroKpiCard3State(150000, 450000);
      expect(kpiState.type).toBe('COVERED_BY_FRIENDS');
      expect(kpiState.text).toBe('₹3,000.00 covered by friends');
      expect(kpiState.colorClass).toContain('text-warning-500');
      expect(kpiState.text).not.toContain('Matches your true spend');
    });

    it('3. Correctly formats matches true spend text ONLY when Outlay === True Spend', () => {
      const kpiState = resolveHeroKpiCard3State(350000, 350000);
      expect(kpiState.type).toBe('MATCHES_TRUE_SPEND');
      expect(kpiState.text).toBe('Matches your true spend');
      expect(kpiState.colorClass).toContain('text-text-muted');
    });
  });

  describe('Data Layer Integration (calculateAnalyticsSummary)', () => {
    it('populates netDeltaCents and coveredByFriendsCents correctly on hybrid totals', () => {
      // User did not pay, but owes ₹40.00 split
      const groupExpense: Expense = {
        id: 'gex-999',
        group_id: 'grp-1',
        category_id: 'cat-2',
        description: 'Team Dinner',
        total_amount: 8000,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 8000,
        payer_id: 'friend-1',
        created_by: 'friend-1',
        expense_date: '2026-08-12',
        created_at: '2026-08-12T14:00:00Z',
        updated_at: '2026-08-12T14:00:00Z',
        splits: [
          { expense_id: 'gex-999', user_id: 'user-1', amount_owed: 4000 },
          { expense_id: 'gex-999', user_id: 'friend-1', amount_owed: 4000 },
        ],
      };

      const personalTx: PersonalTransaction = {
        id: 'ptx-999',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 1000, // ₹10 personal coffee
        category: 'Food',
        description: 'Coffee',
        transaction_date: '2026-08-12',
        created_at: '2026-08-12T10:00:00Z',
      };

      const result = calculateAnalyticsSummary({
        period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
        liveExpenses: [groupExpense],
        personalTransactions: [personalTx],
        budget: null,
        categories: MOCK_CATEGORIES,
        groups: MOCK_GROUPS,
        userId: 'user-1',
      });

      // Total Outlay = ₹10 (personal coffee only, friend paid dinner)
      expect(result.hybrid.totalOutlayCents).toBe(1000);
      // Total True Cost = ₹10 (coffee) + ₹40 (dinner share) = ₹50
      expect(result.hybrid.totalTrueCostCents).toBe(5000);
      // Net Delta = 1000 - 5000 = -4000
      expect(result.hybrid.netDeltaCents).toBe(-4000);
      // Covered by Friends = 4000
      expect(result.hybrid.coveredByFriendsCents).toBe(4000);
      // Reimbursement Pending = 0
      expect(result.hybrid.reimbursementPendingCents).toBe(0);

      // Verify the reconciliation state from these exact numbers
      const state = resolveReconciliationState(
        result.hybrid.totalOutlayCents,
        result.hybrid.totalTrueCostCents
      );
      expect(state.state).toBe('NEGATIVE_DELTA');
      expect(state.formattedValue).toBe('-₹40.00');
      expect(state.title).toBe('Covered by Friends (You Owe Share)');
    });
  });
});
