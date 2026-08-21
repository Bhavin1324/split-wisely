import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Segmented, Switch } from 'antd';
import { UserPlus, ChevronRight } from 'lucide-react';
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
import { UserAvatar } from '../components/ui/UserAvatar';
import { computeFriendNetBalance } from '../utils/friendCalculations';

function getBalanceLabel(balance: number, friendName: string): string {
  if (balance > 0) return `${friendName} owes you`;
  if (balance < 0) return `You owe ${friendName}`;
  return 'Settled up';
}

type FilterType = 'all' | 'outstanding' | 'you_owe' | 'owes_you';

export function FriendsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';

  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    ['all', 'outstanding', 'you_owe', 'owes_you'].includes(initialFilter) ? initialFilter : 'all'
  );
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FilterType;
    if (urlFilter && ['all', 'outstanding', 'you_owe', 'owes_you'].includes(urlFilter)) {
      setActiveFilter(urlFilter);
    }
  }, [searchParams]);

  const handleFilterChange = (val: FilterType) => {
    setActiveFilter(val);
    if (val === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ filter: val });
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-base mb-0">Friends</h1>
          <p className="text-sm text-text-muted mt-0.5 mb-0">
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-0">Overall balance</p>
            <p className={`text-lg sm:text-xl font-bold font-financial mb-0 ${getBalanceColorClass(totalBalance)}`}>
              {totalBalance > 0 ? '+' : ''}{formatCents(totalBalance)}
            </p>
          </div>
          <Button
            type="primary"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsAddFriendOpen(true)}
            className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm flex items-center gap-1.5 shrink-0"
          >
            Add Friend
          </Button>
        </div>
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
            onChange={(val) => handleFilterChange(val as any)}
            className="bg-bg-subtle p-1 text-xs self-start rounded-xl border border-border-base"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-text-muted font-medium">Show Settled Friends</span>
          <Switch
            size="default"
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
            className="group hover:shadow-md transition-shadow cursor-pointer rounded-xl border-border-base bg-bg-surface"
          >
            <div className="flex items-center gap-4">
              <UserAvatar user={profile} size={48} />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-base truncate mb-0.5">
                  {profile.full_name}
                </p>
                <p className="text-xs text-text-muted mb-0">
                  {getBalanceLabel(balance, profile.full_name.split(' ')[0])}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className={`text-base sm:text-lg font-bold font-financial mb-0 ${getBalanceColorClass(balance)}`}>
                    {balance === 0
                      ? formatCents(0)
                      : `${balance > 0 ? '+' : ''}${formatCents(balance)}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Card>
        ))}

        {filteredFriends.length === 0 && (
          <Card className="rounded-2xl border-dashed border-2 border-border-base bg-bg-surface">
            <div className="text-center py-12 text-text-muted">
              <div className="mx-auto w-12 h-12 bg-bg-base rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-text-muted" />
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
