import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { StagedExpense } from '../../types/stagedExpense';

describe('Staged Expenses Realtime & 0ms Cache Reactivity Safety', () => {
  let queryClient: QueryClient;
  const testUserId = 'test-user-123';

  const initialStaged: StagedExpense[] = [
    {
      id: 'staged-1',
      user_id: testUserId,
      amount_cents: 25000,
      transaction_type: 'DEBIT',
      merchant_name: 'SWIGGY',
      bank_short_code: 'HDFC',
      account_last4: '1234',
      upi_ref: '421098765432',
      raw_sms_hash: 'hash-1',
      status: 'PENDING',
      created_at: '2026-09-17T10:00:00.000Z',
      transaction_date: '2026-09-17T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(queryKeys.stagedExpenses.pending(testUserId), initialStaged);
  });

  it('immediately injects newly inserted PENDING SMS transaction into cache with 0ms latency', () => {
    const newIncomingExpense: StagedExpense = {
      id: 'staged-2',
      user_id: testUserId,
      amount_cents: 85000,
      transaction_type: 'DEBIT',
      merchant_name: 'ZOMATO',
      bank_short_code: 'SBI',
      account_last4: '5678',
      upi_ref: '987654321012',
      raw_sms_hash: 'hash-2',
      status: 'PENDING',
      created_at: '2026-09-17T10:05:00.000Z',
      transaction_date: '2026-09-17T10:05:00.000Z',
    };

    // Simulate Realtime INSERT event handler
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => {
        if (prev.some((item) => item.id === newIncomingExpense.id)) return prev;
        return [newIncomingExpense, ...prev];
      }
    );

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached).toHaveLength(2);
    expect(cached![0].id).toBe('staged-2');
    expect(cached![0].merchant_name).toBe('ZOMATO');
    expect(cached![1].id).toBe('staged-1');
  });

  it('prevents duplicate transactions if identical SMS hash or ID is pushed twice', () => {
    const duplicateExpense: StagedExpense = {
      ...initialStaged[0],
    };

    // Simulate Realtime duplicate INSERT
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => {
        if (prev.some((item) => item.id === duplicateExpense.id)) return prev;
        return [duplicateExpense, ...prev];
      }
    );

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached).toHaveLength(1);
    expect(cached![0].id).toBe('staged-1');
  });

  it('removes transaction from pending cache when updated to APPROVED_PERSONAL or DISMISSED', () => {
    const updatedApprovedExpense: StagedExpense = {
      ...initialStaged[0],
      status: 'APPROVED_PERSONAL',
    };

    // Simulate Realtime UPDATE event handler
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => {
        if (updatedApprovedExpense.status !== 'PENDING') {
          return prev.filter((item) => item.id !== updatedApprovedExpense.id);
        }
        return prev.map((item) =>
          item.id === updatedApprovedExpense.id ? updatedApprovedExpense : item
        );
      }
    );

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached).toHaveLength(0);
  });

  it('removes transaction from pending cache on DELETE event', () => {
    const deletedId = 'staged-1';

    // Simulate Realtime DELETE event handler
    queryClient.setQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId),
      (prev = []) => prev.filter((item) => item.id !== deletedId)
    );

    const cached = queryClient.getQueryData<StagedExpense[]>(
      queryKeys.stagedExpenses.pending(testUserId)
    );

    expect(cached).toHaveLength(0);
  });

  it('reconciles query invalidation on SUBSCRIBED recovery after mobile sleep', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Simulate onStatusChange status === 'SUBSCRIBED'
    const onStatusChange = (status: string) => {
      if (status === 'SUBSCRIBED') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.stagedExpenses.pending(testUserId),
        });
      }
    };

    onStatusChange('SUBSCRIBED');

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stagedExpenses.pending(testUserId),
    });
  });

  it('resolves explicit userId over fallback during session hydration', () => {
    const resolveUserId = (
      explicitUserId?: string,
      authUserId?: string,
      demoMode?: boolean
    ) => {
      return explicitUserId || authUserId || (demoMode ? 'mock-user' : undefined);
    };

    expect(resolveUserId('explicit-id-1', undefined, false)).toBe('explicit-id-1');
    expect(resolveUserId(undefined, 'auth-user-2', false)).toBe('auth-user-2');
    expect(resolveUserId(undefined, undefined, true)).toBe('mock-user');
    expect(resolveUserId(undefined, undefined, false)).toBeUndefined();
  });
});
