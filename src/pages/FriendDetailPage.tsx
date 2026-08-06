import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Empty } from 'antd';
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import {
  MOCK_CURRENT_USER,
  MOCK_PROFILES,
  MOCK_EXPENSES,
  MOCK_SETTLEMENTS,
} from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import { formatDate } from '../utils/date';
import { SettleUpModal } from '../components/SettleUpModal';

export function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);

  const friend = useMemo(() => {
    return MOCK_PROFILES.find((p) => p.id === friendId);
  }, [friendId]);

  // Expenses involving both current user and this friend
  const sharedExpenses = useMemo(() => {
    if (!friendId) return [];
    return MOCK_EXPENSES.filter((e) => {
      const isUserInvolved = e.payer_id === MOCK_CURRENT_USER.id || e.splits?.some((s) => s.user_id === MOCK_CURRENT_USER.id);
      const isFriendInvolved = e.payer_id === friendId || e.splits?.some((s) => s.user_id === friendId);
      return isUserInvolved && isFriendInvolved;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [friendId]);

  // Settlements between current user and this friend
  const sharedSettlements = useMemo(() => {
    if (!friendId) return [];
    return MOCK_SETTLEMENTS.filter(
      (s) =>
        (s.payer_id === MOCK_CURRENT_USER.id && s.payee_id === friendId) ||
        (s.payer_id === friendId && s.payee_id === MOCK_CURRENT_USER.id),
    );
  }, [friendId]);

  // Net balance between current user and this friend (in cents)
  // Positive = friend owes user, Negative = user owes friend
  const netBalanceCents = useMemo(() => {
    if (!friendId) return 0;
    let balance = 0;

    sharedExpenses.forEach((e) => {
      if (e.payer_id === MOCK_CURRENT_USER.id) {
        const friendSplit = e.splits?.find((s) => s.user_id === friendId);
        if (friendSplit) balance += friendSplit.amount_owed;
      } else if (e.payer_id === friendId) {
        const userSplit = e.splits?.find((s) => s.user_id === MOCK_CURRENT_USER.id);
        if (userSplit) balance -= userSplit.amount_owed;
      }
    });

    sharedSettlements.forEach((s) => {
      if (s.payer_id === MOCK_CURRENT_USER.id && s.payee_id === friendId) {
        balance += s.amount; // user paid friend => friend owes user more
      } else if (s.payer_id === friendId && s.payee_id === MOCK_CURRENT_USER.id) {
        balance -= s.amount; // friend paid user => balance reduced
      }
    });

    return balance;
  }, [friendId, sharedExpenses, sharedSettlements]);

  if (!friend) {
    return (
      <div className="py-16 text-center">
        <Empty description="Friend not found" />
        <Button className="mt-4" onClick={() => navigate('/friends')}>
          Back to Friends
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/friends')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Friends List
      </button>

      {/* Friend Header Card */}
      <div className="rounded-2xl bg-gradient-to-r from-surface-900 to-surface-800 p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            size={64}
            style={{ backgroundColor: '#1db954', fontSize: 24, fontWeight: 700 }}
          >
            {friend.full_name.split(' ').map((n) => n[0]).join('')}
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-white mb-0">{friend.full_name}</h1>
            <div className="text-xs text-gray-400 mt-1">1-on-1 Balance Summary</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-400">Net 1-on-1 Balance</div>
            <div className={`text-xl font-bold font-financial ${getBalanceColorClass(netBalanceCents)}`}>
              {netBalanceCents === 0
                ? 'Settled Up'
                : netBalanceCents > 0
                ? `${friend.full_name.split(' ')[0]} owes you ${formatCents(netBalanceCents)}`
                : `You owe ${friend.full_name.split(' ')[0]} ${formatCents(Math.abs(netBalanceCents))}`}
            </div>
          </div>

          <Button
            type="primary"
            icon={<DollarSign className="h-4 w-4" />}
            size="large"
            onClick={() => setIsSettleUpOpen(true)}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold"
          >
            Settle Up
          </Button>
        </div>
      </div>

      {/* Shared Expenses Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-brand-500" />
          Shared Transaction History ({sharedExpenses.length})
        </h2>

        {sharedExpenses.length === 0 ? (
          <Card className="rounded-2xl text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-gray-600 font-medium">No direct expenses shared with {friend.full_name} yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sharedExpenses.map((expense) => {
              const isUserPayer = expense.payer_id === MOCK_CURRENT_USER.id;
              const userSplit = expense.splits?.find((s) => s.user_id === MOCK_CURRENT_USER.id);
              const friendSplit = expense.splits?.find((s) => s.user_id === friendId);

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{expense.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {isUserPayer ? 'You paid' : `${friend.full_name} paid`} • {formatDate(expense.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-financial text-gray-900">
                      {formatCents(expense.total_amount)}
                    </div>
                    <div className="text-xs font-medium mt-0.5">
                      {isUserPayer ? (
                        <span className="text-emerald-600">
                          {friend.full_name.split(' ')[0]} owes you {formatCents(friendSplit?.amount_owed ?? 0)}
                        </span>
                      ) : (
                        <span className="text-orange-500">
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

      {/* Settle Up Modal prefilled with friend */}
      <SettleUpModal
        open={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        defaultPayeeId={netBalanceCents < 0 ? friendId : MOCK_CURRENT_USER.id}
        defaultAmountCents={Math.abs(netBalanceCents)}
      />
    </div>
  );
}
