import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Segmented, Empty, Tag, Button, Card, Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowRight,
  Receipt,
  Users,
  Plus,
  CheckCircle2,
  DollarSign,
  UserPlus,
  Settings,
  LogOut,
  Trash2
} from 'lucide-react';
import {
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_GROUP_MEMBERS,
  MOCK_CURRENT_USER,
  getProfileById,
} from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import { getCategoryIcon } from '../utils/icons';
import { formatDate } from '../utils/date';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddFriendModal } from '../components/AddFriendModal';
import { SettleUpModal } from '../components/SettleUpModal';
import { leaveGroup, deleteGroup, deleteSettlement } from '../hooks/supabase/useMutations';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useGroupMembers } from '../hooks/supabase/useGroupsData';
import { useExpenses } from '../hooks/supabase/useExpensesData';
import { useSettlements } from '../hooks/supabase/useSettlementsData';
import type { Profile, Expense } from '../types';

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [settleUpTarget, setSettleUpTarget] = useState<string | null>(null);
  const [settleUpTargetName, setSettleUpTargetName] = useState<string | undefined>(undefined);
  const [settleUpMaxAmount, setSettleUpMaxAmount] = useState<number | undefined>(undefined);

  const { user } = useAuth();
  const { currentUser, groups, refetchGroups } = useAppData();
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { data: liveMembers } = useGroupMembers(groupId);
  const { data: liveExpenses } = useExpenses(groupId);
  const { data: liveSettlements } = useSettlements(groupId);

  const group = useMemo(() => {
    return groups.find((g) => g.id === groupId);
  }, [groups, groupId]);

  const groupMembers = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === groupId);
    }
    return liveMembers || [];
  }, [groupId, liveMembers]);

  const groupExpenses = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_EXPENSES.filter((e) => e.group_id === groupId).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return liveExpenses || [];
  }, [groupId, liveExpenses]);

  const groupSettlements = useMemo(() => {
    if (DEMO_MODE) {
      if (!groupId) return [];
      return MOCK_SETTLEMENTS.filter((s) => s.group_id === groupId);
    }
    return liveSettlements || [];
  }, [groupId, liveSettlements]);

  // Combine expenses and settlements into a single activity feed
  const feedItems = useMemo(() => {
    const items: { type: 'expense' | 'settlement'; data: any; date: number }[] = [
      ...groupExpenses.map((e) => ({ type: 'expense' as const, data: e, date: new Date(e.created_at).getTime() })),
      ...groupSettlements.map((s) => ({ type: 'settlement' as const, data: s, date: new Date(s.created_at).getTime() })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [groupExpenses, groupSettlements]);

  // Compute simplified debts for this group
  const simplifiedDebts = useMemo(() => {
    if (!groupId) return [];
    return DebtSimplifier.simplifyDebts(
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
  }, [groupId, groupExpenses, groupSettlements, groupMembers]);

  // Compute user's net balance in this group
  const { userNetBalance, userOwes, userIsOwed } = useMemo(() => {
    let balance = 0;
    let owes = 0;
    let isOwed = 0;
    simplifiedDebts.forEach((debt) => {
      if (debt.from === userId) {
        balance -= debt.amount;
        owes += debt.amount;
      }
      if (debt.to === userId) {
        balance += debt.amount;
        isOwed += debt.amount;
      }
    });
    return { userNetBalance: balance, userOwes: owes, userIsOwed: isOwed };
  }, [simplifiedDebts, userId]);

  const getProfile = (id: string) => {
    if (DEMO_MODE) return getProfileById(id) as Profile | undefined;
    const member = liveMembers?.find(m => m.user_id === id);
    return member?.profile as Profile | undefined;
  };

  const handleLeaveGroup = () => {
    if (userNetBalance !== 0 || simplifiedDebts.length > 0) {
      Modal.confirm({
        title: 'Unsettled Debts',
        content: 'You cannot leave this group because you have unsettled debts. Please settle up first.',
        okButtonProps: { danger: true, disabled: true },
        cancelText: 'Cancel'
      });
      return;
    }
    Modal.confirm({
      title: 'Leave Group',
      content: 'Are you sure you want to leave this group?',
      okText: 'Leave',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await leaveGroup(groupId!, userId);
          message.success('Left group successfully');
          refetchGroups();
          navigate('/dashboard');
        } catch (error: any) {
          message.error(error.message || 'Failed to leave group');
        }
      }
    });
  };

  const handleDeleteGroup = () => {
    if (simplifiedDebts.length > 0) {
      Modal.confirm({
        title: 'Warning: Unsettled Debts!',
        content: 'This group has unsettled expenses. Are you absolutely sure you want to delete it? This action cannot be undone.',
        okText: 'Delete Anyway',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await deleteGroup(groupId!);
            message.success('Group deleted');
            refetchGroups();
            navigate('/dashboard');
          } catch (error: any) {
            message.error(error.message || 'Failed to delete group');
          }
        }
      });
      return;
    }
    Modal.confirm({
      title: 'Delete Group',
      content: 'Are you sure you want to delete this group?',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteGroup(groupId!);
          message.success('Group deleted');
          refetchGroups();
          navigate('/dashboard');
        } catch (error: any) {
          message.error(error.message || 'Failed to delete group');
        }
      }
    });
  };

  const settingsMenu: MenuProps['items'] = [
    {
      key: 'leave',
      icon: <LogOut className="h-4 w-4" />,
      label: 'Leave Group',
      onClick: handleLeaveGroup,
    },
    {
      key: 'delete',
      danger: true,
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Delete Group',
      onClick: handleDeleteGroup,
    },
  ];

  if (!group) {
    return (
      <div className="py-16 text-center">
        <Empty description="Group not found" />
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Group Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-surface-900 to-surface-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-400 text-2xl font-bold border border-primary-500/30">
              {group.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-0">
                  {group.name}
                </h1>
                <Tag className="bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-full px-3">
                  Active Group
                </Tag>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-300">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{groupMembers.length} members</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="text-right mr-2">
              <div className="text-xs text-gray-400">Your Group Balance</div>
              <div
                className={`text-lg font-bold font-financial ${getBalanceColorClass(userNetBalance)}`}
              >
                {userNetBalance === 0
                  ? 'Settled up'
                  : formatCents(userNetBalance)}
              </div>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                {userOwes > 0 && <span className="text-[10px] text-rose-300">You Owe {formatCents(userOwes)}</span>}
                {userIsOwed > 0 && <span className="text-[10px] text-emerald-300">Owed {formatCents(userIsOwed)}</span>}
              </div>
            </div>
            <Button
              icon={<UserPlus className="h-4 w-4" />}
              size="large"
              onClick={() => setIsAddMemberOpen(true)}
              className="rounded-xl bg-primary-500/20 hover:bg-primary-500/30 text-primary-50 border border-primary-500/30 font-semibold"
            >
              <span className='hidden md:inline'>Invite Member</span>
            </Button>
            <Button
              type="primary"
              icon={<Plus className="h-4 w-4" />}
              size="large"
              onClick={() => setIsAddExpenseOpen(true)}
              className="rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none"
            >
              <span className='hidden md:inline'>Add Expense</span>
            </Button>
            <Dropdown menu={{ items: settingsMenu }} trigger={['click']} placement="bottomRight">
              <Button
                size="large"
                icon={<Settings className="h-5 w-5" />}
                className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 ml-2"
              />
            </Dropdown>
          </div>
        </div>

        {/* Member Avatar Stack */}
        <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-2">Members:</span>
            <Avatar.Group maxCount={6} size="small">
              {groupMembers.map((m) => {
                const profile = getProfile(m.user_id);
                console.log(profile)
                const name = profile?.full_name ?? m.user_id;
                return (
                  <Avatar
                    key={m.user_id}
                    style={{ backgroundColor: 'var(--color-primary-500)' }}
                  >
                    {name.split(' ').map((n) => n[0]).join('')}
                  </Avatar>
                );
              })}
            </Avatar.Group>
          </div>
        </div>
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-3">
        <div className="overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Segmented
            options={[
              { label: 'Expenses', value: 'expenses', icon: <Receipt className="h-4 w-4 inline mr-1" /> },
              { label: 'Settlements', value: 'balances', icon: <DollarSign className="h-4 w-4 inline mr-1" /> },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'expenses' | 'balances')}
            className="bg-gray-100 p-1"
          />
        </div>

        <div className="text-sm text-gray-500 font-medium">
          {activeTab === 'expenses' ? `${feedItems.length} activities` : `${simplifiedDebts.length} pending debts`}
        </div>
      </div>

      {/* ── TAB 1: Expenses Feed ── */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {feedItems.length === 0 ? (
            <Card className="rounded-2xl text-center py-12">
              <Empty description="No activities recorded in this group yet" />
              <Button
                type="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsAddExpenseOpen(true)}
                className="mt-4"
              >
                Add First Expense
              </Button>
            </Card>
          ) : (
            feedItems.map((item) => {
              if (item.type === 'expense') {
                const expense = item.data;
                const payer = getProfile(expense.payer_id);
                const isUserPayer = expense.payer_id === userId;
                const userSplit = expense.splits?.find((s: any) => s.user_id === userId);
                const userOwesAmount = userSplit?.amount_owed ?? 0;

                return (
                  <div
                    key={`expense-${expense.id}`}
                    onClick={() => setSelectedExpense(expense)}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        {(() => {
                          const CatIcon = getCategoryIcon(expense.category);
                          return <CatIcon className="h-5 w-5" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{expense.description}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>Paid by <strong className="text-gray-700">{isUserPayer ? 'You' : payer?.full_name}</strong></span>
                          <span>•</span>
                          <span>{formatDate(expense.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-financial text-gray-900">
                        {formatCents(expense.total_amount)}
                      </div>
                      <div className="text-xs mt-0.5">
                        {isUserPayer ? (
                          <span className="text-emerald-600 font-medium">
                            You lent {formatCents(expense.total_amount - userOwesAmount)}
                          </span>
                        ) : (
                          <span className="text-rose-500 font-medium">
                            You owe {formatCents(userOwesAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                const settlement = item.data;
                const payer = getProfile(settlement.payer_id);
                const payee = getProfile(settlement.payee_id);
                const isUserPayer = settlement.payer_id === userId;
                const isUserPayee = settlement.payee_id === userId;
                
                return (
                  <div
                    key={`settlement-${settlement.id}`}
                    onClick={() => {
                      if (!DEMO_MODE) {
                        Modal.confirm({
                          title: 'Delete Payment',
                          content: 'Are you sure you want to delete this payment record?',
                          okText: 'Delete',
                          okButtonProps: { danger: true },
                          onOk: async () => {
                            try {
                              await deleteSettlement(settlement.id);
                              message.success('Payment deleted');
                              window.dispatchEvent(new Event('expenseAdded')); // Trigger refetch
                            } catch (error: any) {
                              message.error(error.message || 'Failed to delete payment');
                            }
                          }
                        });
                      } else {
                        message.info('Cannot delete settlements in Demo Mode.');
                      }
                    }}
                    className="flex items-center justify-between p-3 my-1 mx-auto w-full md:w-5/6 bg-gray-50 border border-gray-200 rounded-full shadow-sm hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 ml-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <strong className="text-gray-800">{isUserPayer ? 'You' : payer?.full_name}</strong>
                        <span className="text-gray-500">paid</span>
                        <strong className="text-gray-800">{isUserPayee ? 'You' : payee?.full_name}</strong>
                        <strong className="text-emerald-600 ml-1 font-financial bg-emerald-100/50 px-2 py-0.5 rounded-full">{formatCents(settlement.amount)}</strong>
                        <span className="text-xs text-gray-400 ml-2 hidden sm:inline-block">• {formatDate(settlement.created_at)}</span>
                      </div>
                    </div>

                    <div className="mr-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-red-500 bg-red-100 p-1.5 rounded-full">
                      <Trash2 className="h-4 w-4" />
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>
      )}

      {/* ── TAB 2: Balances & Simplified Debts ── */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-500" />
              Simplified Repayment Instructions
            </h3>

            {simplifiedDebts.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-gray-700">Everyone in this group is settled up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedDebts.map((debt, index) => {
                  const fromProfile = getProfile(debt.from);
                  const toProfile = getProfile(debt.to);
                  const isUserDebtor = debt.from === userId;
                  const isUserCreditor = debt.to === userId;

                  return (
                    <div
                      key={index}
                      className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 rounded-xl border ${
                        isUserDebtor
                          ? 'bg-rose-50/50 border-rose-100'
                          : isUserCreditor
                          ? 'bg-emerald-50/50 border-emerald-100'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar style={{ backgroundColor: '#1e293b' }}>
                          {fromProfile?.full_name.charAt(0) ?? debt.from.charAt(0)}
                        </Avatar>
                        <span className="font-medium text-gray-900">
                          {isUserDebtor ? 'You' : fromProfile?.full_name}
                        </span>

                        <ArrowRight className="h-4 w-4 text-gray-400" />

                        <Avatar style={{ backgroundColor: 'var(--color-primary-500)' }}>
                          {toProfile?.full_name.charAt(0) ?? debt.to.charAt(0)}
                        </Avatar>
                        <span className="font-medium text-gray-900">
                          {isUserCreditor ? 'You' : toProfile?.full_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold font-financial text-gray-900">
                          {formatCents(debt.amount)}
                        </span>
                        {isUserDebtor && (
                          <Button type="primary" size="small" onClick={() => { setSettleUpTarget(debt.to); setSettleUpTargetName(toProfile?.full_name); setSettleUpMaxAmount(debt.amount); }} className="rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none text-white shadow-sm">
                            Settle Up
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(undefined);
        }}
        groupId={groupId}
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

      <AddFriendModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        defaultGroupId={groupId}
      />

      <SettleUpModal
        open={!!settleUpTarget}
        onClose={() => { setSettleUpTarget(null); setSettleUpTargetName(undefined); setSettleUpMaxAmount(undefined); }}
        defaultPayeeId={settleUpTarget ?? undefined}
        defaultPayeeName={settleUpTargetName}
        maxAmountCents={settleUpMaxAmount}
        defaultGroupId={groupId}
      />
    </div>
  );
}
