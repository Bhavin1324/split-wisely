import { useState, useMemo } from 'react';
import { Tag } from 'antd';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { CreateGroupModal } from '../components/CreateGroupModal';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUPS,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_GROUP_MEMBERS,
} from '../lib/mockData';
import { getMonthYearKey } from '../utils/date';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import type { Expense, Group } from '../types';

import { BalanceCard } from '../components/dashboard/BalanceCard';
import { ActivityItem } from '../components/dashboard/ActivityItem';
import { GroupCard } from '../components/dashboard/GroupCard';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddExpenseModal } from '../components/AddExpenseModal';

// ---------------------------------------------------------------------------
// Balance computation (now parameterised for both modes)
// ---------------------------------------------------------------------------
interface UserBalances {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  /** Per-group net balance for the current user (cents) */
  groupBalances: Record<string, number>;
}

function computeUserBalances(
  userId: string,
  groups: Group[],
  allExpenses: Expense[],
): UserBalances {
  let totalOwed = 0;
  let totalOwing = 0;
  const groupBalances: Record<string, number> = {};

  // In live mode we may not have group_members/settlements loaded globally,
  // so we compute balance per-group from the expenses that belong to each group.
  const settlements = DEMO_MODE ? MOCK_SETTLEMENTS : [];
  const groupMembers = DEMO_MODE ? MOCK_GROUP_MEMBERS : [];

  groups.forEach((group) => {
    const groupExpenses = allExpenses.filter((e) => e.group_id === group.id);
    const groupSettlements = settlements.filter(
      (s) => s.group_id === group.id,
    );
    const members = DEMO_MODE
      ? groupMembers.filter((gm) => gm.group_id === group.id)
      : [];

    // Collect unique user ids from expenses when not in demo mode
    const memberIds = DEMO_MODE
      ? members.map((m) => ({ user_id: m.user_id }))
      : Array.from(
          new Set(
            groupExpenses.flatMap((e) => [
              e.payer_id,
              ...(e.splits ?? []).map((s) => s.user_id),
            ]),
          ),
        ).map((id) => ({ user_id: id }));

    const debts = DebtSimplifier.simplifyDebts(
      groupExpenses.map((e) => ({
        payer_id: e.payer_id,
        base_currency_amount: e.base_currency_amount,
        splits: (e.splits ?? []).map((s) => ({
          user_id: s.user_id,
          amount_owed: s.amount_owed,
        })),
      })),
      groupSettlements.map((s) => ({
        payer_id: s.payer_id,
        payee_id: s.payee_id,
        amount: s.amount,
      })),
      memberIds,
    );

    let groupOwed = 0;
    let groupOwing = 0;

    debts.forEach((d) => {
      if (d.from === userId) {
        totalOwing += d.amount;
        groupOwing += d.amount;
      }
      if (d.to === userId) {
        totalOwed += d.amount;
        groupOwed += d.amount;
      }
    });

    groupBalances[group.id] = groupOwed - groupOwing;
  });

  return {
    totalBalance: totalOwed - totalOwing,
    youOwe: totalOwing,
    youAreOwed: totalOwed,
    groupBalances,
  };
}

// ---------------------------------------------------------------------------
// Group expenses by month for timeline
// ---------------------------------------------------------------------------
function groupExpensesByMonth(
  expenses: Expense[],
): { month: string; expenses: Expense[] }[] {
  const sorted = [...expenses].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const monthMap = new Map<string, Expense[]>();

  sorted.forEach((expense) => {
    const key = getMonthYearKey(expense.created_at);
    const existing = monthMap.get(key);
    if (existing) {
      existing.push(expense);
    } else {
      monthMap.set(key, [expense]);
    }
  });

  return Array.from(monthMap.entries()).map(([month, exps]) => ({
    month,
    expenses: exps,
  }));
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const { user } = useAuth();
  const { currentUser, groups: contextGroups } = useAppData();
  const { data: liveExpenses } = useAllExpenses(user?.id);

  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');
  const displayName = currentUser?.full_name ?? (DEMO_MODE ? MOCK_CURRENT_USER.full_name : 'User');
  const groups = DEMO_MODE ? MOCK_GROUPS : contextGroups;
  const allExpenses = DEMO_MODE ? MOCK_EXPENSES : liveExpenses;

  const balances = useMemo(
    () => computeUserBalances(userId, groups, allExpenses),
    [userId, groups, allExpenses],
  );
  const expensesByMonth = useMemo(
    () => groupExpensesByMonth(allExpenses),
    [allExpenses],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-400">
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
              ? 'text-emerald-600'
              : 'text-rose-600'
          }
          bgGradient={
            balances.totalBalance >= 0
              ? 'bg-emerald-400'
              : 'bg-rose-400'
          }
          iconBgClass={
            balances.totalBalance >= 0
              ? 'bg-emerald-100'
              : 'bg-rose-100'
          }
          subtitle={
            balances.totalBalance >= 0
              ? 'You are in the green'
              : 'You have to pay more than You will receive'
          }
        />

        <BalanceCard
          title="You have to pay"
          amount={-balances.youOwe}
          icon={TrendingDown}
          colorClass="text-rose-600"
          bgGradient="bg-rose-400"
          iconBgClass="bg-rose-100"
          subtitle="Total amount You have to pay others"
        />

        <BalanceCard
          title="You will receive"
          amount={balances.youAreOwed}
          icon={TrendingUp}
          colorClass="text-emerald-600"
          bgGradient="bg-emerald-400"
          iconBgClass="bg-emerald-100"
          subtitle="Total amount owed to you"
        />
      </section>

      {/* ── Groups Overview ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Your Groups</h2>
          <div className="flex items-center gap-3">
            <Tag color="default" className="rounded-full text-xs">
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </Tag>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200 transition-colors"
            >
              + Create Group
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              balance={balances.groupBalances[group.id] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* ── Recent Activity Timeline ─────────────────────────── */}
      <section>
        <h2 className="mb-5 text-lg font-bold text-gray-800">
          Recent Activity
        </h2>

        <div className="space-y-8">
          {expensesByMonth.map(({ month, expenses }) => (
            <div key={month}>
              {/* Month header */}
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {month}
                </h3>
                <div className="h-px flex-1 bg-gray-100" />
                <span className="font-financial text-[11px] text-gray-300">
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
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <Receipt className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">No recent activity</p>
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
