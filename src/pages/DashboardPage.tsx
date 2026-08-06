import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag } from 'antd';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronRight,
  Receipt,
  Utensils,
  Car,
  Smile,
  Home,
  ShoppingBag,
  TagIcon,
} from 'lucide-react';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUPS,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_GROUP_MEMBERS,
  getProfileById,
} from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import { formatDate, getMonthYearKey } from '../utils/date';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import type { Expense } from '../types';

// ---------------------------------------------------------------------------
// Category icon mapping
// ---------------------------------------------------------------------------
const CATEGORY_ICONS: Record<string, typeof Receipt> = {
  TagOutlined: TagIcon,
  CoffeeOutlined: Utensils,
  CarOutlined: Car,
  SmileOutlined: Smile,
  HomeOutlined: Home,
  ShoppingOutlined: ShoppingBag,
};

function getCategoryIcon(iconName: string | undefined) {
  if (!iconName) return Receipt;
  return CATEGORY_ICONS[iconName] ?? Receipt;
}

// ---------------------------------------------------------------------------
// Balance computation
// ---------------------------------------------------------------------------
interface UserBalances {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  /** Per-group net balance for the current user (cents) */
  groupBalances: Record<string, number>;
}

function computeUserBalances(): UserBalances {
  let totalOwed = 0;
  let totalOwing = 0;
  const groupBalances: Record<string, number> = {};

  MOCK_GROUPS.forEach((group) => {
    const groupExpenses = MOCK_EXPENSES.filter((e) => e.group_id === group.id);
    const groupSettlements = MOCK_SETTLEMENTS.filter(
      (s) => s.group_id === group.id,
    );
    const groupMembers = MOCK_GROUP_MEMBERS.filter(
      (gm) => gm.group_id === group.id,
    );

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
      groupMembers.map((m) => ({ user_id: m.user_id })),
    );

    let groupOwed = 0;
    let groupOwing = 0;

    debts.forEach((d) => {
      if (d.from === MOCK_CURRENT_USER.id) {
        totalOwing += d.amount;
        groupOwing += d.amount;
      }
      if (d.to === MOCK_CURRENT_USER.id) {
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

  const groups = new Map<string, Expense[]>();

  sorted.forEach((expense) => {
    const key = getMonthYearKey(expense.created_at);
    const existing = groups.get(key);
    if (existing) {
      existing.push(expense);
    } else {
      groups.set(key, [expense]);
    }
  });

  return Array.from(groups.entries()).map(([month, exps]) => ({
    month,
    expenses: exps,
  }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single balance summary card */
function BalanceCard({
  title,
  amount,
  icon: Icon,
  colorClass,
  bgGradient,
  subtitle,
}: {
  title: string;
  amount: number;
  icon: typeof Wallet;
  colorClass: string;
  bgGradient: string;
  subtitle: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-white/60 bg-white
        p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
      `}
    >
      {/* Decorative gradient blob */}
      <div
        className={`
          absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-2xl
          ${bgGradient}
        `}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div
            className={`
              flex h-9 w-9 items-center justify-center rounded-xl
              ${bgGradient} bg-opacity-10
            `}
          >
            <Icon className={`h-4.5 w-4.5 ${colorClass}`} strokeWidth={2} />
          </div>
        </div>

        <p className={`font-financial mt-3 text-3xl font-bold ${colorClass}`}>
          {formatCents(Math.abs(amount))}
        </p>

        <p className="mt-1.5 text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

/** Single expense item in the activity timeline */
function ActivityItem({ expense }: { expense: Expense }) {
  const navigate = useNavigate();
  const payerName =
    expense.payer?.full_name ??
    getProfileById(expense.payer_id)?.full_name ??
    'Unknown';

  const isCurrentUserPayer = expense.payer_id === MOCK_CURRENT_USER.id;
  const userSplit = (expense.splits ?? []).find(
    (s) => s.user_id === MOCK_CURRENT_USER.id,
  );

  // If the current user paid, they are owed (total - their share).
  // If someone else paid, the current user owes their share.
  let userAmount = 0;
  if (isCurrentUserPayer) {
    userAmount = expense.base_currency_amount - (userSplit?.amount_owed ?? 0);
  } else {
    userAmount = -(userSplit?.amount_owed ?? 0);
  }

  const CatIcon = getCategoryIcon(expense.category?.icon_name);

  const groupName = MOCK_GROUPS.find((g) => g.id === expense.group_id)?.name;

  return (
    <button
      type="button"
      onClick={() => {
        if (expense.group_id) navigate(`/groups/${expense.group_id}`);
      }}
      className="
        flex w-full items-center gap-4 rounded-xl bg-white/70 px-4 py-3.5
        text-left transition-all duration-200
        hover:bg-white hover:shadow-md cursor-pointer
        border border-transparent hover:border-gray-100
      "
    >
      {/* Category icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <CatIcon className="h-5 w-5" strokeWidth={1.8} />
      </div>

      {/* Description & payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          {expense.description}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span>
            {isCurrentUserPayer ? 'You' : payerName} paid{' '}
            <span className="font-financial font-medium text-gray-500">
              {formatCents(expense.base_currency_amount)}
            </span>
          </span>
          {groupName && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate">{groupName}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount & date */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span
          className={`font-financial text-sm font-bold ${
            userAmount > 0
              ? 'text-emerald-500'
              : userAmount < 0
                ? 'text-orange-500'
                : 'text-gray-400'
          }`}
        >
          {userAmount > 0 ? '+' : ''}
          {formatCents(userAmount)}
        </span>
        <span className="text-[11px] text-gray-400">
          {formatDate(expense.created_at)}
        </span>
      </div>
    </button>
  );
}

/** A group card for the groups overview */
function GroupCard({
  group,
  balance,
}: {
  group: (typeof MOCK_GROUPS)[0];
  balance: number;
}) {
  const navigate = useNavigate();
  const memberCount = group.member_count ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="
        group relative flex flex-col justify-between overflow-hidden rounded-2xl
        border border-gray-100 bg-white p-5 text-left shadow-sm
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer
      "
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-gray-800 leading-snug pr-4">
            {group.name}
          </h3>
          <ChevronRight
            className="
              h-4 w-4 flex-shrink-0 text-gray-300
              transition-transform duration-200 group-hover:translate-x-0.5
              group-hover:text-gray-500
            "
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5" />
          <span>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Balance footer */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-3">
        <span className="text-xs text-gray-400">Your balance</span>
        <div className="flex items-center gap-1">
          {balance > 0 && (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          )}
          {balance < 0 && (
            <ArrowDownLeft className="h-3.5 w-3.5 text-orange-500" />
          )}
          <span
            className={`font-financial text-sm font-bold ${getBalanceColorClass(balance)}`}
          >
            {formatCents(Math.abs(balance))}
          </span>
        </div>
      </div>

      {/* Balance accent bar at bottom */}
      <div
        className={`
          absolute bottom-0 left-0 h-1 w-full transition-opacity duration-300
          ${balance > 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : balance < 0 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gray-200'}
          opacity-60 group-hover:opacity-100
        `}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const balances = useMemo(computeUserBalances, []);
  const expensesByMonth = useMemo(
    () => groupExpensesByMonth(MOCK_EXPENSES),
    [],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Welcome back, {MOCK_CURRENT_USER.full_name}
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
              ? 'text-emerald-500'
              : 'text-orange-500'
          }
          bgGradient={
            balances.totalBalance >= 0
              ? 'bg-emerald-400'
              : 'bg-orange-400'
          }
          subtitle={
            balances.totalBalance >= 0
              ? 'You are in the green'
              : 'You owe more than you are owed'
          }
        />

        <BalanceCard
          title="You Owe"
          amount={-balances.youOwe}
          icon={TrendingDown}
          colorClass="text-orange-500"
          bgGradient="bg-orange-400"
          subtitle="Total amount you owe others"
        />

        <BalanceCard
          title="You Are Owed"
          amount={balances.youAreOwed}
          icon={TrendingUp}
          colorClass="text-emerald-500"
          bgGradient="bg-emerald-400"
          subtitle="Total amount owed to you"
        />
      </section>

      {/* ── Groups Overview ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Your Groups</h2>
          <Tag color="default" className="rounded-full text-xs">
            {MOCK_GROUPS.length} group{MOCK_GROUPS.length !== 1 ? 's' : ''}
          </Tag>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_GROUPS.map((group) => (
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
                  <ActivityItem key={expense.id} expense={expense} />
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
    </div>
  );
}
