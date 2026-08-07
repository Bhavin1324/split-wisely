import { useMemo } from 'react';
import { Card, Tag } from 'antd';
import { PieChart as PieIcon } from 'lucide-react';
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
import { MOCK_EXPENSES, MOCK_CATEGORIES } from '../lib/mockData';
import { formatCents } from '../utils/currency';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';

const CHART_COLORS = [
  'var(--color-primary-500)', // emerald
  '#2563eb', // blue
  '#d97706', // amber
  '#9333ea', // purple
  '#ec4899', // pink
  '#64748b', // slate
];

export function SpendingPage() {
  const { categories: contextCategories } = useAppData();
  const { user } = useAuth();
  const { data: liveExpenses } = useAllExpenses(user?.id);

  const expenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? []);
  const categories = contextCategories?.length ? contextCategories : MOCK_CATEGORIES;

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
    const monthly: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = new Date(e.created_at);
      const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
      monthly[monthYear] = (monthly[monthYear] ?? 0) + e.total_amount / 100;
    });

    return Object.entries(monthly).map(([month, total]) => ({
      month,
      total,
    }));
  }, [expenses]);

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
                  formatter={(val: unknown) => `$${Number(val ?? 0).toFixed(2)}`}
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

        <Card title="Monthly Spending Volume" className="rounded-2xl border-gray-100 shadow-sm">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <RechartsTooltip
                  formatter={(val: unknown) => `$${Number(val ?? 0).toFixed(2)}`}
                />
                <Bar dataKey="total" fill="var(--color-primary-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
