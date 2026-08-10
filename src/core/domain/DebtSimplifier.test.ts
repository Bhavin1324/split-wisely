import { describe, it, expect } from 'vitest';
import { DebtSimplifier, DebtExpense, DebtSettlement, DebtGroupMember } from './DebtSimplifier';

describe('DebtSimplifier - calculateIndividualDebts vs simplifyDebts', () => {
  it('should correctly handle a simple A pays for B scenario', () => {
    const groupMembers: DebtGroupMember[] = [{ user_id: 'A' }, { user_id: 'B' }];
    const expenses: DebtExpense[] = [
      {
        payer_id: 'A',
        base_currency_amount: 100,
        splits: [
          { user_id: 'A', amount_owed: 50 },
          { user_id: 'B', amount_owed: 50 },
        ]
      }
    ];
    const settlements: DebtSettlement[] = [];

    const individual = DebtSimplifier.calculateIndividualDebts(expenses, settlements, groupMembers);
    const simplified = DebtSimplifier.simplifyDebts(expenses, settlements, groupMembers);

    expect(individual).toEqual([{ from: 'B', to: 'A', amount: 50 }]);
    expect(simplified).toEqual([{ from: 'B', to: 'A', amount: 50 }]);
  });

  it('should demonstrate difference between individual and simplified with A->B->C', () => {
    const groupMembers: DebtGroupMember[] = [{ user_id: 'A' }, { user_id: 'B' }, { user_id: 'C' }];
    const expenses: DebtExpense[] = [
      // A pays for B (B owes A 100)
      {
        payer_id: 'A',
        base_currency_amount: 100,
        splits: [{ user_id: 'B', amount_owed: 100 }]
      },
      // B pays for C (C owes B 100)
      {
        payer_id: 'B',
        base_currency_amount: 100,
        splits: [{ user_id: 'C', amount_owed: 100 }]
      }
    ];
    const settlements: DebtSettlement[] = [];

    const individual = DebtSimplifier.calculateIndividualDebts(expenses, settlements, groupMembers);
    const simplified = DebtSimplifier.simplifyDebts(expenses, settlements, groupMembers);

    // Individual should preserve A->B and B->C
    expect(individual).toEqual(expect.arrayContaining([
      { from: 'B', to: 'A', amount: 100 },
      { from: 'C', to: 'B', amount: 100 }
    ]));
    expect(individual.length).toBe(2);

    // Simplified should shortcut to C->A
    expect(simplified).toEqual([{ from: 'C', to: 'A', amount: 100 }]);
  });

  it('should handle complex cross-debts in individual correctly', () => {
    const groupMembers: DebtGroupMember[] = [{ user_id: 'A' }, { user_id: 'B' }];
    const expenses: DebtExpense[] = [
      // A pays for B: 50
      { payer_id: 'A', base_currency_amount: 50, splits: [{ user_id: 'B', amount_owed: 50 }] },
      // B pays for A: 30
      { payer_id: 'B', base_currency_amount: 30, splits: [{ user_id: 'A', amount_owed: 30 }] }
    ];
    
    // In individual, between two people it should net out
    const individual = DebtSimplifier.calculateIndividualDebts(expenses, [], groupMembers);
    const simplified = DebtSimplifier.simplifyDebts(expenses, [], groupMembers);

    expect(individual).toEqual([{ from: 'B', to: 'A', amount: 20 }]);
    expect(simplified).toEqual([{ from: 'B', to: 'A', amount: 20 }]);
  });

  it('should take settlements into account for individual debts', () => {
    const groupMembers: DebtGroupMember[] = [{ user_id: 'A' }, { user_id: 'B' }];
    const expenses: DebtExpense[] = [
      { payer_id: 'A', base_currency_amount: 100, splits: [{ user_id: 'B', amount_owed: 100 }] }
    ];
    const settlements: DebtSettlement[] = [
      { payer_id: 'B', payee_id: 'A', amount: 60 }
    ];

    const individual = DebtSimplifier.calculateIndividualDebts(expenses, settlements, groupMembers);
    expect(individual).toEqual([{ from: 'B', to: 'A', amount: 40 }]);
  });

  it('should handle circular debts A->B->C->A', () => {
    const groupMembers: DebtGroupMember[] = [{ user_id: 'A' }, { user_id: 'B' }, { user_id: 'C' }];
    const expenses: DebtExpense[] = [
      { payer_id: 'A', base_currency_amount: 100, splits: [{ user_id: 'B', amount_owed: 100 }] },
      { payer_id: 'B', base_currency_amount: 100, splits: [{ user_id: 'C', amount_owed: 100 }] },
      { payer_id: 'C', base_currency_amount: 100, splits: [{ user_id: 'A', amount_owed: 100 }] },
    ];

    const individual = DebtSimplifier.calculateIndividualDebts(expenses, [], groupMembers);
    const simplified = DebtSimplifier.simplifyDebts(expenses, [], groupMembers);

    // Individual maintains the strict 1-to-1 ledger (doesn't optimize cross-user)
    expect(individual).toEqual(expect.arrayContaining([
      { from: 'B', to: 'A', amount: 100 },
      { from: 'C', to: 'B', amount: 100 },
      { from: 'A', to: 'C', amount: 100 }
    ]));
    expect(individual.length).toBe(3);

    // Simplified detects everyone's net balance is 0 and returns empty
    expect(simplified.length).toBe(0);
  });
});
