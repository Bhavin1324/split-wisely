import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Button, Card, Empty, Tag, App } from "antd";
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
  Bell,
  DollarSign,
  Handshake,
} from "lucide-react";
import {
  MOCK_CURRENT_USER,
  MOCK_PROFILES,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_GROUPS,
  MOCK_GROUP_MEMBERS,
} from "../lib/mockData";
import { formatCents } from "../utils/currency";
import { formatDate } from "../utils/date";
import { SettleUpModal } from "../components/SettleUpModal";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { ExpenseStatementModal } from "../components/ExpenseStatementModal";
import { getCategoryIcon } from "../utils/icons";
import { useAppData, DEMO_MODE } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../hooks/supabase/useProfileData";
import { useAllExpenses } from "../hooks/supabase/useExpensesData";
import { useAllSettlements } from "../hooks/supabase/useSettlementsData";
import { PageSkeleton } from "../components/ui/PageSkeleton";
import { computeFriendNetBalance } from "../utils/friendCalculations";
import { supabase } from "../lib/supabase";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { currentUser, groups: contextGroups, loading: appLoading } = useAppData();
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : "");

  const { data: liveFriends, loading: friendsLoading } = useFriends(user?.id);
  const { data: liveExpenses, loading: expensesLoading, refetch: refetchExpenses } = useAllExpenses(user?.id);
  const { data: liveSettlements, refetch: refetchSettlements } = useAllSettlements(user?.id);

  const handleRefetchAll = useCallback(async () => {
    await Promise.all([refetchExpenses(), refetchSettlements()]);
  }, [refetchExpenses, refetchSettlements]);

  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(undefined);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [reminderCooldown, setReminderCooldown] = useState<number>(0);

  useEffect(() => {
    if (reminderCooldown <= 0) return;
    const timer = setInterval(() => {
      setReminderCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [reminderCooldown]);

  const friend = useMemo(() => {
    if (!friendId) return undefined;
    if (DEMO_MODE) return MOCK_PROFILES.find((p) => p.id === friendId);
    return liveFriends?.find((p) => p.id === friendId);
  }, [friendId, liveFriends]);

  // Unified 1-on-1 balance calculation engine
  const friendBalanceResult = useMemo(() => {
    if (!friendId)
      return { totalNetBalance: 0, groupBreakdown: [], nonGroupBalance: 0 };
    return computeFriendNetBalance({
      userId,
      friendId,
      groups: DEMO_MODE ? MOCK_GROUPS : contextGroups || [],
      allExpenses: DEMO_MODE ? (MOCK_EXPENSES as any) : liveExpenses || [],
      allSettlements: DEMO_MODE
        ? (MOCK_SETTLEMENTS as any)
        : liveSettlements || [],
      allGroupMembers: DEMO_MODE ? (MOCK_GROUP_MEMBERS as any) : [],
    });
  }, [friendId, userId, contextGroups, liveExpenses, liveSettlements]);

  const netBalanceCents = friendBalanceResult.totalNetBalance;

  // Unified list of expenses and settlements involving both current user and this friend
  const sharedTransactions = useMemo(() => {
    if (!friendId) return { merged: [], groupsList: [] };
    const expenses = DEMO_MODE ? MOCK_EXPENSES : liveExpenses || [];
    const settlements = DEMO_MODE ? MOCK_SETTLEMENTS : liveSettlements || [];
    const groupsList = DEMO_MODE ? MOCK_GROUPS : contextGroups || [];

    const expList = expenses
      .filter((e) => {
        const isUserInvolved = e.payer_id === userId || e.splits?.some((s: any) => s.user_id === userId);
        const isFriendInvolved = e.payer_id === friendId || e.splits?.some((s: any) => s.user_id === friendId);
        return isUserInvolved && isFriendInvolved;
      })
      .map((e) => ({ type: 'expense' as const, data: e, created_at: e.created_at }));

    const sttList = settlements
      .filter(
        (s) =>
          (s.payer_id === userId && s.payee_id === friendId) ||
          (s.payer_id === friendId && s.payee_id === userId),
      )
      .map((s) => ({ type: 'settlement' as const, data: s, created_at: s.created_at }));

    const merged = [...expList, ...sttList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return { merged, groupsList };
  }, [friendId, liveExpenses, liveSettlements, userId, contextGroups]);

  const { merged: transactionItems, groupsList: allGroups } = sharedTransactions;

  const handleSendReminder = async () => {
    if (!friend || reminderCooldown > 0) return;

    const absBalance = Math.abs(netBalanceCents);
    const formattedAmt = formatCents(absBalance);
    const senderName = currentUser?.full_name || "Your friend";

    if (!DEMO_MODE && user) {
      try {
        await supabase.from("notifications").insert({
          user_id: friend.id,
          type: "PAYMENT_REMINDER",
          title: "Payment Reminder",
          message: `${senderName} sent you a payment reminder for ${formattedAmt}.`,
          is_read: false,
          metadata: { sender_id: user.id, amount_cents: absBalance },
        });
      } catch (error) {
        console.error("Failed to send reminder notification:", error);
      }
    }

    message.success(`Payment reminder sent to ${friend.full_name}!`);
    setReminderCooldown(60);
  };

  if (appLoading || friendsLoading || expensesLoading) {
    return <PageSkeleton layout="list" />;
  }

  if (!friend) {
    return (
      <div className="py-16 text-center">
        <Empty description="Friend not found" />
        <Button className="mt-4" onClick={() => navigate("/friends")}>
          Back to Friends
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate("/friends")}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-base transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Friends List
      </button>

      {/* Friend Header Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-bg-surface border border-border-base p-5 sm:p-6 text-text-base shadow-sm">
        <div className="relative z-10 space-y-5">
          {/* Top Row: Info & Relationship */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                size={60}
                src={friend.avatar_url ?? undefined}
                className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-xl shrink-0 border border-primary-500/30"
              >
                {getInitials(friend.full_name)}
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-base mb-0 line-clamp-1">
                    {friend.full_name}
                  </h1>
                  <Tag className="rounded-full text-[10px] font-semibold border-none px-2.5 py-0.5 m-0 bg-primary-500/10 text-primary-500">
                    {friendBalanceResult.groupBreakdown.length > 0
                      ? "Group Co-member"
                      : "Direct Friend"}
                  </Tag>
                </div>
                <p className="text-xs text-text-muted mt-0.5 mb-0 font-medium">
                  {(friend as any).email ??
                    `@${friend.full_name.toLowerCase().replace(/\s+/g, "")}`}
                </p>
              </div>
            </div>
          </div>

          {/* Middle Row: Financial Status Card */}
          <div className="bg-bg-subtle rounded-xl sm:rounded-2xl p-4 border border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">
                Net 1-on-1 Balance
              </div>
              <div className="flex items-center gap-2">
                {netBalanceCents > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-success-text shrink-0" />
                    <span className="text-sm sm:text-base font-medium text-success-text">
                      {friend.full_name.split(" ")[0]} owes you{" "}
                      <span className="font-financial font-bold text-lg sm:text-xl">
                        {formatCents(netBalanceCents)}
                      </span>
                    </span>
                  </>
                ) : netBalanceCents < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-error-text shrink-0" />
                    <span className="text-sm sm:text-base font-medium text-error-text">
                      You owe {friend.full_name.split(" ")[0]}{" "}
                      <span className="font-financial font-bold text-lg sm:text-xl">
                        {formatCents(Math.abs(netBalanceCents))}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-sm sm:text-base font-medium text-emerald-600 dark:text-emerald-400">
                      All settled up!
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Quick Action Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Button
              type="primary"
              icon={<DollarSign className="h-4 w-4" />}
              size="large"
              onClick={() => setIsSettleUpOpen(true)}
              disabled={Math.abs(netBalanceCents) < 1}
              className="w-full sm:flex-1 rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none shadow-md shadow-primary-500/20 disabled:opacity-50"
            >
              {Math.abs(netBalanceCents) < 1 ? "Settled Up" : "Settle Up"}
            </Button>
            <Button
              icon={<Bell className="h-4 w-4" />}
              size="large"
              onClick={handleSendReminder}
              disabled={reminderCooldown > 0}
              className="w-full sm:flex-1 rounded-xl bg-bg-surface hover:bg-bg-subtle text-text-base border-border-base font-semibold"
            >
              {reminderCooldown > 0 ? `Remind in ${reminderCooldown}s` : "Send Reminder"}
            </Button>
          </div>
        </div>
      </div>

      {/* Shared Group Balances Breakdown */}
      {friendBalanceResult.groupBreakdown.length > 0 && (
        <Card className="rounded-2xl border-border-base bg-bg-surface shadow-sm">
          <h3 className="text-sm font-bold text-text-base mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-500" />
            Shared Group Balances
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {friendBalanceResult.groupBreakdown.map(({ group, netBalance }) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-border-base/60 cursor-pointer hover:border-primary-500/50 transition-colors"
              >
                <div className="font-semibold text-xs text-text-base truncate">
                  {group.name}
                </div>
                <span
                  className={`font-financial text-xs font-bold ${netBalance > 0 ? "text-success-text" : netBalance < 0 ? "text-error-text" : "text-text-muted"}`}
                >
                  {netBalance === 0
                    ? "Settled up"
                    : netBalance > 0
                      ? `+${formatCents(netBalance)}`
                      : formatCents(netBalance)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Shared Activity Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-base flex items-center gap-2 mt-4 mb-2">
          <Receipt className="h-5 w-5 text-primary-500" />
          Shared Activity History ({transactionItems.length})
        </h2>

        {transactionItems.length === 0 ? (
          <Card className="rounded-2xl text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-2 opacity-80" />
            <p className="text-text-muted font-medium">
              No transactions shared with {friend.full_name} yet
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactionItems.map((item: any) => {
              if (item.type === 'settlement') {
                const settlement = item.data;
                const isUserPayer = settlement.payer_id === userId;
                const groupObj = settlement.group_id
                  ? allGroups.find((g: any) => g.id === settlement.group_id)
                  : null;

                return (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-4 bg-bg-surface rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Handshake className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <div className="font-semibold text-text-base flex items-center gap-2 flex-wrap">
                          <span>
                            {isUserPayer ? `You paid ${friend.full_name}` : `${friend.full_name} paid you`}
                          </span>
                          {groupObj ? (
                            <Tag
                              className="cursor-pointer border-none bg-primary-500/10 text-primary-500 font-semibold rounded-full text-[10px] px-2 py-0.5 m-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/groups/${groupObj.id}`);
                              }}
                            >
                              {groupObj.name}
                            </Tag>
                          ) : (
                            <Tag color="green" className="rounded-full text-[10px] font-semibold border-none px-2 py-0.5 m-0">
                              Direct Settlement
                            </Tag>
                          )}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          Payment Recorded • {formatDate(settlement.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-financial text-emerald-600 dark:text-emerald-400">
                        {formatCents(settlement.amount)}
                      </div>
                      <div className="text-xs font-medium text-text-muted mt-0.5">
                        {isUserPayer ? 'Payment Sent' : 'Payment Received'}
                      </div>
                    </div>
                  </div>
                );
              }

              const expense = item.data;
              const isUserPayer = expense.payer_id === userId;
              const userSplit = expense.splits?.find((s: any) => s.user_id === userId);
              const friendSplit = expense.splits?.find((s: any) => s.user_id === friendId);
              const groupObj = expense.group_id
                ? allGroups.find((g: any) => g.id === expense.group_id)
                : null;

              return (
                <div
                  key={expense.id}
                  onClick={() => setSelectedExpense(expense)}
                  className="flex items-center justify-between p-4 bg-bg-surface rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                      {(() => {
                        const CatIcon = getCategoryIcon(expense.category);
                        return <CatIcon className="h-5 w-5" strokeWidth={1.8} />;
                      })()}
                    </div>
                    <div>
                      <div className="font-semibold text-text-base flex items-center gap-2 flex-wrap">
                        <span>{expense.description}</span>
                        {groupObj ? (
                          <Tag
                            className="cursor-pointer border-none bg-primary-500/10 text-primary-500 font-semibold rounded-full text-[10px] px-2 py-0.5 m-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/groups/${groupObj.id}`);
                            }}
                          >
                            {groupObj.name}
                          </Tag>
                        ) : (
                          <Tag className="rounded-full text-[10px] font-semibold border-none px-2 py-0.5 m-0 bg-bg-subtle text-text-muted">
                            Direct Expense
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {isUserPayer ? "You paid" : `${friend.full_name} paid`} • {formatDate(expense.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-financial text-text-base">
                      {formatCents(expense.total_amount)}
                    </div>
                    <div className="text-xs font-medium mt-0.5">
                      {isUserPayer ? (
                        <span className="text-success-text">
                          {friend.full_name.split(" ")[0]} owes you {formatCents(friendSplit?.amount_owed ?? 0)}
                        </span>
                      ) : (
                        <span className="text-error-text">
                          You owe {formatCents(userSplit?.amount_owed ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <SettleUpModal
        open={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        onSuccess={handleRefetchAll}
        defaultPayeeId={netBalanceCents < 0 ? friendId : userId}
        defaultPayeeName={netBalanceCents < 0 ? friend.full_name : "You"}
        defaultAmountCents={Math.abs(netBalanceCents)}
        maxAmountCents={Math.abs(netBalanceCents)}
      />

      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(undefined);
        }}
        existingExpense={expenseToEdit}
        onSuccess={handleRefetchAll}
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
