import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { useAllSettlements } from '../hooks/supabase/useSettlementsData';
import { useFriends } from '../hooks/supabase/useProfileData';
import { CreateGroupModal } from '../components/CreateGroupModal';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUPS,
  MOCK_EXPENSES,
  getFriendsForUser,
} from '../lib/mockData';
import type { Expense, Settlement, SimplifiedTransaction } from '../types';
import { useDashboardData } from '../hooks/useDashboardData';

import { DashboardHeroCard } from '../components/dashboard/DashboardHeroCard';
import { DashboardGroupsSection } from '../components/dashboard/DashboardGroupsSection';
import { DashboardActivitySection } from '../components/dashboard/DashboardActivitySection';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { StagedTransactionsBanner } from '../components/expenses/StagedTransactionsBanner';
import { useStagedExpenses } from '../hooks/useStagedExpenses';
import type { StagedExpense } from '../types/stagedExpense';

const EMPTY_SETTLEMENTS: Settlement[] = [];
const EMPTY_EXPENSES: Expense[] = [];
const ACTIVITY_DISPLAY_LIMIT = 20;

export function DashboardPage() {
  const navigate = useNavigate();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [stagedToSplit, setStagedToSplit] = useState<StagedExpense | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [hideSettledGroups, setHideSettledGroups] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  const { user } = useAuth();
  const { currentUser, groups: contextGroups, loading: appLoading } = useAppData();

  const userId = user?.id || currentUser?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : '');
  const displayName = currentUser?.full_name || user?.user_metadata?.full_name || (DEMO_MODE ? MOCK_CURRENT_USER.full_name : 'User');
  const avatarUrl = currentUser?.avatar_url || user?.user_metadata?.avatar_url || (DEMO_MODE ? MOCK_CURRENT_USER.avatar_url : null);
  const groups = DEMO_MODE ? MOCK_GROUPS : contextGroups;

  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(userId);
  const { data: liveSettlements, loading: settlementsLoading } = useAllSettlements(userId);
  const { data: liveFriends } = useFriends(userId);

  const allExpenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? EMPTY_EXPENSES);
  const settlements = liveSettlements ?? EMPTY_SETTLEMENTS;
  const friends = DEMO_MODE ? getFriendsForUser(MOCK_CURRENT_USER.id) : (liveFriends || []);

  const {
    pendingExpenses,
    approveAsPersonal,
    dismissStaged,
    markAsGroupSplit,
  } = useStagedExpenses(userId);

  const { balances, expensesByMonth } = useDashboardData(userId, groups, allExpenses, settlements);

  const activeGroupsCount = useMemo(() => {
    return groups.filter((g) => {
      const bal = balances.groupBalances[g.id] ?? 0;
      const debts = balances.groupDebtsMap?.[g.id] ?? [];
      const myDebts = debts.filter((d: SimplifiedTransaction) => d.from === userId || d.to === userId);
      return bal !== 0 || myDebts.length > 0;
    }).length;
  }, [groups, balances, userId]);

  const displayedGroups = useMemo(() => {
    if (!hideSettledGroups) return groups;
    return groups.filter((g) => {
      const bal = balances.groupBalances[g.id] ?? 0;
      const debts = balances.groupDebtsMap?.[g.id] ?? [];
      const myDebts = debts.filter((d: SimplifiedTransaction) => d.from === userId || d.to === userId);
      return bal !== 0 || myDebts.length > 0;
    });
  }, [groups, hideSettledGroups, balances, userId]);

  const memberMap = useMemo<Map<string, { full_name: string; avatar_url?: string | null }>>(() => {
    const map = new Map<string, { full_name: string; avatar_url?: string | null }>();

    if (currentUser?.id) {
      map.set(currentUser.id, { full_name: currentUser.full_name || 'You', avatar_url: currentUser.avatar_url });
    }
    for (const f of friends) {
      if (f.id) map.set(f.id, { full_name: f.full_name, avatar_url: f.avatar_url });
    }
    for (const expense of allExpenses) {
      if (expense.payer?.id && expense.payer?.full_name) {
        map.set(expense.payer.id, { full_name: expense.payer.full_name, avatar_url: expense.payer.avatar_url });
      }
      for (const split of expense.splits ?? []) {
        if (split.user?.id && split.user?.full_name) {
          map.set(split.user.id, { full_name: split.user.full_name, avatar_url: split.user.avatar_url });
        }
      }
    }
    for (const g of groups) {
      for (const m of g.members_preview ?? []) {
        if (m.id && m.full_name) map.set(m.id, { full_name: m.full_name, avatar_url: m.avatar_url });
      }
    }

    return map;
  }, [currentUser, friends, allExpenses, groups]);

  const groupNameMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      map.set(g.id, g.name);
    }
    return map;
  }, [groups]);

  const recentActivity = useMemo(() => {
    let count = 0;
    const result: typeof expensesByMonth = [];
    for (const monthGroup of expensesByMonth) {
      if (count >= ACTIVITY_DISPLAY_LIMIT) break;
      const remaining = ACTIVITY_DISPLAY_LIMIT - count;
      result.push({
        month: monthGroup.month,
        expenses: monthGroup.expenses.slice(0, remaining),
      });
      count += Math.min(monthGroup.expenses.length, remaining);
    }
    return result;
  }, [expensesByMonth]);

  const handleNavigateSpending = useCallback(() => navigate('/spending'), [navigate]);
  const handleNavigateYouOwe = useCallback(() => navigate('/friends?filter=you_owe'), [navigate]);
  const handleNavigateYouAreOwed = useCallback(() => navigate('/friends?filter=owes_you'), [navigate]);
  const handleOpenAddExpense = useCallback(() => {
    setExpenseToEdit(undefined);
    setStagedToSplit(null);
    setIsAddExpenseOpen(true);
  }, []);
  const handleOpenCreateGroup = useCallback(() => setIsCreateGroupOpen(true), []);
  const handleSelectExpense = useCallback((e: Expense) => setSelectedExpense(e), []);

  if (appLoading || expensesLoading || settlementsLoading) {
    return <PageSkeleton layout="dashboard" />;
  }

  const initials = displayName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-32 md:pb-8">
      {/* ── Page Header: Greeting & Active Groups Status ──────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-xs shrink-0 select-none">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-text-inverse font-black text-sm sm:text-base flex items-center justify-center">
                {initials}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Welcome back</div>
            <h1 className="text-base sm:text-lg font-bold text-text-base leading-tight">
              {displayName}
            </h1>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
          <span className="w-2 h-2 rounded-full bg-success-text animate-pulse"></span>
          {activeGroupsCount} Active {activeGroupsCount === 1 ? 'Group' : 'Groups'}
        </span>
      </div>

      {/* ── Revolut Ultra Hero Card (Always first to prevent CLS) ── */}
      <DashboardHeroCard
        totalBalance={balances.totalBalance}
        youOwe={balances.youOwe}
        youAreOwed={balances.youAreOwed}
        onNavigateSpending={handleNavigateSpending}
        onNavigateYouOwe={handleNavigateYouOwe}
        onNavigateYouAreOwed={handleNavigateYouAreOwed}
        onOpenAddExpense={handleOpenAddExpense}
        onOpenCreateGroup={handleOpenCreateGroup}
      />

      {/* ── Auto-Synced SMS Transactions Banner (Below Hero to prevent CLS) ── */}
      {pendingExpenses.length > 0 && (
        <StagedTransactionsBanner
          pendingExpenses={pendingExpenses}
          onApprovePersonal={(staged, customData) =>
            approveAsPersonal(staged, customData)
          }
          onDismiss={dismissStaged}
          onSplitInGroup={(staged, customData) => {
            setExpenseToEdit(undefined);
            setStagedToSplit({
              ...staged,
              merchant_name:
                customData?.description?.trim() || staged.merchant_name,
            });
            setIsAddExpenseOpen(true);
          }}
        />
      )}

      {/* ── Groups Overview ──────────────────────────────────── */}
      <DashboardGroupsSection
        groups={groups}
        displayedGroups={displayedGroups}
        hideSettledGroups={hideSettledGroups}
        onToggleHideSettled={setHideSettledGroups}
        onOpenCreateGroup={handleOpenCreateGroup}
        balances={balances}
        userId={userId}
        memberMap={memberMap}
      />

      {/* ── Recent Activity Timeline ─────────────────────────── */}
      <DashboardActivitySection
        recentActivity={recentActivity}
        userId={userId}
        groupNameMap={groupNameMap}
        onSelectExpense={handleSelectExpense}
        onNavigateSpending={handleNavigateSpending}
      />

      <CreateGroupModal
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />

      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(undefined);
          setStagedToSplit(null);
        }}
        existingExpense={expenseToEdit}
        initialValues={
          stagedToSplit
            ? {
                amount: stagedToSplit.amount_cents / 100,
                description: stagedToSplit.merchant_name,
              }
            : undefined
        }
        onSuccess={async () => {
          if (stagedToSplit) {
            await markAsGroupSplit(stagedToSplit.id);
            setStagedToSplit(null);
          }
        }}
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
