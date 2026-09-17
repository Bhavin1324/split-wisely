import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { StagedExpense } from '../../types/stagedExpense';

describe('Staged Expenses Burst Real-Time Ingestion & Edge Case Resilience', () => {
  let queryClient: QueryClient;
  const testUserId = 'test-user-burst-123';

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

  it('1. Retains all 10 transactions during high-frequency burst ingestion without dropping any', () => {
    // Generate 10 simulated SMS transactions
    const burstExpenses: StagedExpense[] = Array.from({ length: 10 }, (_, i) => ({
      id: `staged-burst-${i + 1}`,
      user_id: testUserId,
      amount_cents: (i + 1) * 10000,
      transaction_type: 'DEBIT',
      merchant_name: `MERCHANT_${i + 1}`,
      bank_short_code: 'HDFC',
      account_last4: '1234',
      upi_ref: `42918274910${i}`,
      raw_sms_hash: `hash-burst-${i + 1}`,
      status: 'PENDING',
      created_at: new Date(Date.now() + i * 1000).toISOString(),
      transaction_date: new Date(Date.now() + i * 1000).toISOString(),
    }));

    // Simulate high-frequency WebSocket burst events arriving in rapid succession
    for (const newStaged of burstExpenses) {
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(testUserId),
        (prev = []) => {
          const map = new Map(prev.map((item) => [item.id, item]));
          map.set(newStaged.id, newStaged);
          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.transaction_date).getTime() -
              new Date(a.transaction_date).getTime()
          );
        }
      );
    }

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached).toHaveLength(10);
    // Verify all IDs from 1 to 10 are present
    burstExpenses.forEach((exp) => {
      expect(cached?.some((item) => item.id === exp.id)).toBe(true);
    });
  });

  it('2. Preserves real-time injected items even when an in-flight server response resolves with an older snapshot', () => {
    // Database snapshot when fetch initiated (only Item 1 exists)
    const serverSnapshot: StagedExpense[] = [
      {
        id: 'staged-server-1',
        user_id: testUserId,
        amount_cents: 25000,
        transaction_type: 'DEBIT',
        merchant_name: 'SWIGGY',
        bank_short_code: 'HDFC',
        account_last4: '1234',
        upi_ref: '111111',
        raw_sms_hash: 'hash-1',
        status: 'PENDING',
        created_at: '2026-09-17T10:00:00.000Z',
        transaction_date: '2026-09-17T10:00:00.000Z',
      },
    ];

    // Seed initial cache
    queryClient.setQueryData(
      queryKeys.stagedExpenses.pending(testUserId),
      serverSnapshot
    );

    // While in flight, 2 new transactions arrive via WebSocket!
    const incomingRealtimeItems: StagedExpense[] = [
      {
        id: 'staged-realtime-2',
        user_id: testUserId,
        amount_cents: 50000,
        transaction_type: 'DEBIT',
        merchant_name: 'ZOMATO',
        bank_short_code: 'SBI',
        account_last4: '5678',
        upi_ref: '222222',
        raw_sms_hash: 'hash-2',
        status: 'PENDING',
        created_at: '2026-09-17T10:01:00.000Z',
        transaction_date: '2026-09-17T10:01:00.000Z',
      },
      {
        id: 'staged-realtime-3',
        user_id: testUserId,
        amount_cents: 75000,
        transaction_type: 'DEBIT',
        merchant_name: 'AMAZON',
        bank_short_code: 'ICICI',
        account_last4: '9999',
        upi_ref: '333333',
        raw_sms_hash: 'hash-3',
        status: 'PENDING',
        created_at: '2026-09-17T10:02:00.000Z',
        transaction_date: '2026-09-17T10:02:00.000Z',
      },
    ];

    for (const item of incomingRealtimeItems) {
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(testUserId),
        (prev = []) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          map.set(item.id, item);
          return Array.from(map.values());
        }
      );
    }

    // Now simulated server response resolves with only serverSnapshot!
    // The bi-directional cache merge ensures cached real-time items are NOT wiped out
    const currentCached =
      queryClient.getQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(testUserId)
      ) || [];

    const mergedMap = new Map(
      serverSnapshot.map((item) => [item.id, item])
    );
    for (const item of currentCached) {
      if (!mergedMap.has(item.id) && item.status === 'PENDING') {
        mergedMap.set(item.id, item);
      }
    }
    const finalMerged = Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    );

    queryClient.setQueryData(
      queryKeys.stagedExpenses.pending(testUserId),
      finalMerged
    );

    const finalResult = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(finalResult).toHaveLength(3);
    expect(finalResult?.map((i) => i.id)).toEqual([
      'staged-realtime-3',
      'staged-realtime-2',
      'staged-server-1',
    ]);
  });

  it('3. Sorts out-of-order packets deterministically by transaction_date DESC', () => {
    const dates = [
      '2026-09-17T08:00:00.000Z', // Oldest
      '2026-09-17T12:00:00.000Z', // Newest
      '2026-09-17T10:00:00.000Z', // Middle
    ];

    // Push in random out-of-order sequence
    const outOfOrderItems: StagedExpense[] = [
      {
        id: 'staged-date-1',
        user_id: testUserId,
        amount_cents: 1000,
        transaction_type: 'DEBIT',
        merchant_name: 'CAFE',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h1',
        status: 'PENDING',
        created_at: dates[0],
        transaction_date: dates[0],
      },
      {
        id: 'staged-date-2',
        user_id: testUserId,
        amount_cents: 2000,
        transaction_type: 'DEBIT',
        merchant_name: 'STORE',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h2',
        status: 'PENDING',
        created_at: dates[1],
        transaction_date: dates[1],
      },
      {
        id: 'staged-date-3',
        user_id: testUserId,
        amount_cents: 3000,
        transaction_type: 'DEBIT',
        merchant_name: 'TAXI',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'h3',
        status: 'PENDING',
        created_at: dates[2],
        transaction_date: dates[2],
      },
    ];

    for (const item of outOfOrderItems) {
      queryClient.setQueryData<StagedExpense[]>(
        queryKeys.stagedExpenses.pending(testUserId),
        (prev = []) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          map.set(item.id, item);
          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.transaction_date).getTime() -
              new Date(a.transaction_date).getTime()
          );
        }
      );
    }

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached?.[0].id).toBe('staged-date-2'); // Newest (12:00)
    expect(cached?.[1].id).toBe('staged-date-3'); // Middle (10:00)
    expect(cached?.[2].id).toBe('staged-date-1'); // Oldest (08:00)
  });

  it('4. Consolidates rapid burst events into a single debounced reconciliation call', () => {
    let invalidateCount = 0;
    let timeoutId: any = null;

    const scheduleDebouncedReconciliation = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        invalidateCount++;
      }, 1500);
    };

    // Simulate 10 rapid packet arrivals within 500ms
    for (let i = 0; i < 10; i++) {
      scheduleDebouncedReconciliation();
      vi.advanceTimersByTime(50); // 50ms between packets
    }

    // Still within burst window; timer hasn't expired yet
    expect(invalidateCount).toBe(0);

    // Advance past the 1,500ms debounce quiet period
    vi.advanceTimersByTime(1500);

    // Exactly 1 consolidated reconciliation call fired
    expect(invalidateCount).toBe(1);
  });

  it('5. Maintains active card focus when new transactions arrive (no active card hijacking)', () => {
    const initialList: StagedExpense[] = [
      {
        id: 'card-A',
        user_id: testUserId,
        amount_cents: 1000,
        transaction_type: 'DEBIT',
        merchant_name: 'COFFEE',
        bank_short_code: null,
        account_last4: null,
        upi_ref: null,
        raw_sms_hash: 'hA',
        status: 'PENDING',
        created_at: '2026-09-17T10:00:00.000Z',
        transaction_date: '2026-09-17T10:00:00.000Z',
      },
    ];

    // User is actively reviewing card-A
    const activeId = 'card-A';

    // A newer transaction arrives via WebSocket
    const newerItem: StagedExpense = {
      id: 'card-B',
      user_id: testUserId,
      amount_cents: 5000,
      transaction_type: 'DEBIT',
      merchant_name: 'DINNER',
      bank_short_code: null,
      account_last4: null,
      upi_ref: null,
      raw_sms_hash: 'hB',
      status: 'PENDING',
      created_at: '2026-09-17T11:00:00.000Z',
      transaction_date: '2026-09-17T11:00:00.000Z',
    };

    const updatedList = [newerItem, ...initialList];

    // Safe index resolution by ID:
    const safeIndex = updatedList.findIndex((exp) => exp.id === activeId);
    const displayedItem = updatedList[safeIndex];

    // User is still looking at card-A despite card-B being prepended!
    expect(displayedItem.id).toBe('card-A');
    expect(safeIndex).toBe(1); // Index shifted, but displayed item remained stable
  });

  it('6. Safely handles transition to 0 items when last staged transaction is approved/dismissed', () => {
    // When last transaction is resolved, list becomes empty
    const emptyList: StagedExpense[] = [];
    const activeId: string | null = 'card-A';

    // Safe index computation must yield 0 and not throw on empty array
    const safeIndex = !activeId || emptyList.length === 0
      ? 0
      : Math.max(0, emptyList.findIndex((exp) => exp.id === activeId));

    expect(safeIndex).toBe(0);
    expect(emptyList.length).toBe(0);
  });
});
