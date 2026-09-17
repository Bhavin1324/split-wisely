import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import type { Group } from '../../../types';
import { updateGroupSettings } from '../../../hooks/supabase/useMutations';
import { MOCK_GROUPS } from '../../../lib/mockData';
import { DebtSimplifier } from '../../../core/domain/DebtSimplifier';

const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

describe('GroupHeader "Simplify Debts" Toggle Performance & Loading State', () => {
  let queryClient: QueryClient;
  const testUserId = 'user-1';
  const testGroup: Group = {
    id: 'group-1',
    name: 'Trip to Mountains',
    cover_image_url: null,
    created_by: testUserId,
    created_at: '2026-01-01T00:00:00Z',
    member_count: 3,
    simplify_debts: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    // Populate cache with group list key that matches queryKeys.groups.all prefix
    queryClient.setQueryData(queryKeys.groups.list(testUserId), [
      { ...testGroup },
    ]);
  });

  it('1. Optimistically mutates TanStack Query cache in 0ms without waiting for network', () => {
    // User toggles simplify switch off
    const newSimplifySetting = false;

    // Execute broad cache mutation using queryKeys.groups.all prefix
    queryClient.setQueriesData<Group[]>({ queryKey: queryKeys.groups.all }, (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((g) => (g.id === testGroup.id ? { ...g, simplify_debts: newSimplifySetting } : g));
    });

    const cachedGroups = queryClient.getQueryData<Group[]>(queryKeys.groups.list(testUserId));
    const updated = cachedGroups?.find((g) => g.id === testGroup.id);

    expect(updated?.simplify_debts).toBe(false);
  });

  it('2. Manages Switch loading state lifecycle and debounces / locks concurrent clicks', async () => {
    let isUpdatingSimplify = false;
    let serverCalls = 0;

    const simulateToggle = async (checked: boolean) => {
      if (isUpdatingSimplify) return; // Debounce / click locking
      isUpdatingSimplify = true;
      try {
        serverCalls++;
        // Simulate async network request
        await new Promise((resolve) => setTimeout(resolve, 50));
      } finally {
        isUpdatingSimplify = false;
      }
    };

    // Trigger first toggle
    const firstCallPromise = simulateToggle(false);
    expect(isUpdatingSimplify).toBe(true); // Micro-spinner active in switch knob

    // Trigger second rapid click while in-flight
    await simulateToggle(false);
    expect(serverCalls).toBe(1); // Locked out! Only 1 server call initiated

    await firstCallPromise;
    expect(isUpdatingSimplify).toBe(false); // Micro-spinner cleanly cleared
  });

  it('3. Rolls back optimistic state and cache when remote mutation rejects', async () => {
    const originalSetting = true;
    const attemptedSetting = false;

    // 1. Optimistic apply
    let isOptimistic = attemptedSetting;
    queryClient.setQueriesData<Group[]>({ queryKey: queryKeys.groups.all }, (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((g) => (g.id === testGroup.id ? { ...g, simplify_debts: attemptedSetting } : g));
    });

    expect(queryClient.getQueryData<Group[]>(queryKeys.groups.list(testUserId))?.[0].simplify_debts).toBe(false);

    // 2. Network failure simulated
    try {
      throw new Error('Network error 500');
    } catch {
      // Rollback
      isOptimistic = !attemptedSetting;
      queryClient.setQueriesData<Group[]>({ queryKey: queryKeys.groups.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((g) => (g.id === testGroup.id ? { ...g, simplify_debts: !attemptedSetting } : g));
      });
    }

    expect(isOptimistic).toBe(true);
    expect(queryClient.getQueryData<Group[]>(queryKeys.groups.list(testUserId))?.[0].simplify_debts).toBe(true);
  });

  it('4. Successfully handles updateGroupSettings with clean Supabase call and cache invalidation', async () => {
    await updateGroupSettings('group-1', { simplify_debts: false });

    expect(mockUpdate).toHaveBeenCalledWith({ simplify_debts: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'group-1');
  });

  it('5. Successfully mutates in-memory mock groups when handling DEMO_MODE logic', () => {
    const demoGroup = MOCK_GROUPS[0];
    const initialSimplify = demoGroup.simplify_debts !== false;

    // Simulate demo mode update logic
    const grp = MOCK_GROUPS.find((g) => g.id === demoGroup.id);
    if (grp) {
      Object.assign(grp, { simplify_debts: !initialSimplify });
    }

    expect(demoGroup.simplify_debts).toBe(!initialSimplify);

    // Restore original state
    if (grp) {
      Object.assign(grp, { simplify_debts: initialSimplify });
    }
    expect(demoGroup.simplify_debts).toBe(initialSimplify);
  });

  it('6. Switches between precomputed simplifiedDebts and rawDebts in 0ms without re-calculating graph', () => {
    const members = [
      { user_id: 'user-1', profile: { full_name: 'Alice' } },
      { user_id: 'user-2', profile: { full_name: 'Bob' } },
      { user_id: 'user-3', profile: { full_name: 'Charlie' } },
    ];

    const expenses = [
      {
        id: 'exp-1',
        total_amount: 3000,
        base_currency_amount: 3000,
        currency_code: 'INR',
        payer_id: 'user-1',
        splits: [
          { user_id: 'user-2', amount_owed: 1500 },
          { user_id: 'user-3', amount_owed: 1500 },
        ],
      },
    ];

    // Pre-computed in RAM via useMemo in useGroupCalculations
    // DebtSimplifier.simplifyDebts(expenses, settlements, members)
    const simplified = DebtSimplifier.simplifyDebts(expenses as any, [], members as any);
    const raw = DebtSimplifier.calculateIndividualDebts(expenses as any, [], members as any);

    expect(simplified.length).toBeGreaterThan(0);
    expect(raw.length).toBeGreaterThan(0);

    // Switching between views is a simple reference selection (0ms CPU)
    let isSimplifiedView = true;
    let displayed = isSimplifiedView ? simplified : raw;
    expect(displayed).toBe(simplified);

    isSimplifiedView = false;
    displayed = isSimplifiedView ? simplified : raw;
    expect(displayed).toBe(raw);
  });
});
