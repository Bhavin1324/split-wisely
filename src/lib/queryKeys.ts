/**
 * Centralized Type-Safe Query Key Factory for TanStack Query.
 * Follows the official TanStack Query Key Factory pattern:
 * - Deterministic array hierarchies enabling both granular and broad cache invalidations
 * - Strict type safety avoiding typo-induced cache desynchronization
 */

export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    detail: (userId: string | undefined) => [...queryKeys.profile.all, userId] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: (userId: string | undefined) => [...queryKeys.groups.all, 'list', userId] as const,
    detail: (groupId: string | undefined) => [...queryKeys.groups.all, 'detail', groupId] as const,
    members: (groupId: string | undefined) => [...queryKeys.groups.detail(groupId), 'members'] as const,
    activities: (groupId: string | undefined) => [...queryKeys.groups.detail(groupId), 'activities'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    byUser: (userId: string | undefined) => [...queryKeys.expenses.all, 'user', userId] as const,
    byGroup: (groupId: string | undefined) => [...queryKeys.expenses.all, 'group', groupId] as const,
  },
  settlements: {
    all: ['settlements'] as const,
    byUser: (userId: string | undefined) => [...queryKeys.settlements.all, 'user', userId] as const,
    byGroup: (groupId: string | undefined) => [...queryKeys.settlements.all, 'group', groupId] as const,
  },
  personalLedger: {
    all: ['personalLedger'] as const,
    transactions: (userId: string | undefined, monthYear?: string) => 
      [...queryKeys.personalLedger.all, 'transactions', userId, monthYear] as const,
    budget: (userId: string | undefined, monthYear?: string) => 
      [...queryKeys.personalLedger.all, 'budget', userId, monthYear] as const,
  },
  stagedExpenses: {
    all: ['stagedExpenses'] as const,
    pending: (userId: string | undefined) => [...queryKeys.stagedExpenses.all, 'pending', userId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string | undefined) => [...queryKeys.notifications.all, 'list', userId] as const,
  },
  friends: {
    all: ['friends'] as const,
    list: (userId: string | undefined) => [...queryKeys.friends.all, 'list', userId] as const,
  },
} as const;
