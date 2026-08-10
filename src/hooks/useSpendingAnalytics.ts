import { useMemo } from 'react';
import { MOCK_PROFILES } from '../lib/mockData';
import { DEMO_MODE } from '../context/AppDataContext';

export function useSpendingAnalytics(
  expenses: any[],
  categories: any[],
  timeframe: 'Monthly' | 'Weekly',
  userId: string
) {
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = categories.find((c) => c.id === e.category_id);
      const name = cat?.name ?? 'General';
      totals[name] = (totals[name] ?? 0) + e.total_amount;
    });

    return Object.entries(totals).map(([name, amountCents]) => ({
      name,
      value: amountCents / 100,
      amountCents,
    }));
  }, [expenses, categories]);

  const totalSpentCents = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.total_amount, 0);
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return { name: 'None', amountCents: 0 };
    return [...categoryData].sort((a, b) => b.amountCents - a.amountCents)[0];
  }, [categoryData]);

  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = new Date(e.created_at);
      if (timeframe === 'Monthly') {
        const key = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
        data[key] = (data[key] ?? 0) + e.total_amount / 100;
      } else {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        const key = `Wk ${week} '${date.getFullYear().toString().slice(2)}`;
        data[key] = (data[key] ?? 0) + e.total_amount / 100;
      }
    });

    return Object.entries(data).map(([label, total]) => ({
      label,
      total,
    }));
  }, [expenses, timeframe]);

  const friendAnalysis = useMemo(() => {
    const friendsStats: Record<string, { name: string; youPaid: number; theyPaid: number }> = {};
    
    expenses.forEach((e) => {
      if (!e.splits || e.splits.length === 0) return;
      const isUserPayer = e.payer_id === userId;
      
      e.splits.forEach((split: any) => {
        if (split.user_id === userId && !isUserPayer) {
          const friendId = e.payer_id;
          const friendName = DEMO_MODE ? (MOCK_PROFILES.find(p=>p.id===friendId)?.full_name || friendId) : (e.payer?.full_name || friendId);
          if (!friendsStats[friendId]) friendsStats[friendId] = { name: friendName, youPaid: 0, theyPaid: 0 };
          friendsStats[friendId].theyPaid += split.amount_owed;
        } else if (isUserPayer && split.user_id !== userId) {
          const friendId = split.user_id;
          const friendName = DEMO_MODE ? (MOCK_PROFILES.find(p=>p.id===friendId)?.full_name || friendId) : (split.user?.full_name || friendId);
          if (!friendsStats[friendId]) friendsStats[friendId] = { name: friendName, youPaid: 0, theyPaid: 0 };
          friendsStats[friendId].youPaid += split.amount_owed;
        }
      });
    });

    return Object.values(friendsStats).sort((a, b) => (b.youPaid + b.theyPaid) - (a.youPaid + a.theyPaid)).slice(0, 5);
  }, [expenses, userId]);

  return {
    categoryData,
    totalSpentCents,
    topCategory,
    monthlyData,
    friendAnalysis
  };
}
