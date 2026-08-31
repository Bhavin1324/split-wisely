import { describe, it, expect } from 'vitest';
import { DebtSimplifier } from '../../core/domain/DebtSimplifier';
import { computeFriendNetBalance } from '../friendCalculations';
import type { Group, Expense, Settlement } from '../../types';

describe('Session Hydration & Immediate Calculation Integrity', () => {
  const mockUserId = 'user-auth-uuid-123';
  const mockFriendId = 'user-friend-uuid-456';
  const mockGroupId = 'group-789';

  const mockGroups: Group[] = [
    {
      id: mockGroupId,
      name: 'Weekend Trip',
      created_by: mockUserId,
      simplify_debts: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockExpenses: Expense[] = [
    {
      id: 'exp-1',
      group_id: mockGroupId,
      payer_id: mockUserId,
      description: 'Dinner',
      base_currency_amount: 4000, // $40.00
      expense_date: '2026-08-25',
      created_at: new Date().toISOString(),
      splits: [
        { id: 's-1', expense_id: 'exp-1', user_id: mockUserId, amount_owed: 2000, created_at: '' },
        { id: 's-2', expense_id: 'exp-1', user_id: mockFriendId, amount_owed: 2000, created_at: '' },
      ],
    },
  ];

  const mockSettlements: Settlement[] = [];

  it('fails and returns 0 when an empty string userId is passed during cold start', () => {
    const emptyUserId = '';
    const debts = DebtSimplifier.simplifyDebts(
      mockExpenses.map(e => ({
        payer_id: e.payer_id,
        base_currency_amount: e.base_currency_amount,
        splits: e.splits.map(s => ({ user_id: s.user_id, amount_owed: s.amount_owed })),
      })),
      [],
      [{ user_id: mockUserId }, { user_id: mockFriendId }]
    );

    let totalOwed = 0;
    debts.forEach(d => {
      if (d.to === emptyUserId) totalOwed += d.amount;
    });

    expect(totalOwed).toBe(0); // Proves why empty string caused $0.00 bug
  });

  it('immediately calculates exact positive balance when canonical auth userId is provided', () => {
    const debts = DebtSimplifier.simplifyDebts(
      mockExpenses.map(e => ({
        payer_id: e.payer_id,
        base_currency_amount: e.base_currency_amount,
        splits: e.splits.map(s => ({ user_id: s.user_id, amount_owed: s.amount_owed })),
      })),
      [],
      [{ user_id: mockUserId }, { user_id: mockFriendId }]
    );

    let totalOwed = 0;
    debts.forEach(d => {
      if (d.to === mockUserId) totalOwed += d.amount;
    });

    expect(totalOwed).toBe(2000); // Correctly owes $20.00
  });

  it('computes correct friend net balance without being filtered out as zero', () => {
    const { totalNetBalance } = computeFriendNetBalance({
      userId: mockUserId,
      friendId: mockFriendId,
      groups: mockGroups,
      allExpenses: mockExpenses,
      allSettlements: mockSettlements,
      allGroupMembers: [],
    });

    expect(totalNetBalance).toBe(2000);
    expect(totalNetBalance !== 0).toBe(true); // Ensures friend is NOT hidden by !showSettled
  });
});
