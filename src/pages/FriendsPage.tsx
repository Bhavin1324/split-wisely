import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUPS, MOCK_GROUP_MEMBERS, getFriendsForUser } from '../lib/mockData';
import type { Profile } from '../types';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriendsQuery } from '../hooks/queries/useFriendsQuery';
import { useAllExpensesQuery } from '../hooks/queries/useExpensesQuery';
import { useAllSettlementsQuery } from '../hooks/queries/useSettlementsQuery';
import { computeFriendNetBalance } from '../utils/friendCalculations';
import { AddFriendModal } from '../components/AddFriendModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';

// Modular UI components
import { FriendsHeroCard } from '../components/friends/FriendsHeroCard';
import { FriendsFilterBar, type FriendFilterType } from '../components/friends/FriendsFilterBar';
import { FriendListItem } from '../components/friends/FriendListItem';
import { FriendsEmptyState } from '../components/friends/FriendsEmptyState';

const VALID_FILTERS: FriendFilterType[] = ['all', 'outstanding', 'owes_you', 'you_owe', 'settled'];

export function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawUrlFilter = searchParams.get('filter') as FriendFilterType;
  const initialFilter = VALID_FILTERS.includes(rawUrlFilter) ? rawUrlFilter : 'all';

  const [activeFilter, setActiveFilter] = useState<FriendFilterType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Sync state from URL (handles Back/Forward navigation cleanly)
  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FriendFilterType;
    if (urlFilter && VALID_FILTERS.includes(urlFilter)) {
      setActiveFilter(urlFilter);
    } else if (!urlFilter) {
      setActiveFilter('all');
    }
  }, [searchParams]);

  // Non-destructive URL updates preserving external search params
  const handleFilterChange = useCallback((val: FriendFilterType) => {
    setActiveFilter(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val === 'all') {
        next.delete('filter');
      } else {
        next.set('filter', val);
      }
      return next;
    });
  }, [setSearchParams]);

  // Stable callbacks preventing memoized child re-renders
  const handleSelectFriend = useCallback((friendId: string) => {
    navigate(`/friends/${friendId}`);
  }, [navigate]);

  const handleOpenAddFriend = useCallback(() => {
    setIsAddFriendOpen(true);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    handleFilterChange('all');
  }, [handleFilterChange]);

  // Auth and Supabase Data
  const { user } = useAuth();
  const { currentUser, groups: contextGroups, loading: appLoading } = useAppData();
  const userId = user?.id || currentUser?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { data: liveFriends, loading: friendsLoading, refetch: refetchFriends } = useFriendsQuery(userId);
  const { data: liveExpenses, loading: expensesLoading } = useAllExpensesQuery(userId);
  const { data: liveSettlements, loading: settlementsLoading } = useAllSettlementsQuery(userId);

  const friends = useMemo(() => {
    return DEMO_MODE ? getFriendsForUser(MOCK_CURRENT_USER.id) : (liveFriends || []);
  }, [liveFriends]);

  // Compute 1-on-1 net balance with every friend
  const { friendsWithBalances, totalBalance, totalOwedToYou, totalYouOwe, counts } = useMemo(() => {
    let total = 0;
    let owedToYouSum = 0;
    let youOweSum = 0;
    let owesYouCount = 0;
    let youOweCount = 0;
    let settledCount = 0;

    const list: { profile: Profile; balance: number }[] = friends.map((friend) => {
      const { totalNetBalance } = computeFriendNetBalance({
        userId,
        friendId: friend.id,
        groups: DEMO_MODE ? MOCK_GROUPS : (contextGroups || []),
        allExpenses: DEMO_MODE ? (MOCK_EXPENSES as any) : (liveExpenses || []),
        allSettlements: DEMO_MODE ? (MOCK_SETTLEMENTS as any) : (liveSettlements || []),
        allGroupMembers: DEMO_MODE ? (MOCK_GROUP_MEMBERS as any) : [],
      });

      total += totalNetBalance;
      if (totalNetBalance > 0) {
        owedToYouSum += totalNetBalance;
        owesYouCount++;
      } else if (totalNetBalance < 0) {
        youOweSum += Math.abs(totalNetBalance);
        youOweCount++;
      } else {
        settledCount++;
      }

      return { profile: friend, balance: totalNetBalance };
    });

    // Deterministic sort: magnitude first, alphabetical tie-breaker
    list.sort((a, b) => {
      const diff = Math.abs(b.balance) - Math.abs(a.balance);
      if (diff !== 0) return diff;
      return (a.profile.full_name || '').localeCompare(b.profile.full_name || '');
    });

    return {
      friendsWithBalances: list,
      totalBalance: total,
      totalOwedToYou: owedToYouSum,
      totalYouOwe: youOweSum,
      counts: {
        all: list.length,
        owes_you: owesYouCount,
        you_owe: youOweCount,
        settled: settledCount,
      },
    };
  }, [friends, userId, contextGroups, liveExpenses, liveSettlements]);

  // Apply active filter and deferred search with hoisted query
  const filteredFriends = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return friendsWithBalances.filter(({ profile, balance }) => {
      // Filter tab check
      if (activeFilter === 'outstanding' && balance === 0) return false;
      if (activeFilter === 'owes_you' && balance <= 0) return false;
      if (activeFilter === 'you_owe' && balance >= 0) return false;
      if (activeFilter === 'settled' && balance !== 0) return false;

      // Deferred search text check (hoisted query comparison)
      if (query) {
        const name = (profile.full_name || '').toLowerCase();
        const upi = (profile.upi_id || '').toLowerCase();
        return name.includes(query) || upi.includes(query);
      }

      return true;
    });
  }, [friendsWithBalances, activeFilter, deferredSearchQuery]);

  // Guard all data layers including settlementsLoading to prevent gross debt flashes
  if (appLoading || friendsLoading || expensesLoading || settlementsLoading) {
    return <PageSkeleton layout="friends" />;
  }

  return (
    <div className="space-y-6 pb-32 md:pb-6">
      {/* Calm Conversational Hero Summary Card (hidden on 0 friends to avoid redundancy) */}
      {friends.length > 0 && (
        <FriendsHeroCard
          totalBalance={totalBalance}
          totalOwedToYou={totalOwedToYou}
          totalYouOwe={totalYouOwe}
          countOwedToYou={counts.owes_you}
          countYouOwe={counts.you_owe}
          onAddFriend={handleOpenAddFriend}
        />
      )}

      {/* Filter and Search Pill */}
      {friends.length > 0 && (
        <FriendsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          counts={counts}
        />
      )}

      {/* Friends List or Empty State */}
      {filteredFriends.length > 0 ? (
        <div className="rounded-2xl border border-border-base bg-bg-surface overflow-hidden shadow-xs">
          {filteredFriends.map(({ profile, balance }, index) => (
            <FriendListItem
              key={profile.id}
              friend={profile}
              balance={balance}
              isLast={index === filteredFriends.length - 1}
              onSelectFriend={handleSelectFriend}
            />
          ))}
        </div>
      ) : (
        <FriendsEmptyState
          hasFriends={friends.length > 0}
          searchQuery={searchQuery}
          onClearFilters={handleClearFilters}
          onAddFriend={handleOpenAddFriend}
        />
      )}

      {/* Add Friend Modal with refetch hook */}
      <AddFriendModal
        open={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onSuccess={refetchFriends}
      />
    </div>
  );
}
