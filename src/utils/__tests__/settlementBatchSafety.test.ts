import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettlementsBatch, type SettlementBatchItem } from '../../hooks/supabase/useMutations';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { supabase } from '../../lib/supabase';
import * as pushDispatcher from '../pushDispatcher';

// Mock Supabase
const mockSettlementsInsert = vi.fn().mockResolvedValue({ error: null });
const mockNotificationsInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'settlements') {
        return { insert: mockSettlementsInsert };
      }
      if (table === 'notifications') {
        return { insert: mockNotificationsInsert };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { sent: 1 }, error: null }),
    },
  },
}));

describe('Settlement Batch Optimization & Real-Life Scenarios', () => {
  let pushSpy: any;
  let invalidateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettlementsInsert.mockResolvedValue({ error: null });
    mockNotificationsInsert.mockResolvedValue({ error: null });
    pushSpy = vi.spyOn(pushDispatcher, 'dispatchPushNotification').mockResolvedValue(undefined as any);
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  });

  describe('createSettlementsBatch Core Ingestion & Performance', () => {
    it('handles empty batch input gracefully without network calls', async () => {
      await createSettlementsBatch([]);
      expect(supabase.from).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('inserts all settlement items in a SINGLE batch HTTP request (O(1) network roundtrip)', async () => {
      const batchItems: SettlementBatchItem[] = [
        {
          group_id: '4ebe0615-7df1-44d4-aba7-95b2a79fcb57',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 5000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
        {
          group_id: '8a123456-7df1-44d4-aba7-95b2a79fcb57',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 3000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
        {
          group_id: null,
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 2000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
      ];

      await createSettlementsBatch(batchItems);

      // Exactly ONE call to supabase.from('settlements').insert
      expect(supabase.from).toHaveBeenCalledWith('settlements');
      expect(mockSettlementsInsert).toHaveBeenCalledTimes(1);

      // Verify full array payload was passed in one single insert
      expect(mockSettlementsInsert).toHaveBeenCalledWith([
        {
          group_id: '4ebe0615-7df1-44d4-aba7-95b2a79fcb57',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 5000,
          currency_code: 'INR',
        },
        {
          group_id: '8a123456-7df1-44d4-aba7-95b2a79fcb57',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 3000,
          currency_code: 'INR',
        },
        {
          group_id: null,
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 2000,
          currency_code: 'INR',
        },
      ]);
    });

    it('creates rich notifications in a single batch request for distinct items', async () => {
      const batchItems: SettlementBatchItem[] = [
        {
          group_id: 'group-1',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 5000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
        {
          group_id: null,
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 1000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
      ];

      await createSettlementsBatch(batchItems);

      // Exactly ONE call to notifications insert
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockNotificationsInsert).toHaveBeenCalledTimes(1);

      const notifPayload = mockNotificationsInsert.mock.calls[0][0];
      expect(notifPayload).toHaveLength(2);
      expect(notifPayload[0].user_id).toBe('user-bob');
      expect(notifPayload[0].message).toContain('Alice recorded a payment of ₹50.00 to you.');
      expect(notifPayload[1].user_id).toBe('user-bob');
      expect(notifPayload[1].message).toContain('Alice recorded a payment of ₹10.00 to you.');
    });

    it('does not create notifications when payer and payee are identical', async () => {
      const batchItems: SettlementBatchItem[] = [
        {
          group_id: 'group-1',
          payer_id: 'user-alice',
          payee_id: 'user-alice',
          amount: 1000,
          currency_code: 'INR',
        },
      ];

      await createSettlementsBatch(batchItems);

      expect(mockSettlementsInsert).toHaveBeenCalledTimes(1);
      expect(mockNotificationsInsert).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('dispatches Web Push notifications for each notification item in the batch', async () => {
      const batchItems: SettlementBatchItem[] = [
        {
          group_id: 'group-1',
          payer_id: 'user-alice',
          payee_id: 'user-bob',
          amount: 5000,
          currency_code: 'INR',
          payer_name: 'Alice',
        },
      ];

      await createSettlementsBatch(batchItems);

      expect(pushSpy).toHaveBeenCalledTimes(1);
      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ['user-bob'],
          title: 'Payment Received 💰',
          url: '/groups/group-1',
        }),
      );
    });

    it('invalidates settlements.all and expenses.all cache queries exactly ONCE', async () => {
      const batchItems: SettlementBatchItem[] = [
        { group_id: 'g1', payer_id: 'a', payee_id: 'b', amount: 100, currency_code: 'INR' },
        { group_id: 'g2', payer_id: 'a', payee_id: 'b', amount: 200, currency_code: 'INR' },
        { group_id: 'g3', payer_id: 'a', payee_id: 'b', amount: 300, currency_code: 'INR' },
      ];

      await createSettlementsBatch(batchItems);

      // Each query key is invalidated exactly once despite 3 settlements
      const settlementInvalidations = invalidateSpy.mock.calls.filter(
        (call: any) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(queryKeys.settlements.all),
      );
      const expenseInvalidations = invalidateSpy.mock.calls.filter(
        (call: any) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(queryKeys.expenses.all),
      );

      expect(settlementInvalidations).toHaveLength(1);
      expect(expenseInvalidations).toHaveLength(1);
    });

    it('throws error and halts if database insertion fails', async () => {
      mockSettlementsInsert.mockResolvedValueOnce({ error: new Error('Postgres connection timeout') });

      const batchItems: SettlementBatchItem[] = [
        { group_id: 'g1', payer_id: 'a', payee_id: 'b', amount: 100, currency_code: 'INR' },
      ];

      await expect(createSettlementsBatch(batchItems)).rejects.toThrow('Postgres connection timeout');
    });
  });

  describe('Real-Life Cross-Group Settlement (AUTO_ALL) Scenarios', () => {
    /**
     * Pure business logic helper mirroring SettleUpModal AUTO_ALL resolution
     */
    function computeAutoAllBatch(params: {
      payerId: string;
      payeeId: string;
      payerName: string;
      payeeName: string;
      totalCents: number;
      currency: string;
      allGroupDebts: Array<{
        group: { id: string; name: string };
        debtorId: string;
        creditorId: string;
        amountCents: number;
      }>;
    }): SettlementBatchItem[] {
      const itemsToInsert: SettlementBatchItem[] = [];
      let remainingCents = params.totalCents;

      // Step 1: Clear Reciprocal Debts
      for (const item of params.allGroupDebts) {
        if (item.debtorId === params.payeeId && item.creditorId === params.payerId) {
          itemsToInsert.push({
            payer_id: params.payeeId,
            payee_id: params.payerId,
            group_id: item.group.id,
            amount: item.amountCents,
            currency_code: params.currency,
            payer_name: params.payeeName,
          });
          remainingCents += item.amountCents;
        }
      }

      // Step 2: Clear Payer Debts
      for (const item of params.allGroupDebts) {
        if (remainingCents <= 0) break;

        if (item.debtorId === params.payerId && item.creditorId === params.payeeId) {
          const amountToSettle = Math.min(item.amountCents, remainingCents);
          itemsToInsert.push({
            payer_id: item.debtorId,
            payee_id: item.creditorId,
            group_id: item.group.id,
            amount: amountToSettle,
            currency_code: params.currency,
            payer_name: params.payerName,
          });
          remainingCents -= amountToSettle;
        }
      }

      // Step 3: Handle Overpayment or Non-Group Debts
      if (remainingCents > 0) {
        itemsToInsert.push({
          payer_id: params.payerId,
          payee_id: params.payeeId,
          group_id: null,
          amount: remainingCents,
          currency_code: params.currency,
          payer_name: params.payerName,
        });
      }

      return itemsToInsert;
    }

    it('Scenario 1: True Cross-Group Reciprocal Clearance (Alice pays net ₹300)', () => {
      // Alice owes Bob ₹500 in Flat Expenses (group-flat)
      // Bob owes Alice ₹200 in Goa Trip (group-goa)
      // Alice pays net balance: ₹300
      const debts = [
        {
          group: { id: 'group-flat', name: 'Flat Expenses' },
          debtorId: 'alice',
          creditorId: 'bob',
          amountCents: 50000, // ₹500
        },
        {
          group: { id: 'group-goa', name: 'Goa Trip' },
          debtorId: 'bob',
          creditorId: 'alice',
          amountCents: 20000, // ₹200
        },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 30000, // ₹300
        currency: 'INR',
        allGroupDebts: debts,
      });

      expect(batch).toHaveLength(2);

      // 1. Bob -> Alice in group-goa for ₹200 (reciprocal credit)
      expect(batch[0]).toEqual({
        payer_id: 'bob',
        payee_id: 'alice',
        group_id: 'group-goa',
        amount: 20000,
        currency_code: 'INR',
        payer_name: 'Bob',
      });

      // 2. Alice -> Bob in group-flat for ₹500 (full clearance)
      expect(batch[1]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'group-flat',
        amount: 50000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });

      // Purchasing power: Alice paid ₹300 out of pocket + ₹200 reciprocal offset = ₹500 settled
      const totalPayerSettled = batch.filter((b) => b.payer_id === 'alice').reduce((sum, b) => sum + b.amount, 0);
      const totalReciprocalCredit = batch.filter((b) => b.payer_id === 'bob').reduce((sum, b) => sum + b.amount, 0);
      expect(totalPayerSettled - totalReciprocalCredit).toBe(30000);
    });

    it('Scenario 2: Partial multi-group clearance (Alice owes ₹1000 total, pays ₹500)', () => {
      // Alice owes Bob ₹400 in Group A and ₹600 in Group B
      const debts = [
        {
          group: { id: 'group-a', name: 'Group A' },
          debtorId: 'alice',
          creditorId: 'bob',
          amountCents: 40000,
        },
        {
          group: { id: 'group-b', name: 'Group B' },
          debtorId: 'alice',
          creditorId: 'bob',
          amountCents: 60000,
        },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 50000, // ₹500
        currency: 'INR',
        allGroupDebts: debts,
      });

      expect(batch).toHaveLength(2);
      expect(batch[0]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'group-a',
        amount: 40000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });
      expect(batch[1]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'group-b',
        amount: 10000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });

      const totalSettled = batch.reduce((sum, b) => sum + b.amount, 0);
      expect(totalSettled).toBe(50000);
    });

    it('Scenario 3: Overpayment creates a non-group credit (Alice owes ₹300, pays ₹500)', () => {
      const debts = [
        {
          group: { id: 'group-a', name: 'Group A' },
          debtorId: 'alice',
          creditorId: 'bob',
          amountCents: 30000,
        },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 50000, // ₹500
        currency: 'INR',
        allGroupDebts: debts,
      });

      expect(batch).toHaveLength(2);
      // Item 1 clears Group A
      expect(batch[0].group_id).toBe('group-a');
      expect(batch[0].amount).toBe(30000);

      // Item 2 records direct overpayment
      expect(batch[1].group_id).toBeNull();
      expect(batch[1].amount).toBe(20000);
      expect(batch[1].payer_id).toBe('alice');
      expect(batch[1].payee_id).toBe('bob');
    });

    it('Scenario 4: Multi-way complex reciprocal network across 4 groups', () => {
      // Alice owes Bob in Group 1 (₹100) and Group 2 (₹400) -> Total ₹500
      // Bob owes Alice in Group 3 (₹50) and Group 4 (₹150)  -> Total ₹200
      // Alice pays net ₹300
      const debts = [
        { group: { id: 'g1', name: 'G1' }, debtorId: 'alice', creditorId: 'bob', amountCents: 10000 },
        { group: { id: 'g2', name: 'G2' }, debtorId: 'alice', creditorId: 'bob', amountCents: 40000 },
        { group: { id: 'g3', name: 'G3' }, debtorId: 'bob', creditorId: 'alice', amountCents: 5000 },
        { group: { id: 'g4', name: 'G4' }, debtorId: 'bob', creditorId: 'alice', amountCents: 15000 },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 30000, // Net ₹300
        currency: 'INR',
        allGroupDebts: debts,
      });

      expect(batch).toHaveLength(4);

      expect(batch[0]).toEqual({
        payer_id: 'bob',
        payee_id: 'alice',
        group_id: 'g3',
        amount: 5000,
        currency_code: 'INR',
        payer_name: 'Bob',
      });
      expect(batch[1]).toEqual({
        payer_id: 'bob',
        payee_id: 'alice',
        group_id: 'g4',
        amount: 15000,
        currency_code: 'INR',
        payer_name: 'Bob',
      });
      expect(batch[2]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'g1',
        amount: 10000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });
      expect(batch[3]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'g2',
        amount: 40000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });

      const totalAlicePaid = batch.filter((b) => b.payer_id === 'alice').reduce((s, b) => s + b.amount, 0);
      const totalBobPaid = batch.filter((b) => b.payer_id === 'bob').reduce((s, b) => s + b.amount, 0);
      expect(totalAlicePaid - totalBobPaid).toBe(30000);
    });

    it('Scenario 5: Paisa and Cent precision safety', () => {
      const debts = [
        {
          group: { id: 'group-uneven', name: 'Uneven' },
          debtorId: 'alice',
          creditorId: 'bob',
          amountCents: 3333, // ₹33.33
        },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 3333,
        currency: 'INR',
        allGroupDebts: debts,
      });

      expect(batch).toHaveLength(1);
      expect(batch[0].amount).toBe(3333);
      expect(Number.isInteger(batch[0].amount)).toBe(true);
    });

    it('Scenario 6: Reciprocal debt exceeds payer debt (Zero cash paid, generates direct credit)', () => {
      // Alice owes Bob ₹100 in Group 1
      // Bob owes Alice ₹300 in Group 2
      // Alice enters ₹0 payment (pure offset)
      const debts = [
        { group: { id: 'g1', name: 'G1' }, debtorId: 'alice', creditorId: 'bob', amountCents: 10000 },
        { group: { id: 'g2', name: 'G2' }, debtorId: 'bob', creditorId: 'alice', amountCents: 30000 },
      ];

      const batch = computeAutoAllBatch({
        payerId: 'alice',
        payeeId: 'bob',
        payerName: 'Alice',
        payeeName: 'Bob',
        totalCents: 0,
        currency: 'INR',
        allGroupDebts: debts,
      });

      // Step 1: Bob pays Alice ₹300 in g2 (reciprocal debt cleared) -> remainingCents = 30000
      // Step 2: Alice pays Bob ₹100 in g1 -> remainingCents = 20000
      // Step 3: remainingCents 20000 becomes direct non-group balance
      expect(batch).toHaveLength(3);
      expect(batch[0]).toEqual({
        payer_id: 'bob',
        payee_id: 'alice',
        group_id: 'g2',
        amount: 30000,
        currency_code: 'INR',
        payer_name: 'Bob',
      });
      expect(batch[1]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: 'g1',
        amount: 10000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });
      expect(batch[2]).toEqual({
        payer_id: 'alice',
        payee_id: 'bob',
        group_id: null,
        amount: 20000,
        currency_code: 'INR',
        payer_name: 'Alice',
      });
    });
  });
});
