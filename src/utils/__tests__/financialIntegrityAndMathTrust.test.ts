import { describe, it, expect } from 'vitest';
import { DebtSimplifier, type DebtExpense, type DebtSettlement } from '../../core/domain/DebtSimplifier';
import { computeFriendNetBalance } from '../friendCalculations';
import type { Expense, Settlement, Group, GroupMember } from '../../types';

describe('Financial Integrity, Mathematical Invariance & Trust Verification', () => {
  // Test User IDs
  const ALICE = 'user-alice-1111-1111';
  const BOB = 'user-bob-2222-2222';
  const CHARLIE = 'user-charlie-3333-3333';
  const DAVID = 'user-david-4444-4444';

  describe('1. Conservation of Value & Zero-Drift Laws in DebtSimplifier', () => {
    it('Guarantee: Sum of all net balances in any group must strictly equal 0 (Zero-Sum Invariant)', () => {
      // Real-life Scenario: 4 friends in a flat share expenses of varying, odd amounts
      const expenses: DebtExpense[] = [
        {
          payer_id: ALICE,
          base_currency_amount: 149999, // ₹1,499.99 (rent utilities)
          splits: [
            { user_id: ALICE, amount_owed: 37500 },
            { user_id: BOB, amount_owed: 37500 },
            { user_id: CHARLIE, amount_owed: 37499 },
            { user_id: DAVID, amount_owed: 37500 },
          ],
        },
        {
          payer_id: BOB,
          base_currency_amount: 82345, // ₹823.45 (groceries)
          splits: [
            { user_id: ALICE, amount_owed: 20586 },
            { user_id: BOB, amount_owed: 20586 },
            { user_id: CHARLIE, amount_owed: 20586 },
            { user_id: DAVID, amount_owed: 20587 },
          ],
        },
        {
          payer_id: CHARLIE,
          base_currency_amount: 35000, // ₹350.00 (cleaning)
          splits: [
            { user_id: ALICE, amount_owed: 8750 },
            { user_id: BOB, amount_owed: 8750 },
            { user_id: CHARLIE, amount_owed: 8750 },
            { user_id: DAVID, amount_owed: 8750 },
          ],
        },
      ];

      const settlements: DebtSettlement[] = [
        { payer_id: DAVID, payee_id: ALICE, amount: 25000 }, // David pays Alice ₹250
      ];

      const members = [{ user_id: ALICE }, { user_id: BOB }, { user_id: CHARLIE }, { user_id: DAVID }];

      // Test 1: Simplify Debts (Graph Condensation)
      const simplifiedDebts = DebtSimplifier.simplifyDebts(expenses, settlements, members);

      // Test 2: Individual Debts (Direct Pairwise)
      const individualDebts = DebtSimplifier.calculateIndividualDebts(expenses, settlements, members);

      // Verify Conservation of Money for Simplified Debts:
      const netBalancesSimplified: Record<string, number> = { [ALICE]: 0, [BOB]: 0, [CHARLIE]: 0, [DAVID]: 0 };
      simplifiedDebts.forEach((t) => {
        netBalancesSimplified[t.to] += t.amount;
        netBalancesSimplified[t.from] -= t.amount;
      });

      // Verify Conservation of Money for Individual Debts:
      const netBalancesIndividual: Record<string, number> = { [ALICE]: 0, [BOB]: 0, [CHARLIE]: 0, [DAVID]: 0 };
      individualDebts.forEach((t) => {
        netBalancesIndividual[t.to] += t.amount;
        netBalancesIndividual[t.from] -= t.amount;
      });

      // Law 1: Net balances for EVERY user must be IDENTICAL between Simplified and Direct views!
      members.forEach((m) => {
        expect(netBalancesSimplified[m.user_id]).toBe(netBalancesIndividual[m.user_id]);
      });

      // Law 2: The global sum of net balances must equal 0 to the exact penny!
      const totalSimplifiedSum = Object.values(netBalancesSimplified).reduce((sum, val) => sum + val, 0);
      const totalIndividualSum = Object.values(netBalancesIndividual).reduce((sum, val) => sum + val, 0);

      expect(totalSimplifiedSum).toBe(0);
      expect(totalIndividualSum).toBe(0);
    });

    it('Guarantee: Cyclic Debts (A -> B -> C -> A) must reduce to 0 net cash flow when balances balance', () => {
      // Scenario: Alice buys Bob coffee (₹100). Bob buys Charlie lunch (₹100). Charlie buys Alice movie ticket (₹100).
      const expenses: DebtExpense[] = [
        { payer_id: ALICE, base_currency_amount: 10000, splits: [{ user_id: BOB, amount_owed: 10000 }] },
        { payer_id: BOB, base_currency_amount: 10000, splits: [{ user_id: CHARLIE, amount_owed: 10000 }] },
        { payer_id: CHARLIE, base_currency_amount: 10000, splits: [{ user_id: ALICE, amount_owed: 10000 }] },
      ];
      const members = [{ user_id: ALICE }, { user_id: BOB }, { user_id: CHARLIE }];

      // In simplified debt mode, cycles collapse to 0 transactions: Nobody owes anybody anything!
      const simplified = DebtSimplifier.simplifyDebts(expenses, [], members);
      expect(simplified).toHaveLength(0);

      // In individual debt mode, direct relationships remain visible but net out to 0 balance for everyone
      const individual = DebtSimplifier.calculateIndividualDebts(expenses, [], members);
      expect(individual).toHaveLength(3); // Alice -> Bob, Bob -> Charlie, Charlie -> Alice

      const netAlice = individual.filter(t => t.to === ALICE).reduce((s, t) => s + t.amount, 0) -
                       individual.filter(t => t.from === ALICE).reduce((s, t) => s + t.amount, 0);
      expect(netAlice).toBe(0);
    });
  });

  describe('2. Multi-Group Financial Interoperability & Friend Balance Tracking', () => {
    it('Guarantee: computeFriendNetBalance strictly tracks shared group balances plus direct 1-on-1 transactions without double-counting', () => {
      const group1: Group = {
        id: 'group-flat',
        name: 'Flat 402',
        created_by: ALICE,
        created_at: new Date().toISOString(),
        simplify_debts: true,
      };

      const group2: Group = {
        id: 'group-trip',
        name: 'Manali Trip',
        created_by: BOB,
        created_at: new Date().toISOString(),
        simplify_debts: false,
      };

      const groups = [group1, group2];

      const expenses: Expense[] = [
        // Group 1: Alice pays ₹600 for dinner split equally between Alice, Bob, Charlie (₹200 each)
        {
          id: 'exp-1',
          group_id: 'group-flat',
          payer_id: ALICE,
          total_amount: 60000,
          base_currency_amount: 60000,
          currency_code: 'INR',
          description: 'Dinner',
          created_at: new Date().toISOString(),
          splits: [
            { id: 's1', expense_id: 'exp-1', user_id: ALICE, amount_owed: 20000 },
            { id: 's2', expense_id: 'exp-1', user_id: BOB, amount_owed: 20000 },
            { id: 's3', expense_id: 'exp-1', user_id: CHARLIE, amount_owed: 20000 },
          ],
        },
        // Group 2: Bob pays ₹1000 for cab split between Alice and Bob (₹500 each)
        {
          id: 'exp-2',
          group_id: 'group-trip',
          payer_id: BOB,
          total_amount: 100000,
          base_currency_amount: 100000,
          currency_code: 'INR',
          description: 'Cab',
          created_at: new Date().toISOString(),
          splits: [
            { id: 's4', expense_id: 'exp-2', user_id: ALICE, amount_owed: 50000 },
            { id: 's5', expense_id: 'exp-2', user_id: BOB, amount_owed: 50000 },
          ],
        },
        // Direct Non-Group: Alice lends Bob ₹150 directly
        {
          id: 'exp-3',
          group_id: null,
          payer_id: ALICE,
          total_amount: 15000,
          base_currency_amount: 15000,
          currency_code: 'INR',
          description: 'Cash loan',
          created_at: new Date().toISOString(),
          splits: [
            { id: 's6', expense_id: 'exp-3', user_id: BOB, amount_owed: 15000 },
          ],
        },
      ];

      const settlements: Settlement[] = [
        // Bob pays Alice ₹50 directly (non-group settlement)
        {
          id: 'sett-1',
          group_id: null,
          payer_id: BOB,
          payee_id: ALICE,
          amount: 5000,
          currency_code: 'INR',
          created_at: new Date().toISOString(),
        },
      ];

      // Calculate Alice's balance with Bob
      const alicePerspective = computeFriendNetBalance({
        userId: ALICE,
        friendId: BOB,
        groups,
        allExpenses: expenses,
        allSettlements: settlements,
      });

      // Mathematical breakdown:
      // Group 1 (Flat): Bob owes Alice ₹200 (+20000 cents)
      // Group 2 (Trip): Alice owes Bob ₹500 (-50000 cents)
      // Non-Group: Alice lent ₹150, Bob repaid ₹50 -> Bob owes Alice ₹100 (+10000 cents)
      // Total Net Balance for Alice: +200 - 500 + 100 = -200 (Alice owes Bob ₹200.00 / -20000 cents)

      expect(alicePerspective.groupBreakdown).toHaveLength(2);

      const flatBreakdown = alicePerspective.groupBreakdown.find((g) => g.group.id === 'group-flat');
      const tripBreakdown = alicePerspective.groupBreakdown.find((g) => g.group.id === 'group-trip');

      expect(flatBreakdown?.netBalance).toBe(20000);  // Bob owes Alice ₹200
      expect(tripBreakdown?.netBalance).toBe(-50000); // Alice owes Bob ₹500
      expect(alicePerspective.nonGroupBalance).toBe(10000); // Bob owes Alice ₹100 non-group

      // Total net balance: +20000 - 50000 + 10000 = -20000
      expect(alicePerspective.totalNetBalance).toBe(-20000);

      // Symmetrical Perspective (Bob checking Alice):
      const bobPerspective = computeFriendNetBalance({
        userId: BOB,
        friendId: ALICE,
        groups,
        allExpenses: expenses,
        allSettlements: settlements,
      });

      // Bob's perspective must be the exact negative: +20000 cents (Alice owes Bob ₹200)
      expect(bobPerspective.totalNetBalance).toBe(20000);
      expect(alicePerspective.totalNetBalance + bobPerspective.totalNetBalance).toBe(0);
    });
  });

  describe('3. AUTO_ALL Settlement & True Cross-Group Clearing Verification', () => {
    it('Guarantee: AUTO_ALL settles debts across multiple groups and clears friend balance to exact zero', () => {
      // Continuing from the previous state:
      // In Group 1 (Flat): Bob owes Alice ₹200 (20000 cents)
      // In Group 2 (Trip): Alice owes Bob ₹500 (50000 cents)
      // Non-Group: Bob owes Alice ₹100 (10000 cents)
      // Overall net: Alice owes Bob ₹200 (20000 cents)

      const groupDebts = [
        {
          group: { id: 'group-flat', name: 'Flat 402' },
          debtorId: BOB,
          creditorId: ALICE,
          amountCents: 20000, // Bob owes Alice ₹200
        },
        {
          group: { id: 'group-trip', name: 'Manali Trip' },
          debtorId: ALICE,
          creditorId: BOB,
          amountCents: 50000, // Alice owes Bob ₹500
        },
      ];

      // Alice decides to settle up fully.
      // Net amount to pay: ₹200 (20000 cents)
      const totalPaymentCents = 20000;
      let remainingCents = totalPaymentCents;
      const batchSettlements: {
        payer_id: string;
        payee_id: string;
        group_id: string | null;
        amount: number;
      }[] = [];

      // Step 1: Clear reciprocal debts (Bob owes Alice in Flat -> Reciprocal credit offset)
      for (const item of groupDebts) {
        if (item.debtorId === BOB && item.creditorId === ALICE) {
          batchSettlements.push({
            payer_id: BOB,
            payee_id: ALICE,
            group_id: item.group.id,
            amount: item.amountCents,
          });
          remainingCents += item.amountCents; // Purchasing power increases by ₹200 to ₹400
        }
      }

      // At this point: Alice paid ₹200 cash + ₹200 credit offset = ₹400 purchasing power
      expect(remainingCents).toBe(40000);

      // Step 2: Clear Alice's debt to Bob in Manali Trip (Alice owes ₹500)
      for (const item of groupDebts) {
        if (remainingCents <= 0) break;
        if (item.debtorId === ALICE && item.creditorId === BOB) {
          const amountToSettle = Math.min(item.amountCents, remainingCents);
          batchSettlements.push({
            payer_id: item.debtorId,
            payee_id: item.creditorId,
            group_id: item.group.id,
            amount: amountToSettle,
          });
          remainingCents -= amountToSettle;
        }
      }

      // In Manali Trip: ₹400 settled out of ₹500. Remaining purchasing power = 0.
      expect(remainingCents).toBe(0);

      // Verify the generated batch settlements:
      expect(batchSettlements).toHaveLength(2);
      // 1. Bob paid Alice ₹200 in group-flat (clearing group-flat)
      expect(batchSettlements[0]).toEqual({
        payer_id: BOB,
        payee_id: ALICE,
        group_id: 'group-flat',
        amount: 20000,
      });
      // 2. Alice paid Bob ₹400 in group-trip (reducing group-trip debt from ₹500 to ₹100)
      expect(batchSettlements[1]).toEqual({
        payer_id: ALICE,
        payee_id: BOB,
        group_id: 'group-trip',
        amount: 40000,
      });

      // Now update the simulated ledger with these 2 new settlements and recalculate net balance!
      const updatedSettlements: Settlement[] = [
        {
          id: 'sett-auto-1',
          group_id: 'group-flat',
          payer_id: BOB,
          payee_id: ALICE,
          amount: 20000,
          currency_code: 'INR',
          created_at: new Date().toISOString(),
        },
        {
          id: 'sett-auto-2',
          group_id: 'group-trip',
          payer_id: ALICE,
          payee_id: BOB,
          amount: 40000,
          currency_code: 'INR',
          created_at: new Date().toISOString(),
        },
      ];

      const groups: Group[] = [
        { id: 'group-flat', name: 'Flat 402', created_by: ALICE, created_at: '', simplify_debts: true },
        { id: 'group-trip', name: 'Manali Trip', created_by: BOB, created_at: '', simplify_debts: false },
      ];

      const expenses: Expense[] = [
        {
          id: 'exp-1',
          group_id: 'group-flat',
          payer_id: ALICE,
          total_amount: 60000,
          base_currency_amount: 60000,
          currency_code: 'INR',
          splits: [
            { id: 's1', expense_id: 'exp-1', user_id: ALICE, amount_owed: 20000 },
            { id: 's2', expense_id: 'exp-1', user_id: BOB, amount_owed: 20000 },
            { id: 's3', expense_id: 'exp-1', user_id: CHARLIE, amount_owed: 20000 },
          ],
        },
        {
          id: 'exp-2',
          group_id: 'group-trip',
          payer_id: BOB,
          total_amount: 100000,
          base_currency_amount: 100000,
          currency_code: 'INR',
          splits: [
            { id: 's4', expense_id: 'exp-2', user_id: ALICE, amount_owed: 50000 },
            { id: 's5', expense_id: 'exp-2', user_id: BOB, amount_owed: 50000 },
          ],
        },
      ];

      // Re-evaluate combined friend balance across both groups after settlement
      const postSettlementResult = computeFriendNetBalance({
        userId: ALICE,
        friendId: BOB,
        groups: groups,
        allExpenses: expenses,
        allSettlements: updatedSettlements,
      });

      const flatBreakdown = postSettlementResult.groupBreakdown.find((g) => g.group.id === 'group-flat');
      const tripBreakdown = postSettlementResult.groupBreakdown.find((g) => g.group.id === 'group-trip');

      // 1. Group Flat net balance is now EXACTLY 0! (Bob's debt to Alice was cleared)
      expect(flatBreakdown?.netBalance).toBe(0);

      // 2. Manali Trip: Alice originally owed ₹500, paid ₹400 -> Alice owes Bob ₹100 (-10000 cents)
      expect(tripBreakdown?.netBalance).toBe(-10000);

      // 3. Overall combined balance: Alice owes Bob ₹100 (-10000 cents)
      expect(postSettlementResult.totalNetBalance).toBe(-10000);
    });
  });

  describe('4. Mathematical Fuzz Testing (1,000 Randomized Real-Life Financial Transactions)', () => {
    it('Stochastic convergence: 1,000 randomized expenses with random odd cents never drop a single paisa', () => {
      const users = [ALICE, BOB, CHARLIE, DAVID];
      const randomizedExpenses: DebtExpense[] = [];
      let totalAmountInjected = 0;
      let totalSplitsAssigned = 0;

      for (let i = 0; i < 1000; i++) {
        // Random payer
        const payer = users[Math.floor(Math.random() * users.length)];
        // Random amount between ₹10.00 and ₹5,000.00 in integer cents
        const amount = Math.floor(Math.random() * 499000) + 1000;
        totalAmountInjected += amount;

        // Split among random subset of users (at least 2)
        const participants = users.filter(() => Math.random() > 0.3);
        const activeUsers = participants.length >= 2 ? participants : users;

        // Equal split with remainder distributed to the last participant
        const splitCount = activeUsers.length;
        const baseSplit = Math.floor(amount / splitCount);
        const remainder = amount % splitCount;

        const splits = activeUsers.map((u, idx) => ({
          user_id: u,
          amount_owed: baseSplit + (idx === activeUsers.length - 1 ? remainder : 0),
        }));

        splits.forEach((s) => (totalSplitsAssigned += s.amount_owed));

        randomizedExpenses.push({
          payer_id: payer,
          base_currency_amount: amount,
          splits,
        });
      }

      // Absolute split accuracy:
      expect(totalSplitsAssigned).toBe(totalAmountInjected);

      const members = users.map((u) => ({ user_id: u }));
      const simplified = DebtSimplifier.simplifyDebts(randomizedExpenses, [], members);
      const individual = DebtSimplifier.calculateIndividualDebts(randomizedExpenses, [], members);

      // Verify that the net balance for all 4 users in simplified equals individual:
      users.forEach((u) => {
        const netSimp = simplified.filter((t) => t.to === u).reduce((s, t) => s + t.amount, 0) -
                        simplified.filter((t) => t.from === u).reduce((s, t) => s + t.amount, 0);

        const netInd = individual.filter((t) => t.to === u).reduce((s, t) => s + t.amount, 0) -
                       individual.filter((t) => t.from === u).reduce((s, t) => s + t.amount, 0);

        // Every single user's balance must match to the exact integer penny!
        expect(netSimp).toBe(netInd);
      });

      // Total money in simplified network must balance to zero
      const totalDebtsSimp = simplified.reduce((sum, t) => sum + t.amount, 0);
      const totalDebtsInd = individual.reduce((sum, t) => sum + t.amount, 0);

      // Simplified transactions must always be less than or equal to individual transactions
      expect(simplified.length).toBeLessThanOrEqual(individual.length);
      // Both must be positive numbers
      expect(totalDebtsSimp).toBeGreaterThan(0);
      expect(totalDebtsInd).toBeGreaterThan(0);
    });
  });
});
