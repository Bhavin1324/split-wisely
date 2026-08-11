import { useState } from 'react';
import { Card, Tag, Segmented, Avatar } from 'antd';
import { PieChart as PieIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { MOCK_EXPENSES, MOCK_CATEGORIES, MOCK_CURRENT_USER } from '../lib/mockData';
import { formatCents, getCurrencySymbol } from '../utils/currency';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { useSpendingAnalytics } from '../hooks/useSpendingAnalytics';
import { PageSkeleton } from '../components/ui/PageSkeleton';

const CHART_COLORS = [
  'var(--color-primary-500)', // emerald
  '#2563eb', // blue
  '#d97706', // amber
  '#9333ea', // purple
  '#ec4899', // pink
  '#64748b', // slate
];

export function SpendingPage() {
  const [timeframe, setTimeframe] = useState<'Monthly' | 'Weekly'>('Monthly');
  const { categories: contextCategories, loading: appLoading } = useAppData();
  const { user } = useAuth();
  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(user?.id);

  const expenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? []);
  const categories = contextCategories?.length ? contextCategories : MOCK_CATEGORIES;

  const userId = user?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : '');
  const {
    categoryData,
    totalSpentCents,
    topCategory,
    monthlyData,
    friendAnalysis
  } = useSpendingAnalytics(expenses, categories, timeframe, userId);

  if (appLoading || expensesLoading) {
    return <PageSkeleton layout="analytics" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2">
          <PieIcon className="h-6 w-6 text-primary-500" />
          Pro Spending Analytics
        </h1>
        <p className="text-sm text-gray-500">
          Visualize your expense distribution across categories and monthly trends.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Tracked Expenses</div>
          <div className="text-2xl font-bold font-financial text-gray-900 mt-2">
            {formatCents(totalSpentCents)}
          </div>
          <Tag color="green" className="mt-2 rounded-full">
            All Groups Combined
          </Tag>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Top Spending Category</div>
          <div className="text-2xl font-bold font-financial text-primary-600 mt-2">
            {topCategory.name}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatCents(topCategory.amountCents)} total
          </div>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Average Expense</div>
          <div className="text-2xl font-bold font-financial text-blue-600 mt-2">
            {expenses.length > 0
              ? formatCents(Math.round(totalSpentCents / expenses.length))
              : '$0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Across {expenses.length} recorded items
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Expense Distribution by Category" className="rounded-2xl border-gray-100 shadow-sm">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(val: unknown) => `${getCurrencySymbol()}${Number(val ?? 0).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3">
            {categoryData.map((cat, i) => (
               <div key={cat.name} className="flex items-center gap-2 text-xs">
                 <span
                   className="w-3 h-3 rounded-full shrink-0"
                   style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                 />
                 <span className="truncate text-gray-600">{cat.name}</span>
                 <span className="ml-auto font-semibold font-financial">{formatCents(cat.amountCents)}</span>
               </div>
            ))}
          </div>
        </Card>

        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>Spending Volume</span>
              <Segmented 
                options={['Monthly', 'Weekly']} 
                value={timeframe} 
                onChange={(v) => setTimeframe(v as 'Monthly' | 'Weekly')} 
                size="small"
              />
            </div>
          } 
          className="rounded-2xl border-gray-100 shadow-sm"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <RechartsTooltip
                  formatter={(val: unknown) => `${getCurrencySymbol()}${Number(val ?? 0).toFixed(2)}`}
                />
                <Bar dataKey="total" fill="var(--color-primary-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Friends Analysis Section */}
      <Card title="Friends Analysis (Top Interactions)" className="rounded-2xl border-gray-100 shadow-sm">
        <div className="space-y-4">
          {friendAnalysis.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No friend interactions yet.</div>
          ) : (
            friendAnalysis.map((friend, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-3">
                <div className="flex items-center gap-3">
                  <Avatar style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                    {friend.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <span className="font-semibold text-gray-800 break-words">{friend.name}</span>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1.5 ml-11 sm:ml-0">
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <ArrowRight className="h-4 w-4" /> You paid {formatCents(friend.youPaid)}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-rose-500 font-medium">
                    <ArrowLeft className="h-4 w-4" /> They paid {formatCents(friend.theyPaid)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
