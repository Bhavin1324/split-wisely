import { describe, it, expect } from 'vitest';
import { DebtSimplifier } from './DebtSimplifier';
import type { Expense, GroupMember } from './DebtSimplifier';

describe('DebtSimplifier', () => {
  it('should simplify debts correctly', () => {
    const groupMembers: GroupMember[] = [
      { user_id: 'A' },
      { user_id: 'B' },
      { user_id: 'C' }
    ];

    // A paid 300, split equally (A owes 100, B owes 100, C owes 100)
    // B paid 150, split equally (A owes 50, B owes 50, C owes 50)
    // Balances:
    // A: +300 - 100 - 50 = +150
    // B: +150 - 100 - 50 = 0
    // C: 0 - 100 - 50 = -150

    const expenses: Expense[] = [
      {
        id: 'e1',
        payer_id: 'A',
        base_currency_amount: 300,
        splits: [
          { user_id: 'A', amount_owed: 100 },
          { user_id: 'B', amount_owed: 100 },
          { user_id: 'C', amount_owed: 100 }
        ]
      },
      {
        id: 'e2',
        payer_id: 'B',
        base_currency_amount: 150,
        splits: [
          { user_id: 'A', amount_owed: 50 },
          { user_id: 'B', amount_owed: 50 },
          { user_id: 'C', amount_owed: 50 }
        ]
      }
    ];

    const result = DebtSimplifier.simplifyDebts(expenses, [], groupMembers);

    expect(result).toEqual([
      { from: 'C', to: 'A', amount: 150 }
    ]);
  });
});
