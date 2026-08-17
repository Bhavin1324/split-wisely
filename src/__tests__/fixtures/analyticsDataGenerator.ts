import type {
  PersonalTransaction,
  Expense,
  ExpenseSplit,
  Group,
  Category,
  PersonalBudget,
  Profile,
} from '../../types';
import type { AnalyticsPeriod } from '../../utils/analyticsCalculations';

export interface GeneratorOptions {
  userId?: string;
  minTransactions?: number;
  maxTransactions?: number;
  personalExpenseRatio?: number; // 0.0 to 1.0
  groupCount?: number;
  memberCount?: number;
  monthYear?: string; // 'YYYY-MM'
  budgetAmountCents?: number;
  dynamicBudgetEnabled?: boolean;
}

export interface SyntheticDataset {
  userId: string;
  period: AnalyticsPeriod;
  personalTransactions: PersonalTransaction[];
  liveExpenses: Expense[];
  categories: Category[];
  groups: Group[];
  budget: PersonalBudget | null;
  profiles: Profile[];
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Food & Dining', icon_name: 'Utensils' },
  { id: 'cat-2', name: 'Transportation', icon_name: 'Car' },
  { id: 'cat-3', name: 'Housing & Rent', icon_name: 'Home' },
  { id: 'cat-4', name: 'Entertainment', icon_name: 'Film' },
  { id: 'cat-5', name: 'Utilities', icon_name: 'Zap' },
  { id: 'cat-6', name: 'Shopping', icon_name: 'ShoppingBag' },
];

/**
 * Procedurally generates synthetic datasets of arbitrary scale
 * ensuring zero fractional cent splits and realistic distribution.
 */
export function generateRandomTransactions(options: GeneratorOptions = {}): SyntheticDataset {
  const userId = options.userId || 'user-self';
  const monthYear = options.monthYear || '2026-08';
  const minTx = options.minTransactions ?? 20;
  const maxTx = options.maxTransactions ?? 100;
  const totalCount = Math.floor(Math.random() * (maxTx - minTx + 1)) + minTx;
  const personalRatio = options.personalExpenseRatio ?? 0.5;
  const groupCount = options.groupCount ?? 3;
  const memberCount = options.memberCount ?? 4;

  const [year, month] = monthYear.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create profiles
  const profiles: Profile[] = [
    {
      id: userId,
      full_name: 'Primary User',
      avatar_url: null,
      default_currency: 'INR',
      created_at: `${monthYear}-01T00:00:00Z`,
    },
  ];

  for (let i = 1; i <= memberCount; i++) {
    profiles.push({
      id: `friend-${i}`,
      full_name: `Friend ${i}`,
      avatar_url: null,
      default_currency: 'INR',
      created_at: `${monthYear}-01T00:00:00Z`,
    });
  }

  // Create groups
  const groups: Group[] = [];
  for (let g = 1; g <= groupCount; g++) {
    groups.push({
      id: `group-${g}`,
      name: `Group ${g}`,
      cover_image_url: null,
      created_by: userId,
      created_at: `${monthYear}-01T00:00:00Z`,
      member_count: memberCount + 1,
    });
  }

  const personalTransactions: PersonalTransaction[] = [];
  const liveExpenses: Expense[] = [];

  for (let i = 0; i < totalCount; i++) {
    const isPersonal = Math.random() < personalRatio;
    const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
    const dayStr = String(randomDay).padStart(2, '0');
    const dateStr = `${monthYear}-${dayStr}`;
    const cat = DEFAULT_CATEGORIES[Math.floor(Math.random() * DEFAULT_CATEGORIES.length)];

    if (isPersonal) {
      const isIncome = Math.random() < 0.15; // 15% chance of income/refund
      const amount = Math.floor(Math.random() * 50000) + 500; // 500 to 50500 cents (₹5 to ₹505)

      personalTransactions.push({
        id: `ptx-${i}`,
        user_id: userId,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        amount,
        category: cat.name,
        description: isIncome ? `Income ${i}` : `Personal item ${i}`,
        transaction_date: dateStr,
        created_at: `${dateStr}T10:00:00Z`,
      });
    } else {
      // Group expense
      const group = groups[Math.floor(Math.random() * groups.length)];
      const totalAmount = (Math.floor(Math.random() * 300) + 10) * 100; // Multiples of 100 cents
      const isUserPayer = Math.random() < 0.5;
      const payerId = isUserPayer ? userId : `friend-${Math.floor(Math.random() * memberCount) + 1}`;
      const payerProfile = profiles.find(p => p.id === payerId)!;

      // Split across members (including user)
      const participants = profiles.slice(0, memberCount + 1);
      const splitMode = Math.random();
      const splits: ExpenseSplit[] = [];

      if (splitMode < 0.7) {
        // Equal split with zero fractional penny drift
        const baseShare = Math.floor(totalAmount / participants.length);
        let remainder = totalAmount - baseShare * participants.length;

        participants.forEach((p) => {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder--;
          splits.push({
            expense_id: `gex-${i}`,
            user_id: p.id,
            amount_owed: baseShare + extra,
            user: p,
          });
        });
      } else {
        // Random percentage/shares split summing exactly to totalAmount
        const weights = participants.map(() => Math.random() + 0.1);
        const weightSum = weights.reduce((a, b) => a + b, 0);
        let allocated = 0;

        participants.forEach((p, idx) => {
          if (idx === participants.length - 1) {
            splits.push({
              expense_id: `gex-${i}`,
              user_id: p.id,
              amount_owed: totalAmount - allocated,
              user: p,
            });
          } else {
            const share = Math.floor((weights[idx] / weightSum) * totalAmount);
            allocated += share;
            splits.push({
              expense_id: `gex-${i}`,
              user_id: p.id,
              amount_owed: share,
              user: p,
            });
          }
        });
      }

      liveExpenses.push({
        id: `gex-${i}`,
        group_id: group.id,
        category_id: cat.id,
        description: `Group bill ${i}`,
        total_amount: totalAmount,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: totalAmount,
        payer_id: payerId,
        payer: payerProfile,
        receipt_image_url: null,
        created_by: payerId,
        expense_date: dateStr,
        created_at: `${dateStr}T12:00:00Z`,
        updated_at: `${dateStr}T12:00:00Z`,
        category: cat,
        splits,
      });
    }
  }

  const budget: PersonalBudget | null = options.budgetAmountCents
    ? {
        user_id: userId,
        month_year: monthYear,
        budget_amount: options.budgetAmountCents,
        opening_balance: null,
        dynamic_budget_enabled: options.dynamicBudgetEnabled ?? false,
      }
    : null;

  return {
    userId,
    period: {
      mode: 'Monthly',
      monthYear,
      weekStart: `${monthYear}-01`,
    },
    personalTransactions,
    liveExpenses,
    categories: DEFAULT_CATEGORIES,
    groups,
    budget,
    profiles,
  };
}
