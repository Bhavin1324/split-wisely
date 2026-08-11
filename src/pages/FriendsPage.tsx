import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Button } from 'antd';
import { UserPlus } from 'lucide-react';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUP_MEMBERS, getFriendsForUser } from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import type { Profile, Expense, Settlement, GroupMember } from '../types';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/supabase/useProfileData';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { AddFriendModal } from '../components/AddFriendModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';

/**
 * Computes the net balance between the current user and a friend.
 * Positive = friend owes current user, negative = current user owes friend.
 */
function computeFriendBalance(
  currentUserId: string,
  friendId: string,
  expenses: Expense[],
  settlements: Settlement[],
  groupMembers: GroupMember[]
): number {
  let balance = 0;

  const currentUserGroups = new Set(
    groupMembers
      .filter((gm) => gm.user_id === currentUserId)
      .map((gm) => gm.group_id),
  );
  const sharedGroupIds = new Set(
    groupMembers
      .filter((gm) => gm.user_id === friendId && currentUserGroups.has(gm.group_id))
      .map((gm) => gm.group_id),
  );

  for (const expense of expenses) {
    if (!expense.group_id || !sharedGroupIds.has(expense.group_id)) continue;
    if (!expense.splits) continue;

    const friendSplit = expense.splits.find((s) => s.user_id === friendId);
    const currentUserSplit = expense.splits.find((s) => s.user_id === currentUserId);

    if (expense.payer_id === currentUserId && friendSplit) {
      balance += friendSplit.amount_owed;
    } else if (expense.payer_id === friendId && currentUserSplit) {
      balance -= currentUserSplit.amount_owed;
    }
  }

  for (const settlement of settlements) {
    if (settlement.payer_id === friendId && settlement.payee_id === currentUserId) {
      balance -= settlement.amount;
    } else if (settlement.payer_id === currentUserId && settlement.payee_id === friendId) {
      balance += settlement.amount;
    }
  }

  return balance;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ef4444', '#ec4899', '#14b8a6', '#6366f1',
  ];
  let hash = 0;
  for (const char of userId) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getBalanceLabel(balance: number, friendName: string): string {
  if (balance > 0) return `${friendName} owes you`;
  if (balance < 0) return `you owe ${friendName}`;
  return 'settled up';
}

export function FriendsPage() {
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser } = useAppData();
  
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { loading: appLoading } = useAppData();
  const { data: liveFriends, loading: friendsLoading } = useFriends(user?.id);
  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(user?.id);

  const friends = DEMO_MODE ? getFriendsForUser(MOCK_CURRENT_USER.id) : (liveFriends || []);

  const friendsWithBalances: { profile: Profile; balance: number }[] = friends.map((friend) => {
    let balance = 0;
    if (DEMO_MODE) {
      balance = computeFriendBalance(
        userId, 
        friend.id, 
        MOCK_EXPENSES as any, 
        MOCK_SETTLEMENTS as any, 
        MOCK_GROUP_MEMBERS as any
      );
    } else {
      // In live mode, compute from live expenses
      balance = computeFriendBalance(
        userId,
        friend.id,
        (liveExpenses || []) as any,
        [] as any,
        [] as any
      );
    }
    return {
      profile: friend,
      balance,
    };
  });

  friendsWithBalances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const totalBalance = friendsWithBalances.reduce((sum, f) => sum + f.balance, 0);

  if (appLoading || friendsLoading || expensesLoading) {
    return <PageSkeleton layout="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
          <p className="text-sm text-gray-500 mt-1">
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overall balance</p>
          <p className={`text-xl font-semibold font-financial ${getBalanceColorClass(totalBalance)}`}>
            {totalBalance > 0 ? '+' : ''}{formatCents(totalBalance)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-primary-50 p-4 rounded-xl border border-primary-100">
        <p className="text-sm text-primary-700 font-medium">Add friends to split bills more easily.</p>
        <Button
          type="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddFriendOpen(true)}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
        >
          Add Friend
        </Button>
      </div>

      {/* Friends list */}
      <div className="grid gap-3">
        {friendsWithBalances.map(({ profile, balance }) => (
          <Card
            key={profile.id}
            size="small"
            onClick={() => navigate(`/friends/${profile.id}`)}
            className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-gray-100"
          >
            <div className="flex items-center gap-4">
              <Avatar
                size={48}
                style={{ backgroundColor: getAvatarColor(profile.id), flexShrink: 0 }}
              >
                {getInitials(profile.full_name)}
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getBalanceLabel(balance, profile.full_name.split(' ')[0])}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`text-lg font-semibold font-financial ${getBalanceColorClass(balance)}`}>
                  {balance === 0
                    ? formatCents(0)
                    : `${balance > 0 ? '+' : ''}${formatCents(balance)}`}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {friends.length === 0 && (
          <Card className="rounded-2xl border-dashed border-2 border-gray-200">
            <div className="text-center py-12 text-gray-400">
              <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">No friends yet</p>
              <p className="text-sm mt-1 mb-6">
                Add friends by creating a group together or inviting them directly
              </p>
              <Button
                type="primary"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsAddFriendOpen(true)}
                className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
              >
                Add Friend
              </Button>
            </div>
          </Card>
        )}
      </div>

      <AddFriendModal
        open={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
    </div>
  );
}
