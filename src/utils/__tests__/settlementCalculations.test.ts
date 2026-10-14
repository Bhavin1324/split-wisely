import { describe, it, expect } from 'vitest';
import { computeGroupSettlementDebts, computeAllGroupSettlementDebts } from '../settlementCalculations';
import type { Group, Expense, Settlement } from '../../types';
import flatData from '../../__tests__/flatExpenseData.json';

describe('settlementCalculations Utility', () => {
  const ALICE = 'user-alice';
  const BOB = 'user-bob';
  const CHARLIE = 'user-charlie';

  const mockGroupSimplified: Group = {
    id: 'grp-1',
    name: 'Trip Group',
    created_by: ALICE,
    created_at: '2026-08-01T00:00:00Z',
    simplify_debts: true,
  };

  const mockGroupRaw: Group = {
    id: 'grp-2',
    name: 'Office Expenses',
    created_by: ALICE,
    created_at: '2026-08-01T00:00:00Z',
    simplify_debts: false,
  };

  it('correctly simplifies mutual debts when simplify_debts is true', () => {
    // Alice pays 300 for Alice, Bob, Charlie (Bob owes Alice 100, Charlie owes Alice 100)
    // Bob pays 300 for Alice, Bob, Charlie (Alice owes Bob 100, Charlie owes Bob 100)
    // In raw: Bob owes Alice 100, Alice owes Bob 100 (net 0)
    // In simplified: Charlie owes Alice 200 (or Bob 200), mutual debts between Alice and Bob cancel to 0!
    const expenses: Expense[] = [
      {
        id: 'e1',
        group_id: 'grp-1',
        payer_id: ALICE,
        base_currency_amount: 30000,
        total_amount: 30000,
        splits: [
          { user_id: ALICE, amount_owed: 10000 },
          { user_id: BOB, amount_owed: 10000 },
          { user_id: CHARLIE, amount_owed: 10000 },
        ],
      } as any,
      {
        id: 'e2',
        group_id: 'grp-1',
        payer_id: BOB,
        base_currency_amount: 30000,
        total_amount: 30000,
        splits: [
          { user_id: ALICE, amount_owed: 10000 },
          { user_id: BOB, amount_owed: 10000 },
          { user_id: CHARLIE, amount_owed: 10000 },
        ],
      } as any,
    ];

    const result = computeGroupSettlementDebts({
      group: mockGroupSimplified,
      expenses,
      settlements: [],
      payerId: BOB,
      payeeId: ALICE,
    });

    expect(result.isSimplified).toBe(true);
    expect(result.payerOwesPayeeCents).toBe(0);
    expect(result.payeeOwesPayerCents).toBe(0);
  });

  it('correctly calculates raw bilateral debts when simplify_debts is false', () => {
    // Alice pays 100 for Bob -> Bob owes Alice 100
    // Charlie pays 50 for Bob -> Bob owes Charlie 50
    // In raw mode, Bob owes Alice 100 regardless of Charlie
    const expenses: Expense[] = [
      {
        id: 'e1',
        group_id: 'grp-2',
        payer_id: ALICE,
        base_currency_amount: 10000,
        total_amount: 10000,
        splits: [
          { user_id: BOB, amount_owed: 10000 },
        ],
      } as any,
      {
        id: 'e2',
        group_id: 'grp-2',
        payer_id: CHARLIE,
        base_currency_amount: 5000,
        total_amount: 5000,
        splits: [
          { user_id: BOB, amount_owed: 5000 },
        ],
      } as any,
    ];

    const result = computeGroupSettlementDebts({
      group: mockGroupRaw,
      expenses,
      settlements: [],
      payerId: BOB,
      payeeId: ALICE,
    });

    expect(result.isSimplified).toBe(false);
    expect(result.payerOwesPayeeCents).toBe(10000);
    expect(result.payeeOwesPayerCents).toBe(0);
  });

  it('verifies exact mathematical match on real Flat expenses data', () => {
    const BARBERRION = '3069d317-c51a-40b2-b268-428e663c61f1';
    const JIGAR = '6b83bd72-e1ab-45b3-946f-6f2bdb55987a';

    const flatGroupSimplified: Group = {
      id: '4ebe0615-7df1-44d4-aba7-95b2a79fcb57',
      name: 'Flat expenses',
      created_by: BARBERRION,
      created_at: '2026-08-01T00:00:00Z',
      simplify_debts: true,
    };

    const flatGroupRaw: Group = {
      ...flatGroupSimplified,
      simplify_debts: false,
    };

    // 1. Simplified mode: Jigar owes Barberrion ₹21.16
    const simplifiedResult = computeGroupSettlementDebts({
      group: flatGroupSimplified,
      expenses: flatData.expenses as any,
      settlements: flatData.settlements as any,
      payerId: JIGAR,
      payeeId: BARBERRION,
    });

    expect(simplifiedResult.isSimplified).toBe(true);
    expect(simplifiedResult.payerOwesPayeeCents).toBe(2116); // ₹21.16!
    expect(simplifiedResult.payeeOwesPayerCents).toBe(0);

    // 2. Raw mode: Jigar owes Barberrion ₹516.26
    const rawResult = computeGroupSettlementDebts({
      group: flatGroupRaw,
      expenses: flatData.expenses as any,
      settlements: flatData.settlements as any,
      payerId: JIGAR,
      payeeId: BARBERRION,
    });

    expect(rawResult.isSimplified).toBe(false);
    expect(rawResult.payerOwesPayeeCents).toBe(51626); // ₹516.26!
    expect(rawResult.payeeOwesPayerCents).toBe(0);
  });
});
