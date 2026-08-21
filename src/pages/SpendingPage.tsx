import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { usePersonalLedger } from '../hooks/usePersonalLedger';
import { useAnalyticsData, type AnalyticsPeriod } from '../hooks/useAnalyticsData';
import { buildExportRows } from '../utils/reportExporter';
import { PageSkeleton } from '../components/ui/PageSkeleton';

import { AnalyticsHeaderToolbar } from '../components/analytics/AnalyticsHeaderToolbar';
import { AnalyticsHeroKPIs } from '../components/analytics/AnalyticsHeroKPIs';
import { SpendingVelocityChart } from '../components/analytics/SpendingVelocityChart';
import { CategoryInsightsList } from '../components/analytics/CategoryInsightsList';
import { HybridSplitRatioCard } from '../components/analytics/HybridSplitRatioCard';
import { FriendDynamicsCard } from '../components/analytics/FriendDynamicsCard';
import { ExportReportModal } from '../components/analytics/ExportReportModal';
import { AnalyticsGuideModal } from '../components/analytics/AnalyticsGuideModal';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_CATEGORIES } from '../lib/mockData';

dayjs.extend(isoWeek);

export function SpendingPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>({
    mode: 'Monthly',
    monthYear: dayjs().format('YYYY-MM'),
    weekStart: dayjs().startOf('isoWeek').toISOString(),
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const { user } = useAuth();
  const { categories: contextCategories, loading: appLoading, groups } = useAppData();
  
  const userId = user?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(userId);
  const { transactions: personalTransactions, budget, loading: ledgerLoading } = usePersonalLedger(period.monthYear);

  const expenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? []);
  const categories = contextCategories?.length ? contextCategories : (DEMO_MODE ? MOCK_CATEGORIES : []);

  // Compute analytics
  const analytics = useAnalyticsData({
    period,
    liveExpenses: expenses,
    personalTransactions,
    budget,
    categories,
    groups,
    userId,
  });

  // Prepare export data
  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach((g) => { map[g.id] = g.name; });
    return map;
  }, [groups]);

  const exportRows = useMemo(() => {
    if (!isExportOpen) return [];
    return buildExportRows(personalTransactions, expenses, userId, groupNameMap);
  }, [isExportOpen, personalTransactions, expenses, userId, groupNameMap]);

  let periodLabel = '';
  if (period.mode === 'Monthly') {
    periodLabel = dayjs(`${period.monthYear}-01`).format('MMMM YYYY');
  } else {
    const start = dayjs(period.weekStart);
    const end = start.endOf('isoWeek');
    periodLabel = `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
  }

  if (appLoading || expensesLoading || ledgerLoading) {
    return <PageSkeleton layout="analytics" />;
  }

  return (
    <div className="space-y-6 pb-32 md:pb-6 max-w-5xl mx-auto">
      <AnalyticsHeaderToolbar 
        period={period} 
        onChangePeriod={setPeriod} 
        onOpenExport={() => setIsExportOpen(true)} 
        onOpenGuide={() => setIsGuideOpen(true)}
      />
      
      <AnalyticsHeroKPIs summary={analytics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryInsightsList 
          categories={analytics.categories} 
          topOutliers={analytics.topOutliers} 
        />
        <div className="space-y-6 flex flex-col gap-4">
          <SpendingVelocityChart 
            buckets={analytics.buckets} 
            weeklyBuckets={analytics.weeklyBuckets} 
          />
          <HybridSplitRatioCard hybrid={analytics.hybrid} />
          <FriendDynamicsCard interactions={analytics.friendInteractions} />
        </div>
      </div>

      <ExportReportModal 
        open={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        rows={exportRows} 
        periodLabel={periodLabel} 
      />

      <AnalyticsGuideModal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        summary={analytics}
        periodLabel={periodLabel}
      />
    </div>
  );
}
