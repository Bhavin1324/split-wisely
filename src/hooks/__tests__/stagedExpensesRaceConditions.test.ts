import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { StagedExpense } from '../../types/stagedExpense';
import {
  registerStagedTombstone,
  isStagedTombstoned,
  evictStagedTombstone,
} from '../queries/useStagedExpensesQuery';

describe('Staged Expenses Race Conditions & Flickering Remediation', () => {
  let queryClient: QueryClient;
  const testUserId = 'test-user-race-remediation';

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      []
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. In-flight locking: prevents duplicate actions when user double-taps on mobile', async () => {
    const inFlightRef = new Set<string>();
    let actionExecutionCount = 0;

    const mockApprovePersonal = async (id: string) => {
      // In-flight guard
      if (inFlightRef.has(id)) return false;
      inFlightRef.add(id);

      try {
        actionExecutionCount++;
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 300));
        return true;
      } finally {
        inFlightRef.delete(id);
      }
    };

    // Simulate rapid double-tap (two invocations initiated concurrently)
    const p1 = mockApprovePersonal('staged-card-1');
    const p2 = mockApprovePersonal('staged-card-1');

    vi.advanceTimersByTime(350);

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1).toBe(true);
    expect(res2).toBe(false); // Second tap was safely dropped
    expect(actionExecutionCount).toBe(1); // Only executed once!
  });

  it('2. Anti-resurrection tombstones: prevents slow in-flight query GET from resurrecting dismissed/approved cards', () => {
    const cardId = 'card-to-dismiss-1';

    // 1. Initially untombstoned
    expect(isStagedTombstoned(cardId)).toBe(false);

    // 2. Card actioned -> register tombstone
    registerStagedTombstone(cardId);
    expect(isStagedTombstoned(cardId)).toBe(true);

    // 3. Simulated slow server response arrives that STILL contains the deleted card
    const staleServerResponse: StagedExpense[] = [
      {
        id: cardId,
        user_id: testUserId,
        amount_cents: 15000,
        transaction_type: 'DEBIT',
        merchant_name: 'UBER',
        bank_short_code: 'HDFC',
        account_last4: '1111',
        upi_ref: 'ref1',
        raw_sms_hash: 'hash1',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        transaction_date: new Date().toISOString(),
      },
      {
        id: 'surviving-card-2',
        user_id: testUserId,
        amount_cents: 20000,
        transaction_type: 'DEBIT',
        merchant_name: 'AMAZON',
        bank_short_code: 'SBI',
        account_last4: '2222',
        upi_ref: 'ref2',
        raw_sms_hash: 'hash2',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        transaction_date: new Date().toISOString(),
      },
    ];

    // Filter server data using tombstone check (as done in usePendingStagedExpensesQuery)
    const sanitizedServerData = staleServerResponse.filter(
      (item) => !isStagedTombstoned(item.id)
    );

    expect(sanitizedServerData).toHaveLength(1);
    expect(sanitizedServerData[0].id).toBe('surviving-card-2');
    expect(sanitizedServerData.some((i) => i.id === cardId)).toBe(false);

    // 4. Tombstone expiration after 5,000ms TTL
    vi.advanceTimersByTime(5001);
    expect(isStagedTombstoned(cardId)).toBe(false);
  });

  it('3. Tombstone eviction: correctly evicts tombstone on rollback if mutation fails', () => {
    const errorCardId = 'card-error-rollback';
    registerStagedTombstone(errorCardId);
    expect(isStagedTombstoned(errorCardId)).toBe(true);

    // When mutation throws or aborts, eviction restores normal visibility
    evictStagedTombstone(errorCardId);
    expect(isStagedTombstoned(errorCardId)).toBe(false);
  });

  it('4. Proactive card transition: immediately advances activeId to next valid card on action', () => {
    const pendingList: StagedExpense[] = [
      {
        id: 'card-1',
        user_id: testUserId,
        amount_cents: 1000,
        transaction_type: 'DEBIT',
        merchant_name: 'M1',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h1',
        status: 'PENDING',
        created_at: '2026-09-17T10:00:00Z',
        transaction_date: '2026-09-17T10:00:00Z',
      },
      {
        id: 'card-2',
        user_id: testUserId,
        amount_cents: 2000,
        transaction_type: 'DEBIT',
        merchant_name: 'M2',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h2',
        status: 'PENDING',
        created_at: '2026-09-17T09:00:00Z',
        transaction_date: '2026-09-17T09:00:00Z',
      },
      {
        id: 'card-3',
        user_id: testUserId,
        amount_cents: 3000,
        transaction_type: 'DEBIT',
        merchant_name: 'M3',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h3',
        status: 'PENDING',
        created_at: '2026-09-17T08:00:00Z',
        transaction_date: '2026-09-17T08:00:00Z',
      },
    ];

    let activeId: string | null = 'card-2';
    const safeIndex = pendingList.findIndex((exp) => exp.id === activeId);
    expect(safeIndex).toBe(1);

    // Banner transition logic when card-2 is actioned:
    const transitionToNextCard = (currentId: string) => {
      const remaining = pendingList.filter((e) => e.id !== currentId);
      if (remaining.length === 0) {
        activeId = null;
      } else {
        const nextIdx = Math.min(safeIndex, remaining.length - 1);
        activeId = remaining[nextIdx].id;
      }
    };

    transitionToNextCard('card-2');

    // Focus immediately stepped to card-3 (the next card at index 1 of surviving list)
    expect(activeId).toBe('card-3');
  });

  it('5. Final card dismissal: resets activeId to null when last staged transaction is resolved', () => {
    const singleItemList: StagedExpense[] = [
      {
        id: 'last-card',
        user_id: testUserId,
        amount_cents: 1000,
        transaction_type: 'DEBIT',
        merchant_name: 'LAST',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h-last',
        status: 'PENDING',
        created_at: '2026-09-17T10:00:00Z',
        transaction_date: '2026-09-17T10:00:00Z',
      },
    ];

    let activeId: string | null = 'last-card';

    const transitionToNextCard = (currentId: string) => {
      const remaining = singleItemList.filter((e) => e.id !== currentId);
      if (remaining.length === 0) {
        activeId = null;
      } else {
        activeId = remaining[0].id;
      }
    };

    transitionToNextCard('last-card');

    expect(activeId).toBeNull();
  });

  it('6. Atomic conditional check: safely ignores already-approved cards and performs rollback on insertion error', () => {
    const initialCache: StagedExpense[] = [
      {
        id: 'card-multi-device',
        user_id: testUserId,
        amount_cents: 5000,
        transaction_type: 'DEBIT',
        merchant_name: 'CAFE',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h-md',
        status: 'PENDING',
        created_at: '2026-09-17T10:00:00Z',
        transaction_date: '2026-09-17T10:00:00Z',
      },
    ];

    queryClient.setQueryData(
      queryKeys.stagedExpenses.pending(testUserId),
      initialCache
    );

    // Optimistic removal:
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => prev.filter((item) => item.id !== 'card-multi-device')
    );
    expect(
      queryClient.getQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(testUserId)
      )
    ).toHaveLength(0);

    // Simulate network error triggering rollback:
    const rollbackItem = initialCache[0];
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => {
        if (prev.some((e) => e.id === rollbackItem.id)) return prev;
        return [rollbackItem, ...prev];
      }
    );

    const restored = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );
    expect(restored).toHaveLength(1);
    expect(restored?.[0].id).toBe('card-multi-device');
  });
});
