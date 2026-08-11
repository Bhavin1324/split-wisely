import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Segmented, Empty, Tag, Button, Card, Dropdown, Modal, message, Switch, Drawer, List } from 'antd';
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
  Trash2,
  Calculator,
  X
} from 'lucide-react';
import {
  MOCK_CURRENT_USER,
} from '../lib/mockData';
import { formatCents } from '../utils/currency';
import { getCategoryIcon } from '../utils/icons';
import { formatDate } from '../utils/date';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddFriendModal } from '../components/AddFriendModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { SettleUpModal } from '../components/SettleUpModal';
import { leaveGroup, deleteGroup, deleteSettlement, removeMemberFromGroup, updateGroupSettings } from '../hooks/supabase/useMutations';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useGroupMembers } from '../hooks/supabase/useGroupsData';
import { useGroupCalculations } from '../hooks/useGroupCalculations';
import type { Expense } from '../types';

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
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const { user } = useAuth();
  const { currentUser, groups, refetchGroups, loading: appLoading } = useAppData();
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  useGroupMembers(groupId); // pre-fetch or trigger load for cache

  const group = useMemo(() => {
    return groups.find((g) => g.id === groupId);
  }, [groups, groupId]);

  const {
    groupMembers,
    refetchMembers,
    feedItems,
    displayedDebts,
    userNetBalance,
    myDebts,
    getProfile,
    memberLedgers,
    loading: groupLoading
  } = useGroupCalculations(groupId, userId, group);

  if (appLoading || groupLoading) {
    return <PageSkeleton layout="dashboard" />;
  }

  const handleLeaveGroup = () => {
    if (userNetBalance !== 0 || displayedDebts.length > 0) {
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

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Modal.confirm({
      title: 'Remove Member',
      content: `Are you sure you want to remove ${memberName} from this group?`,
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeMemberFromGroup(groupId!, memberId);
          message.success(`${memberName} removed from group`);
          refetchMembers();
        } catch (error: any) {
          message.error(error.message || 'Failed to remove member');
        }
      }
    });
  };

  const handleDeleteGroup = () => {
    if (displayedDebts.length > 0) {
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

  const handleToggleSimplify = async (checked: boolean) => {
    try {
      await updateGroupSettings(groupId!, { simplify_debts: checked });
      message.success(`Debt simplification turned ${checked ? 'on' : 'off'}`);
      refetchGroups();
    } catch (error: any) {
      message.error(error.message || 'Failed to update setting');
    }
  };

  const settingsMenu: MenuProps['items'] = [
    {
      key: 'simplify',
      label: (
        <div className="flex items-center justify-between min-w-[160px]" onClick={e => e.stopPropagation()}>
          <span>Simplify Debts</span>
          <Switch size="small" checked={group?.simplify_debts !== false} onChange={handleToggleSimplify} />
        </div>
      ),
    },
    { type: 'divider' },
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-surface-900 to-surface-800 p-5 sm:p-6 text-white shadow-xl">
        <div className="relative z-10 space-y-5">
          {/* Top Row: Info & Settings */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-400 text-xl sm:text-2xl font-bold border border-primary-500/30">
                {group.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 line-clamp-1">
                  {group.name}
                </h1>
                <Button
                  type="primary"
                  onClick={() => setIsMembersDrawerOpen(true)}
                  className="text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2 h-auto"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm font-medium">{groupMembers.length} Members</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </div>
            </div>
            
            <Dropdown menu={{ items: settingsMenu }} trigger={['click']} placement="bottomRight">
              <Button
                type="default"
                icon={<Settings className="h-5 w-5" />}
                className="text-gray-300 hover:text-white hover:bg-white/10"
              />
            </Dropdown>
          </div>

          {/* Middle Row: Status */}
          <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Your Status</div>
            {myDebts.length === 0 ? (
              <div className="text-sm text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" /> All settled up!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {myDebts.map((debt, idx) => {
                  const isOwe = debt.from === userId;
                  const otherPersonId = isOwe ? debt.to : debt.from;
                  const otherPerson = getProfile(otherPersonId);
                  const otherName = otherPerson?.full_name ?? otherPersonId;
                  
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 text-sm bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-gray-200 truncate">
                        {isOwe ? (
                          <>You owe <strong className="text-white">{otherName}</strong></>
                        ) : (
                          <><strong className="text-white">{otherName}</strong> owes you</>
                        )}
                      </span>
                      <span className={`font-bold font-financial shrink-0 ${isOwe ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCents(debt.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Row: Actions */}
          <div className="flex items-center gap-3 w-full">
            <Button
              type="primary"
              icon={<Plus className="h-4 w-4" />}
              size="large"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex-1 rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none shadow-lg shadow-primary-500/20"
            >
              Expenses
            </Button>
            <Button
              icon={<UserPlus className="h-4 w-4" />}
              size="large"
              onClick={() => setIsAddMemberOpen(true)}
              className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold backdrop-blur-sm"
            >
              Invite
            </Button>
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
          {activeTab === 'expenses' ? `${feedItems.length} activities` : `${displayedDebts.length} pending debts`}
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
                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>Paid by <strong className="text-gray-700">{isUserPayer ? 'You' : payer?.full_name}</strong></span>
                          <span className='hidden sm:inline'>•</span>
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

            {displayedDebts.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-gray-700">Everyone in this group is settled up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedDebts.map((debt, index) => {
                  const fromProfile = getProfile(debt.from);
                  const toProfile = getProfile(debt.to);
                  const isUserDebtor = debt.from === userId;
                  const isUserCreditor = debt.to === userId;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                        isUserDebtor
                          ? 'bg-rose-50/50 border-rose-100'
                          : isUserCreditor
                          ? 'bg-emerald-50/50 border-emerald-100'
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="large" style={{ backgroundColor: isUserDebtor ? '#f43f5e' : isUserCreditor ? '#10b981' : '#64748b' }}>
                          {isUserDebtor ? toProfile?.full_name.charAt(0) : fromProfile?.full_name.charAt(0)}
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {isUserDebtor ? (
                              <>You owe <strong className="text-gray-900">{toProfile?.full_name}</strong></>
                            ) : isUserCreditor ? (
                              <><strong className="text-gray-900">{fromProfile?.full_name}</strong> owes you</>
                            ) : (
                              <><strong className="text-gray-900">{fromProfile?.full_name}</strong> owes <strong className="text-gray-900">{toProfile?.full_name}</strong></>
                            )}
                          </div>
                          <div className="text-xl font-bold font-financial mt-0.5">
                            <span className={isUserDebtor ? 'text-rose-600' : isUserCreditor ? 'text-emerald-600' : 'text-gray-700'}>
                              {formatCents(debt.amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        {isUserDebtor && (
                          <Button type="primary" size="large" onClick={() => { setSettleUpTarget(debt.to); setSettleUpTargetName(toProfile?.full_name); setSettleUpMaxAmount(debt.amount); }} className="w-full sm:w-auto rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none text-white shadow-sm">
                            Settle Up
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-6 border-t border-gray-100 pt-4 flex justify-center">
              <Button type="link" icon={<Calculator className="h-4 w-4" />} onClick={() => setIsLedgerOpen(true)} className="text-gray-500 hover:text-primary-600">
                How are these calculated?
              </Button>
            </div>
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
        defaultAmountCents={settleUpMaxAmount}
        maxAmountCents={settleUpMaxAmount}
        defaultGroupId={groupId}
      />

      {/* Members Drawer */}
      <Drawer
        title="Group Members"
        placement="right"
        onClose={() => setIsMembersDrawerOpen(false)}
        open={isMembersDrawerOpen}
        width={360}
      >
        <List
          dataSource={groupMembers}
          renderItem={(m) => {
            const profile = getProfile(m.user_id);
            const name = profile?.full_name ?? m.user_id;
            const isMe = m.user_id === userId;
            return (
              <List.Item
                actions={
                  !isMe
                    ? [
                        <Button
                          key="remove"
                          type="text"
                          danger
                          icon={<X className="h-4 w-4" />}
                          onClick={() => {
                            handleRemoveMember(m.user_id, name);
                            setIsMembersDrawerOpen(false);
                          }}
                        >
                          Remove
                        </Button>,
                      ]
                    : [<Tag key="me" color="blue">You</Tag>]
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: 'var(--color-primary-500)' }}>
                      {name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                  }
                  title={<span className="font-semibold text-gray-800">{name}</span>}
                  description={<span className="text-xs text-gray-500">Joined {formatDate(m.joined_at)}</span>}
                />
              </List.Item>
            );
          }}
        />
        <Button
          type="dashed"
          block
          icon={<Plus className="h-4 w-4" />}
          className="mt-6"
          onClick={() => {
            setIsMembersDrawerOpen(false);
            setIsAddMemberOpen(true);
          }}
        >
          Add New Member
        </Button>
      </Drawer>

      {/* Ledger Breakdown Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary-500" />
            <span>Calculation Breakdown</span>
          </div>
        }
        open={isLedgerOpen}
        onCancel={() => setIsLedgerOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsLedgerOpen(false)}>
            Close
          </Button>
        ]}
        width={720}
        style={{ top: 20 }}
      >
        <div className="my-4 space-y-4">
          <p className="text-sm text-gray-500">
            This breakdown fully explains your current balance by separating your group expenses from the payments you've sent and received.
          </p>
          <div className="space-y-3 mt-4 max-h-[85vh] overflow-y-auto pr-2">
            {memberLedgers.map((l) => (
              <div key={l.userId} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Avatar size="small" style={{ backgroundColor: '#94a3b8' }}>{l.avatarChar}</Avatar>
                    <span className="font-semibold text-gray-800">{l.userId === userId ? `${l.name} (You)` : l.name}</span>
                  </div>
                  <div className={`font-financial font-bold ${l.netBalance > 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md' : l.netBalance < 0 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md' : 'text-gray-500'}`}>
                    {l.netBalance > 0 ? '+' : ''}{formatCents(l.netBalance)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Expenses Column */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 space-y-3">
                    <div>
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Expenses Paid</div>
                      <div className="font-financial font-medium text-gray-700">{formatCents(l.expensesPaid)}</div>
                    </div>
                    <div className="pt-2 border-t border-gray-50">
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Expense Share</div>
                      <div className="font-financial font-medium text-gray-700">{formatCents(l.expenseShare)}</div>
                    </div>
                  </div>

                  {/* Settlements Column */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 space-y-3">
                    <div>
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Payments Sent</div>
                      <div className="font-financial font-medium text-gray-700">{formatCents(l.paymentsSent)}</div>
                    </div>
                    <div className="pt-2 border-t border-gray-50">
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Payments Received</div>
                      <div className="font-financial font-medium text-gray-700">{formatCents(l.paymentsReceived)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
