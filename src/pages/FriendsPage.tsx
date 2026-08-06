import { useNavigate } from 'react-router-dom';
import { Avatar, Card } from 'antd';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUP_MEMBERS, getFriendsForUser } from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import type { Profile } from '../types';

/**
 * Computes the net balance between the current user and a friend.
 * Positive = friend owes current user, negative = current user owes friend.
 */
function computeFriendBalance(currentUserId: string, friendId: string): number {
  let balance = 0;

  const currentUserGroups = new Set(
    MOCK_GROUP_MEMBERS
      .filter((gm) => gm.user_id === currentUserId)
      .map((gm) => gm.group_id),
  );
  const sharedGroupIds = new Set(
    MOCK_GROUP_MEMBERS
      .filter((gm) => gm.user_id === friendId && currentUserGroups.has(gm.group_id))
      .map((gm) => gm.group_id),
  );

  for (const expense of MOCK_EXPENSES) {
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

  for (const settlement of MOCK_SETTLEMENTS) {
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
  const navigate = useNavigate();
  const friends = getFriendsForUser(MOCK_CURRENT_USER.id);

  const friendsWithBalances: { profile: Profile; balance: number }[] = friends.map((friend) => ({
    profile: friend,
    balance: computeFriendBalance(MOCK_CURRENT_USER.id, friend.id),
  }));

  friendsWithBalances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const totalBalance = friendsWithBalances.reduce((sum, f) => sum + f.balance, 0);

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
          <Card className="rounded-2xl">
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">No friends yet</p>
              <p className="text-sm mt-1">
                Add friends by creating a group together
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
