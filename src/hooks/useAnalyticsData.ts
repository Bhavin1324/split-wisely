import { useMemo } from 'react';
import type { PersonalTransaction, Expense, Category, PersonalBudget, Group } from '../types';
import {
  calculateAnalyticsSummary,
  type AnalyticsPeriod,
  type DailyBucket,
  type CategoryStat,
  type HybridTotals,
  type BurnRate,
  type OutlierItem,
  type FriendInteraction,
  type AnalyticsSummary,
  type CalculateAnalyticsDataProps,
} from '../utils/analyticsCalculations';

export type {
  AnalyticsPeriod,
  DailyBucket,
  CategoryStat,
  HybridTotals,
  BurnRate,
  OutlierItem,
  FriendInteraction,
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
