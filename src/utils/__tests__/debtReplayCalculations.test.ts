import { describe, it, expect } from 'vitest';
import { calculateGroupReplayData } from '../debtReplayCalculations';

describe('Debt Replay Calculations', () => {
  it('correctly builds step-by-step chronological replay and settlement resolution for 4-member group', () => {
    const groupId = '4ebe0615-7df1-44d4-aba7-95b2a79fcb57';
    const jaiminId = 'user-jaimin';
    const barberrionId = 'user-barberrion';
    const jigarId = 'user-jigar';
    const akarshId = 'user-akarsh';

    const groupMembers = [jaiminId, barberrionId, jigarId, akarshId];

    const profilesMap = {
      [jaiminId]: { id: jaiminId, full_name: 'Jaimin Bhatt', avatar_url: null },
      [barberrionId]: { id: barberrionId, full_name: 'Barberrion King', avatar_url: null },
      [jigarId]: { id: jigarId, full_name: 'Patel jigar', avatar_url: null },
      [akarshId]: { id: akarshId, full_name: 'Akarsh', avatar_url: null },
    };

    const expenses = [
      {
        id: 'exp-1',
        payer_id: jaiminId,
        description: 'Chole + manchurian',
        total_amount: 27800,
        expense_date: '2026-08-01T10:00:00Z',
        splits: [
          { user_id: barberrionId, amount_owed: 13900 },
          { user_id: jaiminId, amount_owed: 13900 },
        ],
      },
      {
        id: 'exp-2',
        payer_id: jigarId,
        description: 'Tel',
        total_amount: 11000,
        expense_date: '2026-08-02T10:00:00Z',
        splits: [
          { user_id: barberrionId, amount_owed: 3667 },
          { user_id: jaiminId, amount_owed: 3667 },
          { user_id: jigarId, amount_owed: 3666 },
        ],
      },
      {
        id: 'exp-3',
        payer_id: barberrionId,
        description: 'Train ticket',
        total_amount: 8245,
        expense_date: '2026-08-03T10:00:00Z',
        splits: [
          { user_id: jigarId, amount_owed: 8245 },
        ],
      },
      {
        id: 'exp-4',
        payer_id: barberrionId,
        description: 'Handwash refill',
        total_amount: 5000,
        expense_date: '2026-08-04T10:00:00Z',
        splits: [
          { user_id: barberrionId, amount_owed: 1250 },
          { user_id: jaiminId, amount_owed: 1250 },
          { user_id: jigarId, amount_owed: 1250 },
          { user_id: akarshId, amount_owed: 1250 },
        ],
      },
    ];

    const replay = calculateGroupReplayData({
      userId: jaiminId,
      groupId,
      groupName: 'Flat 402',
      groupMembers,
      expenses,
      settlements: [],
      profilesMap,
    });

    expect(replay.expenseSteps.length).toBe(4);

    // Step 1: Chole + manchurian (Jaimin paid 27800, share 13900 -> balance becomes +13900)
    const step1 = replay.expenseSteps[0];
    expect(step1.previousBalanceCents).toBe(0);
    expect(step1.newBalanceCents).toBe(13900);
    expect(step1.deltaCents).toBe(13900);
    expect(step1.isUserInvolved).toBe(true);

    // Step 2: Tel (Jigar paid, Jaimin share 3667 -> balance becomes 13900 - 3667 = 10233)
    const step2 = replay.expenseSteps[1];
    expect(step2.previousBalanceCents).toBe(13900);
    expect(step2.newBalanceCents).toBe(10233);
    expect(step2.deltaCents).toBe(-3667);

    // Step 3: Train ticket (Barberrion paid for Jigar -> Jaimin not involved, balance remains 10233)
    const step3 = replay.expenseSteps[2];
    expect(step3.previousBalanceCents).toBe(10233);
    expect(step3.newBalanceCents).toBe(10233);
    expect(step3.isUserInvolved).toBe(false);

    // Step 4: Handwash (Barberrion paid, Jaimin share 1250 -> balance becomes 10233 - 1250 = 8983)
    const step4 = replay.expenseSteps[3];
    expect(step4.previousBalanceCents).toBe(10233);
    expect(step4.newBalanceCents).toBe(8983);

    // Final Tallies Invariant
    expect(replay.finalTallies.length).toBe(4);
    const jaiminTally = replay.finalTallies.find(t => t.userId === jaiminId);
    expect(jaiminTally?.netBalanceCents).toBe(8983);

    // Settlement Resolution Invariant: After final settlement step, all balances must reach 0
    expect(replay.settlementSteps.length).toBeGreaterThan(0);
    const lastStep = replay.settlementSteps[replay.settlementSteps.length - 1];
    Object.values(lastStep.remainingBalancesAfter).forEach(bal => {
      expect(bal).toBe(0);
    });
  });
});
