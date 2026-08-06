import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Segmented, Empty, Tag, Button, Card } from 'antd';
import {
  ArrowRight,
  Receipt,
  Users,
  Plus,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import {
  MOCK_GROUPS,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
  MOCK_GROUP_MEMBERS,
  MOCK_CURRENT_USER,
  getProfileById,
} from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import { formatDate } from '../utils/date';
import { DebtSimplifier } from '../core/domain/DebtSimplifier';
import { AddExpenseModal } from '../components/AddExpenseModal';

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const group = useMemo(() => {
    return MOCK_GROUPS.find((g) => g.id === groupId);
  }, [groupId]);

  const groupMembers = useMemo(() => {
    if (!groupId) return [];
    return MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === groupId);
  }, [groupId]);

  const groupExpenses = useMemo(() => {
    if (!groupId) return [];
    return MOCK_EXPENSES.filter((e) => e.group_id === groupId).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [groupId]);

  const groupSettlements = useMemo(() => {
    if (!groupId) return [];
    return MOCK_SETTLEMENTS.filter((s) => s.group_id === groupId);
  }, [groupId]);

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
  const userNetBalance = useMemo(() => {
    let balance = 0;
    simplifiedDebts.forEach((debt) => {
      if (debt.from === MOCK_CURRENT_USER.id) balance -= debt.amount;
      if (debt.to === MOCK_CURRENT_USER.id) balance += debt.amount;
    });
    return balance;
  }, [simplifiedDebts]);

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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 text-2xl font-bold border border-brand-500/30">
              {group.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-0">
                  {group.name}
                </h1>
                <Tag color="green" className="rounded-full px-3">
                  Active Group
                </Tag>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-300">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{groupMembers.length} members</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2 hidden sm:block">
              <div className="text-xs text-gray-400">Your Group Balance</div>
              <div
                className={`text-lg font-bold font-financial ${getBalanceColorClass(userNetBalance)}`}
              >
                {userNetBalance === 0
                  ? 'Settled up'
                  : formatCents(userNetBalance)}
              </div>
            </div>
            <Button
              type="primary"
              icon={<Plus className="h-4 w-4" />}
              size="large"
              onClick={() => setIsAddExpenseOpen(true)}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold"
            >
              Add Expense
            </Button>
          </div>
        </div>

        {/* Member Avatar Stack */}
        <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-2">Members:</span>
            <Avatar.Group maxCount={6} size="small">
              {groupMembers.map((m) => {
                const profile = getProfileById(m.user_id);
                const name = profile?.full_name ?? m.user_id;
                return (
                  <Avatar
                    key={m.user_id}
                    style={{ backgroundColor: '#16a34a' }}
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
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <Segmented
          options={[
            { label: 'Expenses Feed', value: 'expenses', icon: <Receipt className="h-4 w-4 inline mr-1" /> },
            { label: 'Balances & Settlements', value: 'balances', icon: <DollarSign className="h-4 w-4 inline mr-1" /> },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'expenses' | 'balances')}
          className="bg-gray-100 p-1"
        />

        <div className="text-sm text-gray-500">
          {activeTab === 'expenses' ? `${groupExpenses.length} expenses` : `${simplifiedDebts.length} pending debts`}
        </div>
      </div>

      {/* ── TAB 1: Expenses Feed ── */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {groupExpenses.length === 0 ? (
            <Card className="rounded-2xl text-center py-12">
              <Empty description="No expenses recorded in this group yet" />
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
            groupExpenses.map((expense) => {
              const payer = getProfileById(expense.payer_id);
              const isUserPayer = expense.payer_id === MOCK_CURRENT_USER.id;
              const userSplit = expense.splits?.find((s) => s.user_id === MOCK_CURRENT_USER.id);
              const userOwesAmount = userSplit?.amount_owed ?? 0;

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Receipt className="h-5 w-5" />
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
                        <span className="text-orange-500 font-medium">
                          You owe {formatCents(userOwesAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: Balances & Simplified Debts ── */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand-500" />
              Simplified Repayment Instructions
            </h3>

            {simplifiedDebts.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-gray-700">Everyone in this group is settled up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedDebts.map((debt, index) => {
                  const fromProfile = getProfileById(debt.from);
                  const toProfile = getProfileById(debt.to);
                  const isUserDebtor = debt.from === MOCK_CURRENT_USER.id;
                  const isUserCreditor = debt.to === MOCK_CURRENT_USER.id;

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isUserDebtor
                          ? 'bg-orange-50/50 border-orange-100'
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

                        <Avatar style={{ backgroundColor: '#16a34a' }}>
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
                          <Button type="primary" size="small" className="rounded-lg bg-emerald-600">
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={groupId}
      />
    </div>
  );
}
