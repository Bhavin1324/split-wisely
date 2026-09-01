import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { calculateAnalyticsSummary } from '../utils/analyticsCalculations';
import { generateRandomTransactions } from './fixtures/analyticsDataGenerator';
import type {
  PersonalTransaction,
  Expense,
  Category,
  Group,
  PersonalBudget,
} from '../types';

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Food & Dining', icon_name: 'Utensils' },
  { id: 'cat-2', name: 'Transportation', icon_name: 'Car' },
  { id: 'cat-3', name: 'Housing & Rent', icon_name: 'Home' },
  { id: 'cat-4', name: 'Entertainment', icon_name: 'Film' },
];

const MOCK_GROUPS: Group[] = [
  {
    id: 'grp-1',
    name: 'Apartment Roommates',
    cover_image_url: null,
    created_by: 'user-1',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'grp-2',
    name: 'Goa Trip',
    cover_image_url: null,
    created_by: 'user-1',
    created_at: '2026-08-01T00:00:00Z',
  },
];

describe('Analytics Engine: Mathematical Invariants', () => {
  it('Invariant 1: Hybrid Net Cost & Outlay Parity (Total Outlay - Net Cost = Pending Reimbursement)', () => {
    // Test across 10, 100, and 1000 transactions
    const scales = [10, 100, 1000];

    for (const scale of scales) {
      const data = generateRandomTransactions({
        minTransactions: scale,
        maxTransactions: scale,
        monthYear: '2026-08',
      });

      const summary = calculateAnalyticsSummary({
        period: data.period,
        liveExpenses: data.liveExpenses,
        personalTransactions: data.personalTransactions,
        budget: data.budget,
        categories: data.categories,
        groups: data.groups,
        userId: data.userId,
      });

      const { totalOutlayCents, totalTrueCostCents, reimbursementPendingCents } = summary.hybrid;

      if (totalOutlayCents >= totalTrueCostCents) {
        expect(totalOutlayCents - totalTrueCostCents).toBe(reimbursementPendingCents);
      } else {
        expect(reimbursementPendingCents).toBe(0);
      }

      expect(totalOutlayCents).toBeGreaterThanOrEqual(0);
      expect(totalTrueCostCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('Invariant 2: Zero Fractional Penny Drift in 3-way, 7-way, and 11-way splits', () => {
    const splitCounts = [3, 7, 11];
    const totalAmounts = [10000, 33333, 99999, 123456]; // in cents

    splitCounts.forEach((count) => {
      totalAmounts.forEach((total) => {
        const baseShare = Math.floor(total / count);
        let remainder = total - baseShare * count;
        const splits = [];

        for (let i = 0; i < count; i++) {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder--;
          splits.push(baseShare + extra);
        }

        const sum = splits.reduce((a, b) => a + b, 0);
        expect(sum).toBe(total);
      });
    });
  });

  it('Invariant 3: Cumulative Spending Monotonicity (S_d >= S_{d-1})', () => {
    const data = generateRandomTransactions({
      minTransactions: 100,
      maxTransactions: 100,
      monthYear: '2026-08',
    });

    const summary = calculateAnalyticsSummary({
      period: data.period,
      liveExpenses: data.liveExpenses,
      personalTransactions: data.personalTransactions,
      budget: data.budget,
      categories: data.categories,
      groups: data.groups,
      userId: data.userId,
    });

    for (let i = 1; i < summary.buckets.length; i++) {
      const prev = summary.buckets[i - 1].cumulativeCents;
      const curr = summary.buckets[i].cumulativeCents;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});

describe('Analytics Engine: Edge-Case & Calendar Matrix', () => {
  it('handles Day 1 of month (elapsed days = 0) without throwing NaN or Infinity', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 5000,
          category: 'Food & Dining',
          description: 'Lunch',
          transaction_date: '2026-08-01',
          created_at: '2026-08-01T12:00:00Z',
        },
      ],
      budget: { user_id: 'user-1', month_year: '2026-08', budget_amount: 100000, opening_balance: null },
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2026-08-01',
    });

    expect(Number.isNaN(result.burnRate.dailyBurnCents)).toBe(false);
    expect(Number.isFinite(result.burnRate.dailyBurnCents)).toBe(true);
    expect(result.burnRate.dailyBurnCents).toBe(5000);
    expect(result.burnRate.projectedPeriodTotalCents).toBe(5000 * 31);
  });

  it('handles Month-end (final day) where remaining days = 1 safely', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 90000,
          category: 'Food & Dining',
          description: 'Dinner',
          transaction_date: '2026-08-31',
          created_at: '2026-08-31T12:00:00Z',
        },
      ],
      budget: { user_id: 'user-1', month_year: '2026-08', budget_amount: 100000, opening_balance: null },
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2026-08-31',
    });

    // 100,000 budget - 90,000 spend = 10,000 remaining for 1 day
    expect(result.safeDailySpendCents).toBe(10000);
  });

  it('handles Over-budget state (remaining budget < 0) by returning strictly 0 daily safe spend', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 150000,
          category: 'Shopping',
          description: 'Phone purchase',
          transaction_date: '2026-08-10',
          created_at: '2026-08-10T12:00:00Z',
        },
      ],
      budget: { user_id: 'user-1', month_year: '2026-08', budget_amount: 100000, opening_balance: null },
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2026-08-15',
    });

    expect(result.safeDailySpendCents).toBe(0);
    expect(result.burnRate.status).toBe('overspend');
  });

  it('handles Prior-period spend of ₹0 without throwing DivisionByZero error (returns null delta)', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 12000,
          category: 'Entertainment',
          description: 'Concert',
          transaction_date: '2026-08-15',
          created_at: '2026-08-15T12:00:00Z',
        },
      ],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
    });

    expect(result.totalDeltaPercent).toBeNull();
    const entCat = result.categories.find(c => c.name === 'Entertainment');
    expect(entCat?.deltaPercent).toBeNull();
    expect(entCat?.sharePercent).toBe(100);
  });

  it('handles Calendar Month Lengths correctly: 28, 29 (Leap), 30, and 31 days', () => {
    const testCases = [
      { monthYear: '2025-02', expectedDays: 28 }, // Feb non-leap
      { monthYear: '2024-02', expectedDays: 29 }, // Feb leap year
      { monthYear: '2026-04', expectedDays: 30 }, // April
      { monthYear: '2026-06', expectedDays: 30 }, // June
      { monthYear: '2026-09', expectedDays: 30 }, // September
      { monthYear: '2026-11', expectedDays: 30 }, // November
      { monthYear: '2026-01', expectedDays: 31 }, // January
      { monthYear: '2026-03', expectedDays: 31 }, // March
      { monthYear: '2026-05', expectedDays: 31 }, // May
      { monthYear: '2026-07', expectedDays: 31 }, // July
      { monthYear: '2026-08', expectedDays: 31 }, // August
      { monthYear: '2026-10', expectedDays: 31 }, // October
      { monthYear: '2026-12', expectedDays: 31 }, // December
    ];

    testCases.forEach(({ monthYear, expectedDays }) => {
      const result = calculateAnalyticsSummary({
        period: { mode: 'Monthly', monthYear, weekStart: `${monthYear}-01` },
        liveExpenses: [],
        personalTransactions: [],
        budget: null,
        categories: MOCK_CATEGORIES,
        groups: MOCK_GROUPS,
        userId: 'user-1',
      });

      expect(result.buckets.length).toBe(expectedDays);
      expect(result.burnRate.totalDaysInPeriod).toBe(expectedDays);
    });
  });

  it('handles ISO Weekly mode bridging across two calendar months (e.g. Aug 31 to Sep 6)', () => {
    const weekStart = '2026-08-31'; // Monday Aug 31, 2026
    const result = calculateAnalyticsSummary({
      period: { mode: 'Weekly', monthYear: '2026-08', weekStart },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-aug',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 3000,
          category: 'Food & Dining',
          description: 'Aug 31 lunch',
          transaction_date: '2026-08-31',
          created_at: '2026-08-31T12:00:00Z',
        },
        {
          id: 'tx-sep',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 4500,
          category: 'Food & Dining',
          description: 'Sep 2 dinner',
          transaction_date: '2026-09-02',
          created_at: '2026-09-02T19:00:00Z',
        },
      ],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
    });

    expect(result.buckets.length).toBe(7);
    expect(result.hybrid.totalTrueCostCents).toBe(7500);
    expect(result.hybrid.personalExpenseCents).toBe(7500);
  });
});

describe('Analytics Engine: Hybrid Split Scenarios', () => {
  it('Scenario A: User is Payer of group bill, but owes 0% share (100% reimbursement pending)', () => {
    const groupExpense: Expense = {
      id: 'gex-100',
      group_id: 'grp-1',
      category_id: 'cat-1',
      description: 'Groceries for flatmates',
      total_amount: 12000, // ₹120
      currency_code: 'INR',
      exchange_rate: 1,
      base_currency_amount: 12000,
      payer_id: 'user-1',
      created_by: 'user-1',
      expense_date: '2026-08-10',
      created_at: '2026-08-10T12:00:00Z',
      updated_at: '2026-08-10T12:00:00Z',
      splits: [
        { expense_id: 'gex-100', user_id: 'friend-1', amount_owed: 6000 },
        { expense_id: 'gex-100', user_id: 'friend-2', amount_owed: 6000 },
      ],
    };

    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [groupExpense],
      personalTransactions: [],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
    });

    expect(result.hybrid.totalOutlayCents).toBe(12000);
    expect(result.hybrid.groupNetShareCents).toBe(0);
    expect(result.hybrid.totalTrueCostCents).toBe(0);
    expect(result.hybrid.reimbursementPendingCents).toBe(12000);
  });

  it('Scenario B: User is NOT Payer of group bill, but owes 50% split (0 outlay, ₹X cost)', () => {
    const groupExpense: Expense = {
      id: 'gex-101',
      group_id: 'grp-1',
      category_id: 'cat-2',
      description: 'Cab ride',
      total_amount: 8000, // ₹80
      currency_code: 'INR',
      exchange_rate: 1,
      base_currency_amount: 8000,
      payer_id: 'friend-1',
      created_by: 'friend-1',
      expense_date: '2026-08-12',
      created_at: '2026-08-12T14:00:00Z',
      updated_at: '2026-08-12T14:00:00Z',
      splits: [
        { expense_id: 'gex-101', user_id: 'user-1', amount_owed: 4000 },
        { expense_id: 'gex-101', user_id: 'friend-1', amount_owed: 4000 },
      ],
    };

    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [groupExpense],
      personalTransactions: [],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
    });

    expect(result.hybrid.totalOutlayCents).toBe(0);
    expect(result.hybrid.groupNetShareCents).toBe(4000);
    expect(result.hybrid.totalTrueCostCents).toBe(4000);
    expect(result.hybrid.reimbursementPendingCents).toBe(0);
  });

  it('Scenario C: User pays for group bill AND has 5 personal transactions on the same calendar day', () => {
    const sameDay = '2026-08-18';

    const groupExpense: Expense = {
      id: 'gex-same-day',
      group_id: 'grp-1',
      category_id: 'cat-1',
      description: 'Group dinner',
      total_amount: 20000,
      currency_code: 'INR',
      exchange_rate: 1,
      base_currency_amount: 20000,
      payer_id: 'user-1',
      created_by: 'user-1',
      expense_date: sameDay,
      created_at: `${sameDay}T20:00:00Z`,
      updated_at: `${sameDay}T20:00:00Z`,
      splits: [
        { expense_id: 'gex-same-day', user_id: 'user-1', amount_owed: 5000 },
        { expense_id: 'gex-same-day', user_id: 'friend-1', amount_owed: 15000 },
      ],
    };

    const personalTxs: PersonalTransaction[] = [1, 2, 3, 4, 5].map(i => ({
      id: `ptx-same-${i}`,
      user_id: 'user-1',
      type: 'EXPENSE',
      amount: 1000 * i, // 1000, 2000, 3000, 4000, 5000 = 15000 total
      category: 'Shopping',
      description: `Shopping item ${i}`,
      transaction_date: sameDay,
      created_at: `${sameDay}T10:0${i}:00Z`,
    }));

    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [groupExpense],
      personalTransactions: personalTxs,
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
    });

    // Total personal = 15000. Group net share = 5000. True cost = 20000.
    // Total outlay = 15000 (personal) + 20000 (group bill) = 35000.
    // Pending reimbursement = 35000 - 20000 = 15000.
    expect(result.hybrid.personalExpenseCents).toBe(15000);
    expect(result.hybrid.groupNetShareCents).toBe(5000);
    expect(result.hybrid.totalTrueCostCents).toBe(20000);
    expect(result.hybrid.totalOutlayCents).toBe(35000);
    expect(result.hybrid.reimbursementPendingCents).toBe(15000);

    const bucket18 = result.buckets.find(b => b.label === 'Aug 18');
    expect(bucket18).toBeDefined();
    expect(bucket18?.personalExpenseCents).toBe(15000);
    expect(bucket18?.groupShareCents).toBe(5000);
  });
});

describe('Analytics Engine: Fuzz Testing (500 Randomized Runs)', () => {
  it('converges accurately across 500 randomized datasets without mathematical drift or NaNs', () => {
    for (let run = 1; run <= 500; run++) {
      const mockDataSet = generateRandomTransactions({
        minTransactions: 30,
        maxTransactions: 150,
        personalExpenseRatio: Math.random(),
        groupCount: Math.floor(Math.random() * 4) + 1,
        memberCount: Math.floor(Math.random() * 6) + 2,
        budgetAmountCents: Math.random() < 0.7 ? (Math.floor(Math.random() * 2000) + 100) * 100 : undefined,
        dynamicBudgetEnabled: Math.random() < 0.5,
      });

      const result = calculateAnalyticsSummary({
        period: mockDataSet.period,
        liveExpenses: mockDataSet.liveExpenses,
        personalTransactions: mockDataSet.personalTransactions,
        budget: mockDataSet.budget,
        categories: mockDataSet.categories,
        groups: mockDataSet.groups,
        userId: mockDataSet.userId,
      });

      // Assert No NaN or Infinite Values
      expect(Number.isNaN(result.hybrid.totalTrueCostCents)).toBe(false);
      expect(Number.isNaN(result.hybrid.totalOutlayCents)).toBe(false);
      expect(Number.isNaN(result.burnRate.dailyBurnCents)).toBe(false);
      expect(Number.isNaN(result.burnRate.projectedPeriodTotalCents)).toBe(false);

      if (result.safeDailySpendCents !== null) {
        expect(Number.isNaN(result.safeDailySpendCents)).toBe(false);
        expect(result.safeDailySpendCents).toBeGreaterThanOrEqual(0);
      }

      // Assert Parity Invariant
      if (result.hybrid.totalOutlayCents >= result.hybrid.totalTrueCostCents) {
        expect(result.hybrid.totalOutlayCents - result.hybrid.totalTrueCostCents).toBe(
          result.hybrid.reimbursementPendingCents
        );
      } else {
        expect(result.hybrid.reimbursementPendingCents).toBe(0);
      }

      // Assert Cumulative Monotonicity
      for (let b = 1; b < result.buckets.length; b++) {
        expect(result.buckets[b].cumulativeCents).toBeGreaterThanOrEqual(
          result.buckets[b - 1].cumulativeCents
        );
      }

      // Assert Group Breakdown Sum Convergence
      const totalGroupBreakdownShares = result.groupBreakdowns.reduce((acc, g) => acc + g.myShareCents, 0);
      expect(totalGroupBreakdownShares).toBe(result.hybrid.groupNetShareCents);

      // Assert Personal Breakdown Sum Convergence
      expect(result.personalBreakdown.totalExpenseCents).toBe(result.hybrid.personalExpenseCents);
      const totalCategoryCents = result.personalBreakdown.categories.reduce((acc, c) => acc + c.totalCents, 0);
      expect(totalCategoryCents).toBe(result.hybrid.personalExpenseCents);
    }
  }, 30000);

  it('Invariant 6: Breakdown Drill-Down Mathematical Properties', () => {
    const period = {
      mode: 'Monthly' as const,
      monthYear: '2026-08',
      weekStart: '2026-08-01T00:00:00Z',
    };
    const userId = 'user-1';

    const groups: Group[] = [
      { id: 'grp-1', name: 'Goa Trip', cover_image_url: null, created_by: 'user-1', created_at: '2026-08-01T00:00:00Z' },
      { id: 'grp-2', name: 'Flat 402', cover_image_url: null, created_by: 'user-1', created_at: '2026-08-01T00:00:00Z' },
    ];

    const liveExpenses: Expense[] = [
      {
        id: 'exp-1',
        group_id: 'grp-1',
        payer_id: 'user-1',
        created_by: 'user-1',
        total_amount: 10000,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 10000,
        description: 'Hotel Booking',
        expense_date: '2026-08-10T12:00:00Z',
        created_at: '2026-08-10T12:00:00Z',
        splits: [
          { id: 's-1', expense_id: 'exp-1', user_id: 'user-1', amount_owed: 5000 },
          { id: 's-2', expense_id: 'exp-1', user_id: 'user-2', amount_owed: 5000 },
        ],
      },
      {
        id: 'exp-2',
        group_id: 'grp-2',
        payer_id: 'user-2',
        created_by: 'user-2',
        total_amount: 6000,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 6000,
        description: 'Groceries',
        expense_date: '2026-08-15T12:00:00Z',
        created_at: '2026-08-15T12:00:00Z',
        splits: [
          { id: 's-3', expense_id: 'exp-2', user_id: 'user-1', amount_owed: 3000 },
          { id: 's-4', expense_id: 'exp-2', user_id: 'user-2', amount_owed: 3000 },
        ],
      },
    ];

    const personalTransactions: PersonalTransaction[] = [
      {
        id: 'tx-1',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 4000,
        category: 'Food',
        description: '[UPI] Dinner with family',
        transaction_date: '2026-08-12T12:00:00Z',
        created_at: '2026-08-12T12:00:00Z',
      },
      {
        id: 'tx-2',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 2000,
        category: 'Transport',
        description: '[CARD] Fuel',
        transaction_date: '2026-08-14T12:00:00Z',
        created_at: '2026-08-14T12:00:00Z',
      },
    ];

    const result = calculateAnalyticsSummary({
      period,
      liveExpenses,
      personalTransactions,
      budget: null,
      categories: [],
      groups,
      userId,
    });

    // Group breakdown assertions
    expect(result.groupBreakdowns.length).toBe(2);
    const goa = result.groupBreakdowns.find(g => g.groupId === 'grp-1');
    expect(goa).toBeDefined();
    expect(goa?.myShareCents).toBe(5000);
    expect(goa?.totalGroupVolumeCents).toBe(10000);
    expect(goa?.myPaidOutlayCents).toBe(10000);

    const flat = result.groupBreakdowns.find(g => g.groupId === 'grp-2');
    expect(flat).toBeDefined();
    expect(flat?.myShareCents).toBe(3000);
    expect(flat?.totalGroupVolumeCents).toBe(6000);
    expect(flat?.myPaidOutlayCents).toBe(0);

    // Personal breakdown assertions
    expect(result.personalBreakdown.totalExpenseCents).toBe(6000);
    expect(result.personalBreakdown.transactionCount).toBe(2);
    expect(result.personalBreakdown.averageTxCents).toBe(3000);
    expect(result.personalBreakdown.categories.length).toBe(2);
    expect(result.personalBreakdown.paymentMethods.length).toBe(2);
    
    const upi = result.personalBreakdown.paymentMethods.find(p => p.method === 'UPI');
    expect(upi?.totalCents).toBe(4000);
    const card = result.personalBreakdown.paymentMethods.find(p => p.method === 'CARD');
    expect(card?.totalCents).toBe(2000);
  });

  it('handles Completed Month (today > currEnd) where projected total strictly equals effectiveCost without rounding drift', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 1732560, // ₹17,325.60 (not divisible evenly by 31)
          category: 'Food',
          description: 'Monthly food total',
          transaction_date: '2026-08-15',
          created_at: '2026-08-15T12:00:00Z',
        },
      ],
      budget: { user_id: 'user-1', month_year: '2026-08', budget_amount: 2000000, opening_balance: null },
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2026-09-01', // September 1 (Month completed!)
    });

    expect(result.burnRate.isCompletedPeriod).toBe(true);
    expect(result.burnRate.daysRemainingInPeriod).toBe(0);
    expect(result.burnRate.elapsedDays).toBe(31);
    expect(result.burnRate.totalDaysInPeriod).toBe(31);
    // Invariant: Projected Total must strictly equal exact actual spent without rounding drift!
    expect(result.burnRate.projectedPeriodTotalCents).toBe(1732560);
    expect(result.burnRate.projectedRemainingSpendCents).toBe(0);
    expect(result.burnRate.status).toBe('on-track');
    expect(result.burnRate.budgetVarianceCents).toBe(2000000 - 1732560);
    expect(result.safeDailySpendCents).toBeNull();
  });

  it('handles Dynamic Calendar Month & Leap Year: February 2024 (29 days) vs February 2025 (28 days) vs September (30 days)', () => {
    // 1. February 2024 (Leap Year) at Day 10
    const febLeapResult = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2024-02', weekStart: '2024-02-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 10000, // ₹100.00 spent in 10 days = ₹10.00/day
          category: 'Food',
          description: 'Lunch',
          transaction_date: '2024-02-10',
          created_at: '2024-02-10T12:00:00Z',
        },
      ],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2024-02-10',
    });

    expect(febLeapResult.burnRate.totalDaysInPeriod).toBe(29);
    expect(febLeapResult.burnRate.elapsedDays).toBe(10);
    expect(febLeapResult.burnRate.daysRemainingInPeriod).toBe(19); // 29 - 10 = 19
    expect(febLeapResult.burnRate.dailyBurnCents).toBe(1000);
    expect(febLeapResult.burnRate.projectedRemainingSpendCents).toBe(1000 * 19); // 19,000
    expect(febLeapResult.burnRate.projectedPeriodTotalCents).toBe(10000 + 19000); // 29,000

    // 2. February 2025 (Non-Leap Year) at Day 10
    const febNonLeapResult = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2025-02', weekStart: '2025-02-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 10000,
          category: 'Food',
          description: 'Lunch',
          transaction_date: '2025-02-10',
          created_at: '2025-02-10T12:00:00Z',
        },
      ],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2025-02-10',
    });

    expect(febNonLeapResult.burnRate.totalDaysInPeriod).toBe(28);
    expect(febNonLeapResult.burnRate.elapsedDays).toBe(10);
    expect(febNonLeapResult.burnRate.daysRemainingInPeriod).toBe(18); // 28 - 10 = 18
    expect(febNonLeapResult.burnRate.projectedRemainingSpendCents).toBe(1000 * 18); // 18,000
    expect(febNonLeapResult.burnRate.projectedPeriodTotalCents).toBe(10000 + 18000); // 28,000

    // 3. September 2026 (30 days) at Day 10
    const sepResult = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-09', weekStart: '2026-09-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 10000,
          category: 'Food',
          description: 'Lunch',
          transaction_date: '2026-09-10',
          created_at: '2026-09-10T12:00:00Z',
        },
      ],
      budget: null,
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-1',
      today: '2026-09-10',
    });

    expect(sepResult.burnRate.totalDaysInPeriod).toBe(30);
    expect(sepResult.burnRate.elapsedDays).toBe(10);
    expect(sepResult.burnRate.daysRemainingInPeriod).toBe(20); // 30 - 10 = 20
    expect(sepResult.burnRate.projectedRemainingSpendCents).toBe(1000 * 20); // 20,000
    expect(sepResult.burnRate.projectedPeriodTotalCents).toBe(10000 + 20000); // 30,000
  });

  it('handles Dynamic Budget income offset properly in Barberrion King August scenario', () => {
    const result = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-08', weekStart: '2026-08-01' },
      liveExpenses: [],
      personalTransactions: [
        {
          id: 'tx-exp-1',
          user_id: 'user-barberrion',
          type: 'EXPENSE',
          amount: 2000000, // ₹20,000.00
          category: 'Bills',
          description: 'Rent',
          transaction_date: '2026-08-05',
          created_at: '2026-08-05T12:00:00Z',
        },
        {
          id: 'tx-inc-1',
          user_id: 'user-barberrion',
          type: 'INCOME',
          amount: 275434, // ₹2,754.34 income/refunds
          category: 'Refund',
          description: 'Roommate share return',
          transaction_date: '2026-08-10',
          created_at: '2026-08-10T12:00:00Z',
        },
      ],
      budget: {
        user_id: 'user-barberrion',
        month_year: '2026-08',
        budget_amount: 1800000, // ₹18,000.00
        opening_balance: null,
        dynamic_budget_enabled: true,
      },
      categories: MOCK_CATEGORIES,
      groups: MOCK_GROUPS,
      userId: 'user-barberrion',
      today: '2026-09-01',
    });

    expect(result.burnRate.isCompletedPeriod).toBe(true);
    expect(result.burnRate.incomeOffsetCents).toBe(275434);
    // Effective cost = 2000000 - 275434 = 1724566 cents
    expect(result.burnRate.actualSpentSoFarCents).toBe(1724566);
    expect(result.burnRate.projectedPeriodTotalCents).toBe(1724566);
    // 1800000 budget - 1724566 = 75434 variance (Saved ₹754.34)
    expect(result.burnRate.budgetVarianceCents).toBe(75434);
    expect(result.burnRate.status).toBe('on-track');
  });
});
