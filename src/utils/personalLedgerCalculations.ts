import dayjs from 'dayjs';
import type { PersonalTransaction, PersonalBudget } from '../types';

export interface PersonalLedgerSummary {
  openingBalance: number | null; // in cents, or null if unconfigured
  totalIncome: number;    // in cents
  totalExpense: number;   // in cents
  netExpense: number;     // in cents: Math.max(0, totalExpense - totalIncome)
  effectiveExpense: number; // in cents: dynamicBudgetEnabled ? netExpense : totalExpense
  netCashFlow: number;    // in cents: totalIncome - totalExpense
  closingBalance: number | null; // in cents: openingBalance + netCashFlow, or null if unconfigured
  budgetAmount: number | null; // in cents
  remainingBudget: number | null; // in cents: active remaining budget (Strict or Dynamic)
  remainingBudgetStrict: number | null; // in cents: budgetAmount - totalExpense (Strict)
  remainingBudgetDynamic: number | null; // in cents: budgetAmount - (totalExpense - totalIncome) (Dynamic)
  dynamicBudgetEnabled: boolean;
  safeDailyLimit: number | null; // in cents per day
  daysRemaining: number;
}

export interface LedgerInput {
  transactions: PersonalTransaction[];
  budget: PersonalBudget | null;
  previousBudget?: PersonalBudget | null;
  monthYear: string; // "YYYY-MM"
  today?: Date;
}

/**
 * Extracts "YYYY-MM" from an ISO or date-like string safely.
 */
export function getTxMonth(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.length >= 7 && dateStr[4] === '-') {
    return dateStr.substring(0, 7);
  }
  return dayjs(dateStr).format('YYYY-MM');
}

/**
 * Calculates remaining days in a month.
 * For current month, includes today (1 minimum).
 * For past months, returns 0.
 * For future months, returns the total days in that month.
 */
export function calculateDaysRemaining(
  targetYear: number,
  targetMonth: number,
  today: Date = new Date()
): number {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  if (targetYear === currentYear && targetMonth === currentMonth) {
    return Math.max(1, totalDaysInMonth - today.getDate() + 1);
  } else if (
    targetYear < currentYear ||
    (targetYear === currentYear && targetMonth < currentMonth)
  ) {
    return 0;
  } else {
    return totalDaysInMonth;
  }
}

/**
 * Calculates safe daily spend in integer cents/paisa.
 * Clamps negative amounts or invalid days to 0.
 */
export function calculateDailySafeSpend(
  remainingBudgetCents: number | null,
  daysRemaining: number
): number {
  if (remainingBudgetCents === null || remainingBudgetCents <= 0 || daysRemaining <= 0) {
    return 0;
  }
  return Math.floor(remainingBudgetCents / daysRemaining);
}

/**
 * Pure calculation function for Personal Ledger summary.
 */
export function calculateLedgerSummary(input: LedgerInput): PersonalLedgerSummary {
  const { transactions, budget, previousBudget, monthYear, today = new Date() } = input;
  const [targetYearStr, targetMonthStr] = monthYear.split('-');
  const targetYear = parseInt(targetYearStr, 10);
  const targetMonth = parseInt(targetMonthStr, 10);
  const prevMonthYear = dayjs(`${monthYear}-01`).subtract(1, 'month').format('YYYY-MM');

  // 1. Opening Balance Resolution
  // Priority:
  // a. Manual override for current month
  // b. Inherited from previous month's closing balance (prevOpening + prevIncome - prevExpense)
  // c. Unset (null)
  let openingBalance: number | null = null;
  if (budget?.is_opening_manual && typeof budget?.opening_balance === 'number') {
    openingBalance = budget.opening_balance;
  } else if (
    previousBudget &&
    (previousBudget.is_opening_manual || typeof previousBudget.opening_balance === 'number')
  ) {
    const prevOpening = previousBudget.opening_balance ?? 0;
    const prevMonthTransactions = transactions.filter(
      (tx) => getTxMonth(tx.transaction_date) === prevMonthYear
    );
    let prevIncome = 0;
    let prevExpense = 0;
    prevMonthTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') prevIncome += tx.amount;
      if (tx.type === 'EXPENSE') prevExpense += tx.amount;
    });
    openingBalance = prevOpening + prevIncome - prevExpense;
  } else {
    openingBalance = null;
  }

  // 2. Month M transactions
  const monthTransactions = transactions.filter(
    (tx) => getTxMonth(tx.transaction_date) === monthYear
  );
  let totalIncome = 0;
  let totalExpense = 0;

  monthTransactions.forEach((tx) => {
    if (tx.type === 'INCOME') totalIncome += tx.amount;
    if (tx.type === 'EXPENSE') totalExpense += tx.amount;
  });

  // 3. Cash Flow, Balances & Budgets
  const netCashFlow = totalIncome - totalExpense;
  const netExpense = Math.max(0, totalExpense - totalIncome);
  const closingBalance =
    openingBalance !== null ? openingBalance + netCashFlow : null;
  const budgetAmount = budget?.budget_amount ?? null;
  const dynamicBudgetEnabled = budget?.dynamic_budget_enabled ?? false;
  const effectiveExpense = dynamicBudgetEnabled ? netExpense : totalExpense;

  // Strict Mode: budget - expenses
  const remainingBudgetStrict =
    budgetAmount !== null ? budgetAmount - totalExpense : null;

  // Dynamic Mode: budget - (expenses - income)
  const remainingBudgetDynamic =
    budgetAmount !== null ? budgetAmount - (totalExpense - totalIncome) : null;

  // Active remaining budget based on toggle
  const remainingBudget = dynamicBudgetEnabled
    ? remainingBudgetDynamic
    : remainingBudgetStrict;

  // 4. Days Remaining & Safe Daily Spend
  const daysRemaining = calculateDaysRemaining(targetYear, targetMonth, today);

  let safeDailyLimit: number | null = null;
  if (remainingBudget !== null && daysRemaining > 0) {
    safeDailyLimit = calculateDailySafeSpend(remainingBudget, daysRemaining);
  }

  return {
    openingBalance,
    totalIncome,
    totalExpense,
    netExpense,
    effectiveExpense,
    netCashFlow,
    closingBalance,
    budgetAmount,
    remainingBudget,
    remainingBudgetStrict,
    remainingBudgetDynamic,
    dynamicBudgetEnabled,
    safeDailyLimit,
    daysRemaining,
  };
}
