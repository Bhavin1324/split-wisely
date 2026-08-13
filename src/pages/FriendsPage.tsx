import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Button, Segmented, Switch } from 'antd';
import { UserPlus } from 'lucide-react';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUPS, MOCK_GROUP_MEMBERS, getFriendsForUser } from '../lib/mockData';
import { formatCents, getBalanceColorClass } from '../utils/currency';
import type { Profile } from '../types';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/supabase/useProfileData';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { useAllSettlements } from '../hooks/supabase/useSettlementsData';
import { AddFriendModal } from '../components/AddFriendModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import { computeFriendNetBalance } from '../utils/friendCalculations';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'outstanding' | 'you_owe' | 'owes_you'>('all');
  const [showSettled, setShowSettled] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUser, groups: contextGroups } = useAppData();
  
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { loading: appLoading } = useAppData();
  const { data: liveFriends, loading: friendsLoading } = useFriends(user?.id);
  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(user?.id);
  const { data: liveSettlements } = useAllSettlements(user?.id);

  const friends = DEMO_MODE ? getFriendsForUser(MOCK_CURRENT_USER.id) : (liveFriends || []);

  const friendsWithBalances: { profile: Profile; balance: number }[] = friends.map((friend) => {
    const { totalNetBalance } = computeFriendNetBalance({
      userId,
      friendId: friend.id,
      groups: DEMO_MODE ? MOCK_GROUPS : (contextGroups || []),
      allExpenses: DEMO_MODE ? (MOCK_EXPENSES as any) : (liveExpenses || []),
      allSettlements: DEMO_MODE ? (MOCK_SETTLEMENTS as any) : (liveSettlements || []),
      allGroupMembers: DEMO_MODE ? (MOCK_GROUP_MEMBERS as any) : [],
    });

    return {
      profile: friend,
      balance: totalNetBalance,
    };
  });

  friendsWithBalances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const totalBalance = friendsWithBalances.reduce((sum, f) => sum + f.balance, 0);

  const filteredFriends = friendsWithBalances.filter(({ balance }) => {
    if (activeFilter === 'outstanding') return balance !== 0;
    if (activeFilter === 'you_owe') return balance < 0;
    if (activeFilter === 'owes_you') return balance > 0;
    if (!showSettled && balance === 0) return false;
    return true;
  });

  if (appLoading || friendsLoading || expensesLoading) {
    return <PageSkeleton layout="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Friends</h1>
          <p className="text-sm text-text-muted mt-1">
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted uppercase tracking-wide">Overall balance</p>
          <p className={`text-xl font-semibold font-financial ${getBalanceColorClass(totalBalance)}`}>
            {totalBalance > 0 ? '+' : ''}{formatCents(totalBalance)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-primary-500/10 p-4 rounded-xl border border-primary-500/20">
        <p className="text-sm text-primary-500 font-medium">Add friends to split bills more easily.</p>
        <Button
          type="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddFriendOpen(true)}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
        >
          Add Friend
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-base pb-3">
        <div className="overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Segmented
            options={[
              { label: 'All', value: 'all' },
              { label: 'Outstanding', value: 'outstanding' },
              { label: 'You Owe', value: 'you_owe' },
              { label: 'Owes You', value: 'owes_you' },
            ]}
            value={activeFilter}
            onChange={(val) => setActiveFilter(val as any)}
            className="bg-bg-subtle p-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-text-muted font-medium">Show Settled Friends</span>
          <Switch
            size="small"
            checked={showSettled}
            onChange={setShowSettled}
          />
        </div>
      </div>

      {/* Friends list */}
      <div className="grid gap-3">
        {filteredFriends.map(({ profile, balance }) => (
          <Card
            key={profile.id}
            size="small"
            onClick={() => navigate(`/friends/${profile.id}`)}
            className="hover:shadow-md transition-shadow cursor-pointer rounded-xl border-border-base bg-bg-surface"
          >
            <div className="flex items-center gap-4">
              <Avatar
                size={48}
                style={{ backgroundColor: getAvatarColor(profile.id), flexShrink: 0 }}
              >
                {getInitials(profile.full_name)}
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-base truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-text-muted">
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

        {filteredFriends.length === 0 && (
          <Card className="rounded-2xl border-dashed border-2 border-border-base bg-bg-surface">
            <div className="text-center py-12 text-text-muted">
              <div className="mx-auto w-12 h-12 bg-bg-base rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-text-base">
                {friends.length === 0 ? "No friends yet" : "No friends match this filter"}
              </p>
              <p className="text-sm mt-1 mb-6">
                {friends.length === 0
                  ? "Add friends by creating a group together or inviting them directly"
                  : "Try clearing filters or enabling 'Show Settled Friends'"}
              </p>
              {friends.length === 0 && (
                <Button
                  type="primary"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => setIsAddFriendOpen(true)}
                  className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
                >
                  Add Friend
                </Button>
              )}
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
