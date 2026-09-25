import { describe, it, expect } from 'vitest';
import { calculateAnalyticsSummary } from '../../../utils/analyticsCalculations';
import type { Expense, Group } from '../../../types';

describe('friendCoverageCalculations', () => {
  const currentUserId = 'user-barberrion';
  const jigarId = 'user-jigar';
  const jaiminId = 'user-jaimin';

  const mockGroups: Group[] = [
    {
      id: 'grp-flat',
      name: 'Flat expenses',
      cover_image_url: null,
      created_by: currentUserId,
      created_at: '2026-08-01T00:00:00Z',
    },
  ];

  it('correctly maps YOU_COVERED items when the current user pays for a friend', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        group_id: 'grp-flat',
        category_id: null,
        description: 'Train booking',
        total_amount: 13725, // ₹137.25
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 13725,
        payer_id: currentUserId,
        created_by: currentUserId,
        expense_date: '2026-09-25T10:00:00Z',
        created_at: '2026-09-25T10:00:00Z',
        updated_at: '2026-09-25T10:00:00Z',
        receipt_image_url: null,
        splits: [
          {
            expense_id: 'exp-1',
            user_id: jigarId,
            amount_owed: 13725,
            user: {
              id: jigarId,
              full_name: 'Patel jigar',
              avatar_url: null,
              default_currency: 'INR',
              created_at: '2026-08-01T00:00:00Z',
            },
          },
        ],
      },
    ];

    const summary = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-09', weekStart: '2026-09-21' },
      liveExpenses: expenses,
      personalTransactions: [],
      budget: null,
      categories: [],
      groups: mockGroups,
      userId: currentUserId,
    });

    expect(summary.friendInteractions).toHaveLength(1);
    const jigarInteraction = summary.friendInteractions[0];
    expect(jigarInteraction.friendId).toBe(jigarId);
    expect(jigarInteraction.friendName).toBe('Patel jigar');
    expect(jigarInteraction.totalPaidForFriend).toBe(13725);
    expect(jigarInteraction.totalPaidByFriend).toBe(0);
    expect(jigarInteraction.netFlow).toBe(13725);
    expect(jigarInteraction.items).toHaveLength(1);

    const item = jigarInteraction.items[0];
    expect(item.description).toBe('Train booking');
    expect(item.amountCents).toBe(13725);
    expect(item.direction).toBe('YOU_COVERED');
    expect(item.groupName).toBe('Flat expenses');
  });

  it('correctly maps FRIEND_COVERED items when a friend pays for the current user', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-2',
        group_id: 'grp-flat',
        category_id: null,
        description: 'House rent',
        total_amount: 1700000, // ₹17,000.00
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 1700000,
        payer_id: jaiminId,
        created_by: jaiminId,
        expense_date: '2026-09-06T10:00:00Z',
        created_at: '2026-09-06T10:00:00Z',
        updated_at: '2026-09-06T10:00:00Z',
        receipt_image_url: null,
        payer: {
          id: jaiminId,
          full_name: 'Jaimin Bhatt',
          avatar_url: null,
          default_currency: 'INR',
          created_at: '2026-08-01T00:00:00Z',
        },
        splits: [
          {
            expense_id: 'exp-2',
            user_id: currentUserId,
            amount_owed: 383333, // ₹3,833.33
          },
          {
            expense_id: 'exp-2',
            user_id: jigarId,
            amount_owed: 383333,
          },
        ],
      },
    ];

    const summary = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-09', weekStart: '2026-09-21' },
      liveExpenses: expenses,
      personalTransactions: [],
      budget: null,
      categories: [],
      groups: mockGroups,
      userId: currentUserId,
    });

    expect(summary.friendInteractions).toHaveLength(1);
    const jaiminInteraction = summary.friendInteractions[0];
    expect(jaiminInteraction.friendId).toBe(jaiminId);
    expect(jaiminInteraction.friendName).toBe('Jaimin Bhatt');
    expect(jaiminInteraction.totalPaidForFriend).toBe(0);
    expect(jaiminInteraction.totalPaidByFriend).toBe(383333);
    expect(jaiminInteraction.netFlow).toBe(-383333);
    expect(jaiminInteraction.items).toHaveLength(1);

    const item = jaiminInteraction.items[0];
    expect(item.description).toBe('House rent');
    expect(item.amountCents).toBe(383333);
    expect(item.direction).toBe('FRIEND_COVERED');
    expect(item.groupName).toBe('Flat expenses');
  });

  it('aggregates bidirectional items with exact sum equivalence and date sorting', () => {
    const expenses: Expense[] = [
      // 1. Current user paid for Jigar on Sep 25
      {
        id: 'exp-train',
        group_id: 'grp-flat',
        category_id: null,
        description: 'Train booking',
        total_amount: 13725,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 13725,
        payer_id: currentUserId,
        created_by: currentUserId,
        expense_date: '2026-09-25T08:00:00Z',
        created_at: '2026-09-25T08:00:00Z',
        updated_at: '2026-09-25T08:00:00Z',
        receipt_image_url: null,
        splits: [
          {
            expense_id: 'exp-train',
            user_id: jigarId,
            amount_owed: 13725,
            user: {
              id: jigarId,
              full_name: 'Patel jigar',
              avatar_url: null,
              default_currency: 'INR',
              created_at: '2026-08-01T00:00:00Z',
            },
          },
        ],
      },
      // 2. Jigar paid for Current user on Sep 02 (D-Mart)
      {
        id: 'exp-dmart',
        group_id: 'grp-flat',
        category_id: null,
        description: 'D-MART Ration',
        total_amount: 73841,
        currency_code: 'INR',
        exchange_rate: 1,
        base_currency_amount: 73841,
        payer_id: jigarId,
        created_by: jigarId,
        expense_date: '2026-09-02T12:00:00Z',
        created_at: '2026-09-02T12:00:00Z',
        updated_at: '2026-09-02T12:00:00Z',
        receipt_image_url: null,
        payer: {
          id: jigarId,
          full_name: 'Patel jigar',
          avatar_url: null,
          default_currency: 'INR',
          created_at: '2026-08-01T00:00:00Z',
        },
        splits: [
          {
            expense_id: 'exp-dmart',
            user_id: currentUserId,
            amount_owed: 24614,
          },
        ],
      },
    ];

    const summary = calculateAnalyticsSummary({
      period: { mode: 'Monthly', monthYear: '2026-09', weekStart: '2026-09-21' },
      liveExpenses: expenses,
      personalTransactions: [],
      budget: null,
      categories: [],
      groups: mockGroups,
      userId: currentUserId,
    });

    const jigar = summary.friendInteractions.find((f) => f.friendId === jigarId)!;
    expect(jigar).toBeDefined();
    expect(jigar.totalPaidForFriend).toBe(13725);
    expect(jigar.totalPaidByFriend).toBe(24614);
    expect(jigar.netFlow).toBe(13725 - 24614);
    expect(jigar.totalVolume).toBe(13725 + 24614);

    // Verify items
    expect(jigar.items).toHaveLength(2);
    // Newest first
    expect(jigar.items[0].description).toBe('Train booking');
    expect(jigar.items[0].direction).toBe('YOU_COVERED');
    expect(jigar.items[1].description).toBe('D-MART Ration');
    expect(jigar.items[1].direction).toBe('FRIEND_COVERED');

    // Mathematical identity checks
    const sumYouCovered = jigar.items
      .filter((i) => i.direction === 'YOU_COVERED')
      .reduce((s, i) => s + i.amountCents, 0);
    expect(sumYouCovered).toBe(jigar.totalPaidForFriend);

    const sumFriendCovered = jigar.items
      .filter((i) => i.direction === 'FRIEND_COVERED')
      .reduce((s, i) => s + i.amountCents, 0);
    expect(sumFriendCovered).toBe(jigar.totalPaidByFriend);
  });
});
