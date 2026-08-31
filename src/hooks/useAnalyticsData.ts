import { useMemo } from 'react';
import type { PersonalTransaction, Expense, Category, PersonalBudget, Group } from '../types';
import {
  calculateAnalyticsSummary,
  type AnalyticsPeriod,
  type DailyBucket,
  type WeeklyBucket,
  type CategoryStat,
  type HybridTotals,
  type BurnRate,
  type OutlierItem,
  type FriendInteraction,
  type GroupSpendingBreakdown,
  type PersonalCategoryBreakdown,
  type PersonalPaymentMethodBreakdown,
  type PersonalSpendingBreakdown,
  type AnalyticsSummary,
  type CalculateAnalyticsDataProps,
} from '../utils/analyticsCalculations';

export type {
  AnalyticsPeriod,
  DailyBucket,
  WeeklyBucket,
  CategoryStat,
  HybridTotals,
  BurnRate,
  OutlierItem,
  FriendInteraction,
  GroupSpendingBreakdown,
  PersonalCategoryBreakdown,
  PersonalPaymentMethodBreakdown,
  PersonalSpendingBreakdown,
  AnalyticsSummary,
  CalculateAnalyticsDataProps,
};

interface UseAnalyticsDataProps {
  period: AnalyticsPeriod;
  liveExpenses: Expense[];
  personalTransactions: PersonalTransaction[];
  budget: PersonalBudget | null;
  categories: Category[];
  groups: Group[];
  userId: string;
}

export function useAnalyticsData({
  period,
  liveExpenses,
  personalTransactions,
  budget,
  categories,
  groups,
  userId,
}: UseAnalyticsDataProps): AnalyticsSummary {
  return useMemo(() => {
    return calculateAnalyticsSummary({
      period,
      liveExpenses,
      personalTransactions,
      budget,
      categories,
      groups,
      userId,
    });
  }, [period, liveExpenses, personalTransactions, budget, categories, groups, userId]);
}
