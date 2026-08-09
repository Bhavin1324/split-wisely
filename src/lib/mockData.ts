import type { Profile, Group, GroupMember, Category, Expense, Settlement } from '../types';

// -- Mock Users --
export const MOCK_CURRENT_USER: Profile = {
  id: 'user-1',
  full_name: 'Alex Johnson',
  avatar_url: null,
  default_currency: 'INR',
  created_at: '2024-01-01T00:00:00Z',
};

export const MOCK_PROFILES: Profile[] = [
  MOCK_CURRENT_USER,
  { id: 'user-2', full_name: 'Sarah Chen', avatar_url: null, default_currency: 'INR', created_at: '2024-01-01T00:00:00Z' },
  { id: 'user-3', full_name: 'Mike Roberts', avatar_url: null, default_currency: 'INR', created_at: '2024-01-01T00:00:00Z' },
  { id: 'user-4', full_name: 'Emma Wilson', avatar_url: null, default_currency: 'INR', created_at: '2024-01-01T00:00:00Z' },
  { id: 'user-5', full_name: 'David Park', avatar_url: null, default_currency: 'INR', created_at: '2024-01-01T00:00:00Z' },
];

// -- Mock Categories --
export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'General', icon_name: 'TagOutlined' },
  { id: 'cat-2', name: 'Food & Drink', icon_name: 'CoffeeOutlined' },
  { id: 'cat-3', name: 'Transportation', icon_name: 'CarOutlined' },
  { id: 'cat-4', name: 'Entertainment', icon_name: 'SmileOutlined' },
  { id: 'cat-5', name: 'Utilities & Rent', icon_name: 'HomeOutlined' },
  { id: 'cat-6', name: 'Shopping', icon_name: 'ShoppingOutlined' },
];

// -- Mock Groups --
export const MOCK_GROUPS: Group[] = [
  { id: 'group-1', name: 'Weekend Trip to Miami', cover_image_url: null, created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', member_count: 4 },
  { id: 'group-2', name: 'Apartment 4B', cover_image_url: null, created_by: 'user-2', created_at: '2024-01-01T00:00:00Z', member_count: 3 },
  { id: 'group-3', name: 'Office Lunch Club', cover_image_url: null, created_by: 'user-1', created_at: '2024-01-01T00:00:00Z', member_count: 5 },
];

// -- Mock Group Members --
export const MOCK_GROUP_MEMBERS: GroupMember[] = [
  // Group 1: Miami Trip
  { group_id: 'group-1', user_id: 'user-1', joined_at: '2024-06-01T10:00:00Z', profile: MOCK_PROFILES[0] },
  { group_id: 'group-1', user_id: 'user-2', joined_at: '2024-06-01T10:00:00Z', profile: MOCK_PROFILES[1] },
  { group_id: 'group-1', user_id: 'user-3', joined_at: '2024-06-01T10:00:00Z', profile: MOCK_PROFILES[2] },
  { group_id: 'group-1', user_id: 'user-4', joined_at: '2024-06-01T10:00:00Z', profile: MOCK_PROFILES[3] },
  // Group 2: Apartment
  { group_id: 'group-2', user_id: 'user-1', joined_at: '2024-03-01T10:00:00Z', profile: MOCK_PROFILES[0] },
  { group_id: 'group-2', user_id: 'user-2', joined_at: '2024-03-01T10:00:00Z', profile: MOCK_PROFILES[1] },
  { group_id: 'group-2', user_id: 'user-4', joined_at: '2024-03-01T10:00:00Z', profile: MOCK_PROFILES[3] },
  // Group 3: Office Lunch
  { group_id: 'group-3', user_id: 'user-1', joined_at: '2024-07-15T10:00:00Z', profile: MOCK_PROFILES[0] },
  { group_id: 'group-3', user_id: 'user-2', joined_at: '2024-07-15T10:00:00Z', profile: MOCK_PROFILES[1] },
  { group_id: 'group-3', user_id: 'user-3', joined_at: '2024-07-15T10:00:00Z', profile: MOCK_PROFILES[2] },
  { group_id: 'group-3', user_id: 'user-4', joined_at: '2024-07-15T10:00:00Z', profile: MOCK_PROFILES[3] },
  { group_id: 'group-3', user_id: 'user-5', joined_at: '2024-07-15T10:00:00Z', profile: MOCK_PROFILES[4] },
];

// -- Mock Expenses (all amounts in integer cents) --
export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1', group_id: 'group-1', category_id: 'cat-2', description: 'Dinner at Ocean Drive',
    total_amount: 18500, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 18500,
    payer_id: 'user-1', receipt_image_url: null, created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-06-15T19:30:00Z',
    payer: MOCK_PROFILES[0], category: MOCK_CATEGORIES[1],
    splits: [
      { expense_id: 'exp-1', user_id: 'user-1', amount_owed: 4625 },
      { expense_id: 'exp-1', user_id: 'user-2', amount_owed: 4625 },
      { expense_id: 'exp-1', user_id: 'user-3', amount_owed: 4625 },
      { expense_id: 'exp-1', user_id: 'user-4', amount_owed: 4625 },
    ],
  },
  {
    id: 'exp-2', group_id: 'group-1', category_id: 'cat-3', description: 'Uber to South Beach',
    total_amount: 3200, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 3200,
    payer_id: 'user-2', receipt_image_url: null, created_by: 'user-2',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-06-15T14:00:00Z',
    payer: MOCK_PROFILES[1], category: MOCK_CATEGORIES[2],
    splits: [
      { expense_id: 'exp-2', user_id: 'user-1', amount_owed: 800 },
      { expense_id: 'exp-2', user_id: 'user-2', amount_owed: 800 },
      { expense_id: 'exp-2', user_id: 'user-3', amount_owed: 800 },
      { expense_id: 'exp-2', user_id: 'user-4', amount_owed: 800 },
    ],
  },
  {
    id: 'exp-3', group_id: 'group-1', category_id: 'cat-4', description: 'Jet Ski Rental',
    total_amount: 24000, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 24000,
    payer_id: 'user-3', receipt_image_url: null, created_by: 'user-3',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-06-16T11:00:00Z',
    payer: MOCK_PROFILES[2], category: MOCK_CATEGORIES[3],
    splits: [
      { expense_id: 'exp-3', user_id: 'user-1', amount_owed: 6000 },
      { expense_id: 'exp-3', user_id: 'user-2', amount_owed: 6000 },
      { expense_id: 'exp-3', user_id: 'user-3', amount_owed: 6000 },
      { expense_id: 'exp-3', user_id: 'user-4', amount_owed: 6000 },
    ],
  },
  {
    id: 'exp-4', group_id: 'group-2', category_id: 'cat-5', description: 'August Rent',
    total_amount: 300000, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 300000,
    payer_id: 'user-1', receipt_image_url: null, created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-08-01T10:00:00Z',
    payer: MOCK_PROFILES[0], category: MOCK_CATEGORIES[4],
    splits: [
      { expense_id: 'exp-4', user_id: 'user-1', amount_owed: 100000 },
      { expense_id: 'exp-4', user_id: 'user-2', amount_owed: 100000 },
      { expense_id: 'exp-4', user_id: 'user-4', amount_owed: 100000 },
    ],
  },
  {
    id: 'exp-5', group_id: 'group-2', category_id: 'cat-5', description: 'Electric Bill',
    total_amount: 15600, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 15600,
    payer_id: 'user-2', receipt_image_url: null, created_by: 'user-2',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-08-05T10:00:00Z',
    payer: MOCK_PROFILES[1], category: MOCK_CATEGORIES[4],
    splits: [
      { expense_id: 'exp-5', user_id: 'user-1', amount_owed: 5200 },
      { expense_id: 'exp-5', user_id: 'user-2', amount_owed: 5200 },
      { expense_id: 'exp-5', user_id: 'user-4', amount_owed: 5200 },
    ],
  },
  {
    id: 'exp-6', group_id: 'group-3', category_id: 'cat-2', description: 'Pizza Friday',
    total_amount: 6500, currency_code: 'INR', exchange_rate: 1, base_currency_amount: 6500,
    payer_id: 'user-1', receipt_image_url: null, created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z', expense_date: '2024-01-01T00:00:00Z', updated_at: '2024-08-02T12:30:00Z',
    payer: MOCK_PROFILES[0], category: MOCK_CATEGORIES[1],
    splits: [
      { expense_id: 'exp-6', user_id: 'user-1', amount_owed: 1300 },
      { expense_id: 'exp-6', user_id: 'user-2', amount_owed: 1300 },
      { expense_id: 'exp-6', user_id: 'user-3', amount_owed: 1300 },
      { expense_id: 'exp-6', user_id: 'user-4', amount_owed: 1300 },
      { expense_id: 'exp-6', user_id: 'user-5', amount_owed: 1300 },
    ],
  },
];

// -- Mock Settlements --
export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 'settle-1', group_id: 'group-1', payer_id: 'user-4', payee_id: 'user-1',
    amount: 5000, currency_code: 'INR', created_at: '2024-01-01T00:00:00Z',
    payer: MOCK_PROFILES[3], payee: MOCK_PROFILES[0],
  },
];

/** Look up a profile by ID */
export function getProfileById(id: string): Profile | undefined {
  return MOCK_PROFILES.find(p => p.id === id);
}

/** Get friends for a user (all other users in shared groups) */
export function getFriendsForUser(userId: string): Profile[] {
  const friendIds = new Set<string>();
  MOCK_GROUP_MEMBERS.forEach(gm => {
    if (gm.user_id === userId) {
      MOCK_GROUP_MEMBERS
        .filter(other => other.group_id === gm.group_id && other.user_id !== userId)
        .forEach(other => friendIds.add(other.user_id));
    }
  });
  return MOCK_PROFILES.filter(p => friendIds.has(p.id));
}

/** Get groups for a user */
export function getGroupsForUser(userId: string): Group[] {
  const groupIds = MOCK_GROUP_MEMBERS
    .filter(gm => gm.user_id === userId)
    .map(gm => gm.group_id);
  return MOCK_GROUPS.filter(g => groupIds.includes(g.id));
}

/** Get expenses for a group, sorted newest first */
export function getExpensesForGroup(groupId: string): Expense[] {
  return MOCK_EXPENSES.filter(e => e.group_id === groupId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** Get settlements for a group */
export function getSettlementsForGroup(groupId: string): Settlement[] {
  return MOCK_SETTLEMENTS.filter(s => s.group_id === groupId);
}

/** Get group members */
export function getMembersForGroup(groupId: string): GroupMember[] {
  return MOCK_GROUP_MEMBERS.filter(gm => gm.group_id === groupId);
}
