import { describe, it, expect } from 'vitest';
import {
  calculateLedgerSummary,
  calculateDaysRemaining,
  calculateDailySafeSpend,
  getTxMonth,
} from '../personalLedgerCalculations';
import { formatCents, parseToCents, centsToDecimal } from '../currency';
import type { PersonalTransaction, PersonalBudget } from '../../types';

describe('getTxMonth', () => {
  it('extracts YYYY-MM from standard ISO timestamp', () => {
    expect(getTxMonth('2026-08-15T14:30:00.000Z')).toBe('2026-08');
  });

  it('extracts YYYY-MM from YYYY-MM-DD date string', () => {
    expect(getTxMonth('2026-08-01')).toBe('2026-08');
  });

  it('handles empty string gracefully', () => {
    expect(getTxMonth('')).toBe('');
  });

  it('formats non-standard date strings using dayjs fallback', () => {
    expect(getTxMonth('August 15, 2026')).toBe('2026-08');
  });
});

describe('calculateDaysRemaining', () => {
  it('calculates days remaining on Day 1 of a 31-day month', () => {
    const today = new Date(2026, 0, 1); // Jan 1, 2026
    expect(calculateDaysRemaining(2026, 1, today)).toBe(31);
  });

  it('calculates days remaining mid-month (Day 15 of 31-day month)', () => {
    const today = new Date(2026, 0, 15); // Jan 15, 2026
    // 31 - 15 + 1 = 17 days remaining (including today)
    expect(calculateDaysRemaining(2026, 1, today)).toBe(17);
  });

  it('calculates 1 day remaining on the final day of the month', () => {
    const today = new Date(2026, 0, 31); // Jan 31, 2026
    expect(calculateDaysRemaining(2026, 1, today)).toBe(1);
  });

  it('handles 28-day February in non-leap year (2025)', () => {
    const day1 = new Date(2025, 1, 1);
    expect(calculateDaysRemaining(2025, 2, day1)).toBe(28);

    const lastDay = new Date(2025, 1, 28);
    expect(calculateDaysRemaining(2025, 2, lastDay)).toBe(1);
  });

  it('handles 29-day February in leap year (2024)', () => {
    const day1 = new Date(2024, 1, 1);
    expect(calculateDaysRemaining(2024, 2, day1)).toBe(29);

    const leapDay = new Date(2024, 1, 29);
    expect(calculateDaysRemaining(2024, 2, leapDay)).toBe(1);
  });

  it('handles 30-day month (April 2026)', () => {
    const day1 = new Date(2026, 3, 1);
    expect(calculateDaysRemaining(2026, 4, day1)).toBe(30);

    const day30 = new Date(2026, 3, 30);
    expect(calculateDaysRemaining(2026, 4, day30)).toBe(1);
  });

  it('returns 0 for past months in the same year', () => {
    const today = new Date(2026, 7, 15); // August 2026
    expect(calculateDaysRemaining(2026, 5, today)).toBe(0); // May 2026
  });

  it('returns 0 for past years', () => {
    const today = new Date(2026, 0, 10);
    expect(calculateDaysRemaining(2025, 12, today)).toBe(0);
  });

  it('returns total days in month for future months', () => {
    const today = new Date(2026, 0, 10); // Jan 2026
    expect(calculateDaysRemaining(2026, 2, today)).toBe(28); // Feb 2026
    expect(calculateDaysRemaining(2026, 3, today)).toBe(31); // March 2026
    expect(calculateDaysRemaining(2027, 1, today)).toBe(31); // Jan 2027
  });
});

describe('calculateDailySafeSpend', () => {
  it('divides remaining budget cleanly by days remaining', () => {
    // 30,000 cents (300.00) / 10 days = 3,000 cents/day (30.00/day)
    expect(calculateDailySafeSpend(30000, 10)).toBe(3000);
  });

  it('floors fractions without rounding up (conservative safe spend)', () => {
    // 10,000 cents / 3 days = 3333.33 -> 3333 cents/day
    expect(calculateDailySafeSpend(10000, 3)).toBe(3333);
  });

  it('clamps to 0 when remaining budget is negative (overbudget)', () => {
    expect(calculateDailySafeSpend(-5000, 10)).toBe(0);
  });

  it('clamps to 0 when remaining budget is 0', () => {
    expect(calculateDailySafeSpend(0, 15)).toBe(0);
  });

  it('returns 0 when days remaining is 0 or negative', () => {
    expect(calculateDailySafeSpend(50000, 0)).toBe(0);
    expect(calculateDailySafeSpend(50000, -2)).toBe(0);
  });

  it('returns 0 when remaining budget is null', () => {
    expect(calculateDailySafeSpend(null, 10)).toBe(0);
  });
});

describe('calculateLedgerSummary - Core Scenario Matrices', () => {
  // Scenario 1: Standard Positive Scenario
  describe('Scenario 1: Standard Positive Scenario with Explicit Opening Balance', () => {
    const budget: PersonalBudget = {
      id: 'b-1',
      user_id: 'user-1',
      month_year: '2026-08',
      budget_amount: 1868559, // ₹18,685.59
      opening_balance: 1868559, // ₹18,685.59
      is_opening_manual: true,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    };

    const transactions: PersonalTransaction[] = [
      {
        id: 'tx-in-1',
        user_id: 'user-1',
        type: 'INCOME',
        amount: 75434, // ₹754.34
        category: 'Freelance',
        description: 'Design gig payment',
        transaction_date: '2026-08-05T10:00:00Z',
        created_at: '2026-08-05T10:00:00Z',
      },
      {
        id: 'tx-out-1',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 1559255, // ₹15,592.55
        category: 'Rent',
        description: 'Monthly studio rent',
        transaction_date: '2026-08-06T12:00:00Z',
        created_at: '2026-08-06T12:00:00Z',
      },
    ];

    it('calculates exact financial figures without floating point precision drift', () => {
      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10), // August 10, 2026
      });

      // Opening Balance
      expect(summary.openingBalance).toBe(1868559);

      // Money In & Out
      expect(summary.totalIncome).toBe(75434);
      expect(summary.totalExpense).toBe(1559255);

      // Net Cash Flow: 75434 - 1559255 = -1483821 (-₹14,838.21)
      expect(summary.netCashFlow).toBe(-1483821);

      // Available Closing Balance: 1868559 + (-1483821) = 384738 (₹3,847.38)
      expect(summary.closingBalance).toBe(384738);

      // Strict Remaining Budget: 1868559 - 1559255 = 309304 (₹3,093.04)
      expect(summary.remainingBudget).toBe(309304);

      // Dynamic Remaining Budget: 1868559 - (1559255 - 75434) = 384738 (₹3,847.38)
      expect(summary.remainingBudgetDynamic).toBe(384738);

      // Days Remaining: August has 31 days. On Aug 10: 31 - 10 + 1 = 22 days left
      expect(summary.daysRemaining).toBe(22);

      // Safe Daily Limit (Strict): 309304 / 22 = 14059 paisa/day (₹140.59/day)
      expect(summary.safeDailyLimit).toBe(14059);
    });
  });

  // Scenario 2: Zero Opening Balance & Clean Slates
  describe('Scenario 2: Zero Opening Balance & Clean Slates', () => {
    it('handles fresh month with 0 opening balance and only income', () => {
      const budget: PersonalBudget = {
        id: 'b-2',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 5000000, // ₹50,000.00
        opening_balance: 0,
        is_opening_manual: true,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const transactions: PersonalTransaction[] = [
        {
          id: 'tx-1',
          user_id: 'user-1',
          type: 'INCOME',
          amount: 10000000, // ₹1,00,000.00
          category: 'Salary',
          description: 'Salary Credit',
          transaction_date: '2026-08-01T09:00:00Z',
          created_at: '2026-08-01T09:00:00Z',
        },
      ];

      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 1), // Aug 1
      });

      expect(summary.openingBalance).toBe(0);
      expect(summary.totalIncome).toBe(10000000);
      expect(summary.totalExpense).toBe(0);
      expect(summary.netCashFlow).toBe(10000000);
      expect(summary.closingBalance).toBe(10000000);
      expect(summary.remainingBudget).toBe(5000000);
      expect(summary.remainingBudgetDynamic).toBe(15000000);
      expect(summary.safeDailyLimit).toBe(Math.floor(5000000 / 31));
    });

    it('handles pure cash flow mode when budget is null and unconfigured', () => {
      const summary = calculateLedgerSummary({
        transactions: [],
        budget: null,
        monthYear: '2026-08',
        today: new Date(2026, 7, 1),
      });

      expect(summary.openingBalance).toBeNull();
      expect(summary.closingBalance).toBeNull();
      expect(summary.budgetAmount).toBeNull();
      expect(summary.remainingBudget).toBeNull();
      expect(summary.remainingBudgetDynamic).toBeNull();
      expect(summary.safeDailyLimit).toBeNull();
    });
  });

  // Scenario 3: Heavy Overdraft & Deficit Scenarios
  describe('Scenario 3: Heavy Overdraft & Deficit Scenarios', () => {
    it('correctly reports negative balance and clamps safe spend to 0', () => {
      const budget: PersonalBudget = {
        id: 'b-3',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 1000000, // ₹10,000
        opening_balance: 500000, // ₹5,000
        is_opening_manual: true,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const transactions: PersonalTransaction[] = [
        {
          id: 'tx-over-1',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 2500000, // ₹25,000 (spent 25k against 10k budget and 5k balance)
          category: 'Shopping',
          description: 'Emergency Laptop Purchase',
          transaction_date: '2026-08-02T10:00:00Z',
          created_at: '2026-08-02T10:00:00Z',
        },
      ];

      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(2500000);
      expect(summary.netCashFlow).toBe(-2500000);
      // Available Balance: 500,000 - 2,500,000 = -2,000,000 (-₹20,000)
      expect(summary.closingBalance).toBe(-2000000);
      // Remaining Budget: 1,000,000 - 2,500,000 = -1,500,000
      expect(summary.remainingBudget).toBe(-1500000);
      // Safe daily limit must NEVER be negative
      expect(summary.safeDailyLimit).toBe(0);
    });
  });

  // Scenario 4: Dynamic Mode Offsetting (Refunds & Inflows)
  describe('Scenario 4: Dynamic Mode Offsetting (Refunds & Inflows)', () => {
    it('compares Strict Mode vs Dynamic Mode with refunds', () => {
      const budget: PersonalBudget = {
        id: 'b-4',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 1000000, // ₹10,000 Budget
        opening_balance: 1000000,
        is_opening_manual: true,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const transactions: PersonalTransaction[] = [
        {
          id: 'tx-sp',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 500000, // ₹5,000 spent
          category: 'Shopping',
          description: 'Clothes',
          transaction_date: '2026-08-05T10:00:00Z',
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'tx-ref',
          user_id: 'user-1',
          type: 'INCOME',
          amount: 200000, // ₹2,000 refund/reimbursement
          category: 'Refund',
          description: 'Returned one shirt',
          transaction_date: '2026-08-06T10:00:00Z',
          created_at: '2026-08-06T10:00:00Z',
        },
      ];

      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      // Strict Mode (default): Budget - Expense = 10,000 - 5,000 = 5,000 (500000 paisa)
      expect(summary.remainingBudget).toBe(500000);
      expect(summary.remainingBudgetStrict).toBe(500000);
      expect(summary.remainingBudgetDynamic).toBe(700000);
      expect(summary.dynamicBudgetEnabled).toBe(false);
      expect(summary.effectiveExpense).toBe(500000); // Raw expense in strict mode
      expect(summary.netExpense).toBe(300000); // Net expense after income

      // When dynamic_budget_enabled is true
      const dynamicSummary = calculateLedgerSummary({
        transactions,
        budget: { ...budget, dynamic_budget_enabled: true },
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      expect(dynamicSummary.remainingBudget).toBe(700000);
      expect(dynamicSummary.dynamicBudgetEnabled).toBe(true);
      expect(dynamicSummary.effectiveExpense).toBe(300000); // Net expense in dynamic mode
      expect(dynamicSummary.netExpense).toBe(300000);
      // Safe daily limit (22 days left in Aug): 700000 / 22 = 31818 paisa/day
      expect(dynamicSummary.safeDailyLimit).toBe(Math.floor(700000 / 22));
    });

    it('handles scenario where income exceeds expense in Dynamic Mode', () => {
      const budget: PersonalBudget = {
        id: 'b-4b',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 1000000, // ₹10,000 Budget
        opening_balance: 1000000,
        is_opening_manual: true,
        dynamic_budget_enabled: true,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const transactions: PersonalTransaction[] = [
        {
          id: 'tx-sp-2',
          user_id: 'user-1',
          type: 'EXPENSE',
          amount: 300000, // ₹3,000 spent
          category: 'Shopping',
          description: 'Clothes',
          transaction_date: '2026-08-05T10:00:00Z',
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'tx-ref-2',
          user_id: 'user-1',
          type: 'INCOME',
          amount: 500000, // ₹5,000 income/refund (exceeds expense by 2,000)
          category: 'Refund',
          description: 'Refund + Bonus',
          transaction_date: '2026-08-06T10:00:00Z',
          created_at: '2026-08-06T10:00:00Z',
        },
      ];

      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      // Net expense clamps to 0 (cannot be negative expense)
      expect(summary.netExpense).toBe(0);
      expect(summary.effectiveExpense).toBe(0);
      // Remaining budget expands: 10,000 - (3,000 - 5,000) = 12,000 (1200000 paisa)
      expect(summary.remainingBudget).toBe(1200000);
      expect(summary.remainingBudgetStrict).toBe(700000);
    });
  });

  // Scenario 5: Previous Month Budget Inheritance & Unconfigured State Handling
  describe('Scenario 5: Previous Month Budget Inheritance & Unconfigured State Handling', () => {
    const transactions: PersonalTransaction[] = [
      // Prior month: July 2026 (+₹5,000 freelance, -₹15,000 trip -> net -₹10,000)
      {
        id: 'tx-july-in',
        user_id: 'user-1',
        type: 'INCOME',
        amount: 500000,
        category: 'Freelance',
        description: 'July Gig',
        transaction_date: '2026-07-10T00:00:00Z',
        created_at: '2026-07-10T00:00:00Z',
      },
      {
        id: 'tx-july-out',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 1500000,
        category: 'Travel',
        description: 'July Trip',
        transaction_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T00:00:00Z',
      },
      // Current month: August 2026 (-₹4,000 food)
      {
        id: 'tx-aug-out',
        user_id: 'user-1',
        type: 'EXPENSE',
        amount: 400000,
        category: 'Food',
        description: 'August Groceries',
        transaction_date: '2026-08-02T00:00:00Z',
        created_at: '2026-08-02T00:00:00Z',
      },
    ];

    it('inherits previous month closing balance as default opening balance', () => {
      const currentBudget: PersonalBudget = {
        id: 'b-aug',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 2000000,
        opening_balance: 0,
        is_opening_manual: false, // Not manually set, inherit from July
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const previousBudget: PersonalBudget = {
        id: 'b-july',
        user_id: 'user-1',
        month_year: '2026-07',
        budget_amount: 2500000,
        opening_balance: 3000000, // July started with ₹30,000
        is_opening_manual: true,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      };

      const summary = calculateLedgerSummary({
        transactions,
        budget: currentBudget,
        previousBudget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      // July closing = July opening (30,000) + July income (5,000) - July expense (15,000) = 20,000 (2,000,000 paisa)
      expect(summary.openingBalance).toBe(2000000);
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(400000);
      expect(summary.netCashFlow).toBe(-400000);
      expect(summary.closingBalance).toBe(1600000);
    });

    it('treats openingBalance and closingBalance as null when unconfigured and no previous budget exists', () => {
      const currentBudget: PersonalBudget = {
        id: 'b-aug-unset',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 2000000,
        opening_balance: null,
        is_opening_manual: false,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const summary = calculateLedgerSummary({
        transactions,
        budget: currentBudget,
        previousBudget: null,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      // Must NOT default to 0 and calculate a false negative closing balance
      expect(summary.openingBalance).toBeNull();
      expect(summary.closingBalance).toBeNull();
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(400000);
      expect(summary.netCashFlow).toBe(-400000);
      expect(summary.remainingBudget).toBe(1600000);
    });

    it('honors explicit 0 starting balance when is_opening_manual is true', () => {
      const currentBudget: PersonalBudget = {
        id: 'b-aug-zero',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 2000000,
        opening_balance: 0,
        is_opening_manual: true, // User explicitly entered ₹0.00
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const summary = calculateLedgerSummary({
        transactions,
        budget: currentBudget,
        previousBudget: null,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      expect(summary.openingBalance).toBe(0);
      expect(summary.closingBalance).toBe(-400000);
    });
  });

  // Scenario 6: Sub-Rupee / Fractional Cent Stress Test (1,000 randomized micro-transactions)
  describe('Scenario 6: Micro-Transaction Precision & Exact Convergence (1,000 Transactions)', () => {
    it('aggregates 1,000 random micro-transactions without a single dropped paisa', () => {
      const transactions: PersonalTransaction[] = [];
      let expectedIncome = 0;
      let expectedExpense = 0;

      // Seed pseudo-random generator for reproducibility
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      for (let i = 0; i < 1000; i++) {
        // Random amount between 1 and 99 paisa
        const amount = Math.floor(pseudoRandom() * 99) + 1;
        const isIncome = pseudoRandom() > 0.6;
        const type = isIncome ? 'INCOME' : 'EXPENSE';

        if (isIncome) {
          expectedIncome += amount;
        } else {
          expectedExpense += amount;
        }

        transactions.push({
          id: `micro-tx-${i}`,
          user_id: 'user-1',
          type,
          amount,
          category: isIncome ? 'Salary' : 'Food',
          description: `Micro transaction #${i}`,
          transaction_date: '2026-08-10T12:00:00Z',
          created_at: '2026-08-10T12:00:00Z',
        });
      }

      const budget: PersonalBudget = {
        id: 'b-micro',
        user_id: 'user-1',
        month_year: '2026-08',
        budget_amount: 100000,
        opening_balance: 50000,
        is_opening_manual: true,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      };

      const summary = calculateLedgerSummary({
        transactions,
        budget,
        monthYear: '2026-08',
        today: new Date(2026, 7, 10),
      });

      expect(summary.totalIncome).toBe(expectedIncome);
      expect(summary.totalExpense).toBe(expectedExpense);
      expect(summary.netCashFlow).toBe(expectedIncome - expectedExpense);
      expect(summary.closingBalance).toBe(50000 + (expectedIncome - expectedExpense));
      expect(summary.remainingBudget).toBe(100000 - expectedExpense);
    });
  });
});

describe('Currency Utility Precision & Formatting', () => {
  it('converts cents to decimal accurately', () => {
    expect(centsToDecimal(1868559)).toBe(18685.59);
    expect(centsToDecimal(75434)).toBe(754.34);
    expect(centsToDecimal(1)).toBe(0.01);
    expect(centsToDecimal(0)).toBe(0);
  });

  it('parses currency strings into exact integer cents', () => {
    expect(parseToCents('18,685.59')).toBe(1868559);
    expect(parseToCents('₹754.34')).toBe(75434);
    expect(parseToCents('0.01')).toBe(1);
    expect(parseToCents('0')).toBe(0);
    expect(parseToCents('-150.25')).toBe(-15025);
  });

  it('formats positive and negative amounts correctly', () => {
    expect(formatCents(1868559, 'INR')).toContain('18,685.59');
    expect(formatCents(-1483821, 'INR')).toContain('-₹14,838.21');
    expect(formatCents(0, 'INR')).toContain('0.00');
  });
});
