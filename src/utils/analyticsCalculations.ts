import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import type { PersonalTransaction, Expense, Category, PersonalBudget, Group } from '../types';
import { calculateDailySafeSpend } from './personalLedgerCalculations';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export interface AnalyticsPeriod {
  mode: 'Monthly' | 'Weekly';
  monthYear: string;   // 'YYYY-MM'
  weekStart: string;   // ISO date
}

export interface DailyBucket {
  label: string;
  personalExpenseCents: number;
  groupShareCents: number;
  cumulativeCents: number;
  prevCumulativeCents: number;
}

export interface WeeklyBucket {
  label: string;
  personalExpenseCents: number;
  groupShareCents: number;
  totalCents: number;
  prevTotalCents: number;
}

export interface CategoryStat {
  name: string;
  currentCents: number;
  prevCents: number;
  deltaPercent: number | null;
  sharePercent: number;
}

export interface HybridTotals {
  personalExpenseCents: number;
  groupNetShareCents: number;
  totalTrueCostCents: number;
  totalOutlayCents: number;
  reimbursementPendingCents: number;
}

export interface BurnRate {
  elapsedDays: number;
  totalDaysInPeriod: number;
  dailyBurnCents: number;
  projectedPeriodTotalCents: number;
  budgetVarianceCents: number | null;
  status: 'on-track' | 'warning' | 'overspend' | 'no-budget';
}

export interface OutlierItem {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  source: 'PERSONAL' | 'GROUP';
  subtitle: string;
}

export interface FriendInteraction {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  totalPaidForFriend: number;
  totalPaidByFriend: number;
  netFlow: number;
  totalVolume: number;
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  prevPeriod: AnalyticsPeriod;
  hybrid: HybridTotals;
  prevHybrid: HybridTotals;
  totalDeltaPercent: number | null;
  buckets: DailyBucket[];
  weeklyBuckets: WeeklyBucket[];
  categories: CategoryStat[];
  burnRate: BurnRate;
  topOutliers: OutlierItem[];
  friendInteractions: FriendInteraction[];
  budgetAmountCents: number | null;
  safeDailySpendCents: number | null;
}

export interface CalculateAnalyticsDataProps {
  period: AnalyticsPeriod;
  liveExpenses: Expense[];
  personalTransactions: PersonalTransaction[];
  budget: PersonalBudget | null;
  categories: Category[];
  groups: Group[];
  userId: string;
  today?: dayjs.Dayjs | Date | string;
}

export function calculateAnalyticsSummary({
  period,
  liveExpenses,
  personalTransactions,
  budget,
  categories,
  groups,
  userId,
  today: rawToday,
}: CalculateAnalyticsDataProps): AnalyticsSummary {
  const today = rawToday ? dayjs(rawToday) : dayjs();

  // 1. Determine time bounds
  let currStart: dayjs.Dayjs;
  let currEnd: dayjs.Dayjs;
  let prevStart: dayjs.Dayjs;
  let prevEnd: dayjs.Dayjs;
  
  let prevPeriod: AnalyticsPeriod;

  if (period.mode === 'Monthly') {
    currStart = dayjs(`${period.monthYear}-01`).startOf('month');
    currEnd = currStart.endOf('month');
    prevStart = currStart.subtract(1, 'month').startOf('month');
    prevEnd = prevStart.endOf('month');
    
    prevPeriod = {
      mode: 'Monthly',
      monthYear: prevStart.format('YYYY-MM'),
      weekStart: period.weekStart,
    };
  } else {
    currStart = dayjs(period.weekStart).startOf('isoWeek');
    currEnd = currStart.endOf('isoWeek');
    prevStart = currStart.subtract(1, 'week').startOf('isoWeek');
    prevEnd = prevStart.endOf('isoWeek');
    
    prevPeriod = {
      mode: 'Weekly',
      monthYear: period.monthYear,
      weekStart: prevStart.toISOString(),
    };
  }

  // 2. Filter transactions and expenses
  const filterTx = (tx: PersonalTransaction, start: dayjs.Dayjs, end: dayjs.Dayjs) => {
    const d = dayjs(tx.transaction_date);
    return tx.type === 'EXPENSE' && d.isSameOrAfter(start) && d.isSameOrBefore(end);
  };

  const filterGroup = (ex: Expense, start: dayjs.Dayjs, end: dayjs.Dayjs) => {
    const d = dayjs(ex.expense_date || ex.created_at);
    return d.isSameOrAfter(start) && d.isSameOrBefore(end);
  };

  const currPersonal = personalTransactions.filter(tx => filterTx(tx, currStart, currEnd));
  const prevPersonal = personalTransactions.filter(tx => filterTx(tx, prevStart, prevEnd));
  
  const currIncome = personalTransactions
    .filter(tx => tx.type === 'INCOME' && dayjs(tx.transaction_date).isSameOrAfter(currStart) && dayjs(tx.transaction_date).isSameOrBefore(currEnd))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currGroup = liveExpenses.filter(ex => filterGroup(ex, currStart, currEnd));
  const prevGroup = liveExpenses.filter(ex => filterGroup(ex, prevStart, prevEnd));

  // 3. Calculate Hybrid Totals
  const calcHybrid = (pers: PersonalTransaction[], grp: Expense[]): HybridTotals => {
    let personalExpenseCents = 0;
    pers.forEach(t => personalExpenseCents += t.amount);

    let groupNetShareCents = 0;
    let totalOutlayCents = personalExpenseCents;

    grp.forEach(ex => {
      const userSplit = ex.splits?.find(s => s.user_id === userId);
      if (userSplit) {
        groupNetShareCents += userSplit.amount_owed;
      }
      if (ex.payer_id === userId) {
        totalOutlayCents += ex.total_amount;
      }
    });

    const totalTrueCostCents = personalExpenseCents + groupNetShareCents;
    const reimbursementPendingCents = Math.max(0, totalOutlayCents - totalTrueCostCents);

    return {
      personalExpenseCents,
      groupNetShareCents,
      totalTrueCostCents,
      totalOutlayCents,
      reimbursementPendingCents,
    };
  };

  const hybrid = calcHybrid(currPersonal, currGroup);
  const prevHybrid = calcHybrid(prevPersonal, prevGroup);

  let totalDeltaPercent: number | null = null;
  if (prevHybrid.totalTrueCostCents > 0) {
    totalDeltaPercent = Math.round(((hybrid.totalTrueCostCents - prevHybrid.totalTrueCostCents) / prevHybrid.totalTrueCostCents) * 100);
  }

  // 4. Daily Buckets (Current vs Previous)
  const buckets: DailyBucket[] = [];
  const totalDays = period.mode === 'Monthly' ? currEnd.date() : 7;
  
  let cumCurr = 0;
  let cumPrev = 0;

  for (let i = 1; i <= totalDays; i++) {
    const dCurr = currStart.add(i - 1, 'day');
    const dPrev = prevStart.add(i - 1, 'day');
    
    let dayPers = 0;
    let dayGrp = 0;
    let dayPrevPers = 0;
    let dayPrevGrp = 0;

    currPersonal.forEach(tx => { if (dayjs(tx.transaction_date).isSame(dCurr, 'day')) dayPers += tx.amount; });
    currGroup.forEach(ex => {
      if (dayjs(ex.expense_date || ex.created_at).isSame(dCurr, 'day')) {
        const split = ex.splits?.find(s => s.user_id === userId);
        if (split) dayGrp += split.amount_owed;
      }
    });

    prevPersonal.forEach(tx => { if (dayjs(tx.transaction_date).isSame(dPrev, 'day')) dayPrevPers += tx.amount; });
    prevGroup.forEach(ex => {
      if (dayjs(ex.expense_date || ex.created_at).isSame(dPrev, 'day')) {
        const split = ex.splits?.find(s => s.user_id === userId);
        if (split) dayPrevGrp += split.amount_owed;
      }
    });

    cumCurr += (dayPers + dayGrp);
    cumPrev += (dayPrevPers + dayPrevGrp);

    buckets.push({
      label: period.mode === 'Monthly' ? dCurr.format('MMM D') : dCurr.format('ddd'),
      personalExpenseCents: dayPers,
      groupShareCents: dayGrp,
      cumulativeCents: cumCurr,
      prevCumulativeCents: cumPrev,
    });
  }

  // 4b. Weekly / Bar Buckets
  const weeklyBuckets: WeeklyBucket[] = [];
  if (period.mode === 'Monthly') {
    const weekDefs = [
      { label: 'Week 1 (1–7)', startDay: 1, endDay: 7 },
      { label: 'Week 2 (8–14)', startDay: 8, endDay: 14 },
      { label: 'Week 3 (15–21)', startDay: 15, endDay: 21 },
      { label: 'Week 4 (22–28)', startDay: 22, endDay: 28 },
    ];
    if (totalDays > 28) {
      weekDefs.push({ label: `Week 5 (29–${totalDays})`, startDay: 29, endDay: totalDays });
    }

    weekDefs.forEach((w) => {
      let pers = 0;
      let grp = 0;
      let prevTotal = 0;

      for (let day = w.startDay; day <= w.endDay; day++) {
        const dCurr = currStart.add(day - 1, 'day');
        const dPrev = prevStart.add(day - 1, 'day');

        currPersonal.forEach(tx => { if (dayjs(tx.transaction_date).isSame(dCurr, 'day')) pers += tx.amount; });
        currGroup.forEach(ex => {
          if (dayjs(ex.expense_date || ex.created_at).isSame(dCurr, 'day')) {
            const split = ex.splits?.find(s => s.user_id === userId);
            if (split) grp += split.amount_owed;
          }
        });

        prevPersonal.forEach(tx => { if (dayjs(tx.transaction_date).isSame(dPrev, 'day')) prevTotal += tx.amount; });
        prevGroup.forEach(ex => {
          if (dayjs(ex.expense_date || ex.created_at).isSame(dPrev, 'day')) {
            const split = ex.splits?.find(s => s.user_id === userId);
            if (split) prevTotal += split.amount_owed;
          }
        });
      }

      weeklyBuckets.push({
        label: w.label,
        personalExpenseCents: pers,
        groupShareCents: grp,
        totalCents: pers + grp,
        prevTotalCents: prevTotal,
      });
    });
  } else {
    // In Weekly mode, each day is a bar bucket
    buckets.forEach((b) => {
      weeklyBuckets.push({
        label: b.label,
        personalExpenseCents: b.personalExpenseCents,
        groupShareCents: b.groupShareCents,
        totalCents: b.personalExpenseCents + b.groupShareCents,
        prevTotalCents: b.prevCumulativeCents,
      });
    });
  }

  // 5. Category Stats
  const catMap = new Map<string, { curr: number, prev: number }>();
  categories.forEach(c => catMap.set(c.name, { curr: 0, prev: 0 }));
  catMap.set('General', { curr: 0, prev: 0 }); // fallback

  const addToCat = (catId: string | null, amount: number, isPrev: boolean, fallbackName: string = 'General') => {
    let catName = fallbackName;
    if (catId) {
      const found = categories.find(c => c.id === catId);
      if (found) catName = found.name;
    }
    if (!catMap.has(catName)) catMap.set(catName, { curr: 0, prev: 0 });
    const stats = catMap.get(catName)!;
    if (isPrev) stats.prev += amount;
    else stats.curr += amount;
  };

  currPersonal.forEach(tx => addToCat(null, tx.amount, false, tx.category));
  prevPersonal.forEach(tx => addToCat(null, tx.amount, true, tx.category));

  currGroup.forEach(ex => {
    const split = ex.splits?.find(s => s.user_id === userId);
    if (split) addToCat(ex.category_id, split.amount_owed, false);
  });
  prevGroup.forEach(ex => {
    const split = ex.splits?.find(s => s.user_id === userId);
    if (split) addToCat(ex.category_id, split.amount_owed, true);
  });

  const categoryStats: CategoryStat[] = [];
  catMap.forEach((stats, name) => {
    if (stats.curr === 0 && stats.prev === 0) return;
    
    let deltaPercent: number | null = null;
    if (stats.prev > 0) {
      deltaPercent = Math.round(((stats.curr - stats.prev) / stats.prev) * 100);
    }
    
    const sharePercent = hybrid.totalTrueCostCents > 0 
      ? Math.round((stats.curr / hybrid.totalTrueCostCents) * 100) 
      : 0;

    categoryStats.push({
      name,
      currentCents: stats.curr,
      prevCents: stats.prev,
      deltaPercent,
      sharePercent,
    });
  });

  categoryStats.sort((a, b) => b.currentCents - a.currentCents);

  // 6. Burn Rate
  let elapsedDays = 0;
  
  if (today.isBefore(currStart)) {
    elapsedDays = 0;
  } else if (today.isAfter(currEnd)) {
    elapsedDays = totalDays;
  } else {
    elapsedDays = today.diff(currStart, 'day') + 1;
  }

  const effectiveCost = budget?.dynamic_budget_enabled 
    ? Math.max(0, hybrid.totalTrueCostCents - currIncome)
    : hybrid.totalTrueCostCents;

  const dailyBurnCents = Math.round(effectiveCost / Math.max(1, elapsedDays));
  const projectedPeriodTotalCents = dailyBurnCents * totalDays;
  
  let budgetAmountCents = null;
  let budgetVarianceCents: number | null = null;
  let status: BurnRate['status'] = 'no-budget';

  if (budget?.budget_amount != null) {
    budgetAmountCents = period.mode === 'Weekly' ? Math.round(budget.budget_amount / 4.33) : budget.budget_amount;
    budgetVarianceCents = budgetAmountCents - projectedPeriodTotalCents;
    
    if (projectedPeriodTotalCents > budgetAmountCents) {
      status = 'overspend';
    } else if (projectedPeriodTotalCents > budgetAmountCents * 0.9) {
      status = 'warning';
    } else {
      status = 'on-track';
    }
  }

  const burnRate: BurnRate = {
    elapsedDays,
    totalDaysInPeriod: totalDays,
    dailyBurnCents,
    projectedPeriodTotalCents,
    budgetVarianceCents,
    status,
  };

  // 7. Daily Safe Spend Limit
  let safeDailySpendCents: number | null = null;
  if (budgetAmountCents !== null && period.mode === 'Monthly') {
    const targetYear = parseInt(period.monthYear.split('-')[0], 10);
    const targetMonth = parseInt(period.monthYear.split('-')[1], 10);
    
    const currentYear = today.year();
    const currentMonth = today.month() + 1;
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    let daysRemaining = 0;
    if (targetYear === currentYear && targetMonth === currentMonth) {
      daysRemaining = Math.max(1, totalDaysInMonth - today.date() + 1);
    } else if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
      daysRemaining = totalDaysInMonth;
    }
    
    const remainingBudget = budgetAmountCents - effectiveCost;
    if (daysRemaining > 0) {
      safeDailySpendCents = calculateDailySafeSpend(remainingBudget, daysRemaining);
    }
  }

  // 8. Hybrid Outliers
  const outliersList: OutlierItem[] = [];
  currPersonal.forEach(tx => {
    outliersList.push({
      id: tx.id,
      description: tx.description || tx.category,
      amountCents: tx.amount,
      date: tx.transaction_date,
      source: 'PERSONAL',
      subtitle: tx.category,
    });
  });

  currGroup.forEach(ex => {
    const userSplit = ex.splits?.find(s => s.user_id === userId);
    if (userSplit && userSplit.amount_owed > 0) {
      const g = groups.find(grp => grp.id === ex.group_id);
      outliersList.push({
        id: ex.id,
        description: ex.description,
        amountCents: userSplit.amount_owed,
        date: ex.expense_date || ex.created_at,
        source: 'GROUP',
        subtitle: g ? g.name : 'Group Expense',
      });
    }
  });

  const topOutliers = outliersList.sort((a, b) => b.amountCents - a.amountCents).slice(0, 4);

  // 9. Friend Interactions
  const friendMap = new Map<string, FriendInteraction>();
  currGroup.forEach(ex => {
    const payerId = ex.payer_id;
    ex.splits?.forEach(s => {
      const oweId = s.user_id;
      const amt = s.amount_owed;
      if (amt === 0) return;
      
      if (payerId === userId && oweId !== userId) {
        // I paid for a friend
        const fId = oweId;
        if (!friendMap.has(fId)) {
          friendMap.set(fId, { friendId: fId, friendName: s.user?.full_name || 'Unknown', friendAvatar: s.user?.avatar_url || null, totalPaidForFriend: 0, totalPaidByFriend: 0, netFlow: 0, totalVolume: 0 });
        }
        friendMap.get(fId)!.totalPaidForFriend += amt;
      } else if (payerId !== userId && oweId === userId) {
        // Friend paid for me
        const fId = payerId;
        if (!friendMap.has(fId)) {
          friendMap.set(fId, { friendId: fId, friendName: ex.payer?.full_name || 'Unknown', friendAvatar: ex.payer?.avatar_url || null, totalPaidForFriend: 0, totalPaidByFriend: 0, netFlow: 0, totalVolume: 0 });
        }
        friendMap.get(fId)!.totalPaidByFriend += amt;
      }
    });
  });

  const friendInteractions = Array.from(friendMap.values()).map(f => ({
    ...f,
    netFlow: f.totalPaidForFriend - f.totalPaidByFriend,
    totalVolume: f.totalPaidForFriend + f.totalPaidByFriend
  })).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 4);

  return {
    period,
    prevPeriod,
    hybrid,
    prevHybrid,
    totalDeltaPercent,
    buckets,
    weeklyBuckets,
    categories: categoryStats,
    burnRate,
    topOutliers,
    friendInteractions,
    budgetAmountCents,
    safeDailySpendCents,
  };
}
