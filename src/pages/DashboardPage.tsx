import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Segmented } from 'antd';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
} from 'lucide-react';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { useAllSettlements } from '../hooks/supabase/useSettlementsData';
import { CreateGroupModal } from '../components/CreateGroupModal';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUPS,
  MOCK_EXPENSES,
} from '../lib/mockData';
import type { Expense, SimplifiedTransaction } from '../types';
import { useDashboardData } from '../hooks/useDashboardData';

import { BalanceCard } from '../components/dashboard/BalanceCard';
import { ActivityItem } from '../components/dashboard/ActivityItem';
import { GroupCard } from '../components/dashboard/GroupCard';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';

export function DashboardPage() {
  const navigate = useNavigate();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [hideSettledGroups, setHideSettledGroups] = useState(true);

  const { user } = useAuth();
  const { currentUser, groups: contextGroups, loading: appLoading } = useAppData();
  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(user?.id);
  const { data: liveSettlements, loading: settlementsLoading } = useAllSettlements(user?.id);

  const userId = user?.id || currentUser?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : '');
  const displayName = currentUser?.full_name || user?.user_metadata?.full_name || (DEMO_MODE ? MOCK_CURRENT_USER.full_name : 'User');
  const groups = DEMO_MODE ? MOCK_GROUPS : contextGroups;
  const allExpenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses || []);

  const { balances, expensesByMonth } = useDashboardData(userId, groups, allExpenses, liveSettlements || []);
  const displayedGroups = groups.filter((g) => {
    if (!hideSettledGroups) return true;
    const bal = balances.groupBalances[g.id] ?? 0;
    const debts = balances.groupDebtsMap?.[g.id] ?? [];
    const myDebts = debts.filter((d: SimplifiedTransaction) => d.from === userId || d.to === userId);
    return bal !== 0 || myDebts.length > 0;
  });

  if (appLoading || expensesLoading || settlementsLoading) {
    return <PageSkeleton layout="dashboard" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 pb-32 md:pb-8">
      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Welcome back, {displayName}
        </p>
      </div>

      {/* ── Balance Summary Cards ────────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <BalanceCard
          title="Total Balance"
          amount={balances.totalBalance}
          icon={Wallet}
          colorClass={
            balances.totalBalance >= 0
              ? 'text-success-text'
              : 'text-error-text'
          }
          bgGradient={
            balances.totalBalance >= 0
              ? 'bg-success-bg'
              : 'bg-error-bg'
          }
          iconBgClass={
            balances.totalBalance >= 0
              ? 'bg-success-bg'
              : 'bg-error-bg'
          }
          subtitle={
            balances.totalBalance >= 0
              ? 'You are in the green'
              : 'Net amount you owe across all groups'
          }
          onClick={() => navigate('/spending')}
        />

        <BalanceCard
          title="You have to pay"
          amount={-balances.youOwe}
          icon={TrendingDown}
          colorClass="text-error-text"
          bgGradient="bg-error-bg"
          iconBgClass="bg-error-bg"
          subtitle="Total amount you have to pay others"
          onClick={() => navigate('/friends?filter=you_owe')}
        />

        <BalanceCard
          title="You will receive"
          amount={balances.youAreOwed}
          icon={TrendingUp}
          colorClass="text-success-text"
          bgGradient="bg-emerald-400"
          iconBgClass="bg-success-bg"
          subtitle="Total amount owed to you"
          onClick={() => navigate('/friends?filter=owes_you')}
        />
      </section>

      {/* ── Groups Overview ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-base mb-0">Your Groups</h2>
            <Tag className="rounded-full">
              {displayedGroups.length} of {groups.length}
            </Tag>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Segmented
              options={[
                { label: 'Hide Settled', value: true },
                { label: 'Show All', value: false },
              ]}
              value={hideSettledGroups}
              onChange={(val) => setHideSettledGroups(val as boolean)}
              className="bg-bg-subtle p-1 self-start rounded-xl border border-border-base"
            />
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 active:bg-primary-500/25 border border-primary-500/30 hover:border-primary-500/50 rounded-xl transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-primary-500/40 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-primary-400 transition-transform duration-150 group-hover:scale-110" />
              <span>Create Group</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              balance={balances.groupBalances[group.id] ?? 0}
              userId={userId}
              groupDebts={balances.groupDebtsMap?.[group.id]}
            />
          ))}
        </div>
      </section>

      {/* ── Recent Activity Timeline ─────────────────────────── */}
      <section>
        <h2 className="mb-5 text-lg font-bold text-text-base">
          Recent Activity
        </h2>

        <div className="space-y-8">
          {expensesByMonth.map(({ month, expenses }) => (
            <div key={month}>
              {/* Month header */}
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {month}
                </h3>
                <div className="h-px flex-1 bg-bg-subtle" />
                <span className="font-financial text-[11px] text-text-muted">
                  {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Expense items */}
              <div className="space-y-1.5">
                {expenses.map((expense) => (
                  <ActivityItem
                    key={expense.id}
                    expense={expense}
                    userId={userId}
                    groups={groups}
                    onClick={(e) => setSelectedExpense(e)}
                  />
                ))}
              </div>
            </div>
          ))}

          {expensesByMonth.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-base py-16 text-center">
              <Receipt className="mx-auto h-10 w-10 text-text-muted" />
              <p className="mt-3 text-sm text-text-muted">No recent activity</p>
            </div>
          )}
        </div>
      </section>

      <CreateGroupModal
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(undefined);
        }}
        existingExpense={expenseToEdit}
      />

      <ExpenseStatementModal
        open={!!selectedExpense}
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={(expense) => {
          setExpenseToEdit(expense);
          setIsAddExpenseOpen(true);
        }}
      />
    </div>
  );
}
