import { describe, it, expect } from 'vitest';
import { calculateGroupDebtVisualization } from '../debtVisualizerCalculations';

describe('Debt Visualizer Calculations', () => {
  it('correctly calculates the 4-member group debt story (Jaimin, Barberrion, Jigar, Akarsh)', () => {
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

    // Realistic expenses matching the live group
    const expenses = [
      {
        id: 'exp-1',
        payer_id: jaiminId,
        description: 'Chole + manchurian',
        total_amount: 27800,
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
        splits: [
          { user_id: jigarId, amount_owed: 8245 },
        ],
      },
      {
        id: 'exp-4',
        payer_id: barberrionId,
        description: 'Handwash refill',
        total_amount: 5000,
        splits: [
          { user_id: barberrionId, amount_owed: 1250 },
          { user_id: jaiminId, amount_owed: 1250 },
          { user_id: jigarId, amount_owed: 1250 },
          { user_id: akarshId, amount_owed: 1250 },
        ],
      },
      {
        id: 'exp-5',
        payer_id: jaiminId,
        description: 'Sunday alupuri',
        total_amount: 27000,
        splits: [
          { user_id: barberrionId, amount_owed: 12000 },
          { user_id: jaiminId, amount_owed: 15000 },
        ],
      },
    ];

    const result = calculateGroupDebtVisualization({
      groupId,
      groupMembers,
      expenses,
      settlements: [],
      profilesMap,
    });

    expect(result.groupId).toBe(groupId);
    expect(result.members.length).toBe(4);

    // Invariant 1: Direct Net Balance must exactly equal Simplified Net Balance for all members
    groupMembers.forEach((uid) => {
      const story = result.userStories[uid];
      expect(story).toBeDefined();
      expect(story.directNetBalanceCents).toBe(story.simplifiedNetBalanceCents);
      expect(story.shortcutExplanation.length).toBeGreaterThan(10);
    });

    // Invariant 2: Zero-Sum Board strictly equals 0 cents
    expect(result.zeroSumBoard.netSumCents).toBe(0);
    expect(result.zeroSumBoard.totalCreditorsCents).toBe(result.zeroSumBoard.totalDebtorsCents);
    expect(result.zeroSumBoard.tallies.length).toBe(4);

    // Stage 1: Receipt Accumulation checks for Jaimin
    const jaiminStory = result.userStories[jaiminId];
    expect(jaiminStory.receiptAccumulation.totalPaidCents).toBe(27800 + 27000); // 54800
    expect(jaiminStory.receiptAccumulation.totalConsumedCents).toBe(13900 + 3667 + 1250 + 15000); // 33817
    expect(jaiminStory.receiptAccumulation.netTakeHomeCents).toBe(54800 - 33817);

    // Stage 2: Pairwise offsets check (Jaimin vs Barberrion)
    const jaiminBarberrionOffset = jaiminStory.pairwiseOffsets.find((p) => p.friendId === barberrionId);
    expect(jaiminBarberrionOffset).toBeDefined();
    expect(jaiminBarberrionOffset?.theyOweYouTotalCents).toBe(13900 + 12000); // 25900
    expect(jaiminBarberrionOffset?.youOweThemTotalCents).toBe(1250);          // 1250
    expect(jaiminBarberrionOffset?.netDirectDebtCents).toBe(25900 - 1250);   // 24650
    expect(jaiminBarberrionOffset?.direction).toBe('THEY_OWE_YOU');

    // Akarsh owes 1250 in total
    const akarshStory = result.userStories[akarshId];
    expect(akarshStory.simplifiedNetBalanceCents).toBe(-1250);
    expect(akarshStory.status).toBe('PAYING');
    expect(akarshStory.receiptAccumulation.totalPaidCents).toBe(0);
    expect(akarshStory.receiptAccumulation.totalConsumedCents).toBe(1250);

    // Total simplified transfers <= total direct transfers
    expect(result.totalSimplifiedTransfersCount).toBeLessThanOrEqual(result.totalDirectTransfersCount);
  });

  it('handles fully settled group with zero balances', () => {
    const groupId = 'grp-settled';
    const userA = 'user-a';
    const userB = 'user-b';

    const result = calculateGroupDebtVisualization({
      groupId,
      groupMembers: [userA, userB],
      expenses: [
        {
          id: 'exp-1',
          payer_id: userA,
          description: 'Lunch',
          total_amount: 2000,
          splits: [
            { user_id: userA, amount_owed: 1000 },
            { user_id: userB, amount_owed: 1000 },
          ],
        },
      ],
      settlements: [
        {
          payer_id: userB,
          payee_id: userA,
          amount: 1000,
        },
      ],
      profilesMap: {
        [userA]: { id: userA, full_name: 'Alice' },
        [userB]: { id: userB, full_name: 'Bob' },
      },
    });

    expect(result.userStories[userA].status).toBe('SETTLED');
    expect(result.userStories[userB].status).toBe('SETTLED');
    expect(result.userStories[userA].simplifiedNetBalanceCents).toBe(0);
    expect(result.userStories[userB].simplifiedNetBalanceCents).toBe(0);
    expect(result.zeroSumBoard.netSumCents).toBe(0);
  });
});
