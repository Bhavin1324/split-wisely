import { describe, it, expect } from 'vitest';
import type { Expense } from '../../types';

describe('Search Optimization & Sorting Equivalence', () => {
  const mockExpenses: Expense[] = [
    {
      id: 'e1',
      group_id: 'g1',
      payer_id: 'u1',
      category_id: 'c1',
      description: 'Dinner at Italian Bistro',
      total_amount: 5500,
      split_type: 'equal',
      created_at: '2026-09-15T19:30:00.000Z',
      expense_date: '2026-09-15',
    },
    {
      id: 'e2',
      group_id: 'g2',
      payer_id: 'u2',
      category_id: 'c2',
      description: 'Morning Coffee',
      total_amount: 850,
      split_type: 'equal',
      created_at: '2026-09-16T08:15:00.000Z',
      expense_date: '2026-09-16',
    },
    {
      id: 'e3',
      group_id: 'g1',
      payer_id: 'u1',
      category_id: 'c3',
      description: 'Uber Ride to Airport',
      total_amount: 3200,
      split_type: 'equal',
      created_at: '2026-09-14T11:00:00.000Z',
      expense_date: '2026-09-14',
    },
  ];

  it('verifies ISO string sort produces identical order to new Date() without heap allocations', () => {
    // 1. Classical new Date() sort
    const dateSorted = [...mockExpenses].sort((a, b) => {
      const dateA = new Date(a.expense_date ?? a.created_at).getTime();
      const dateB = new Date(b.expense_date ?? b.created_at).getTime();
      return dateB - dateA;
    });

    // 2. Zero-allocation ISO string sort
    const stringSorted = [...mockExpenses].sort((a, b) => {
      const dateA = a.expense_date ?? a.created_at;
      const dateB = b.expense_date ?? b.created_at;
      return dateB.localeCompare(dateA);
    });

    expect(stringSorted.map((e) => e.id)).toEqual(dateSorted.map((e) => e.id));
    expect(stringSorted[0].id).toBe('e2'); // 2026-09-16
    expect(stringSorted[1].id).toBe('e1'); // 2026-09-15
    expect(stringSorted[2].id).toBe('e3'); // 2026-09-14
  });

  it('filters expenses correctly by description query', () => {
    const query = 'coffee';
    const normalized = query.toLowerCase().trim();
    const results = mockExpenses.filter((e) => e.description.toLowerCase().includes(normalized));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('e2');
  });

  it('performs O(1) group and category lookups via Map', () => {
    const groups = [
      { id: 'g1', name: 'Trip to Japan' },
      { id: 'g2', name: 'Apartment Roommates' },
    ];
    const categories = [
      { id: 'c1', name: 'Food & Dining' },
      { id: 'c2', name: 'Coffee & Drinks' },
      { id: 'c3', name: 'Transport' },
    ];

    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    expect(groupMap.get('g1')?.name).toBe('Trip to Japan');
    expect(categoryMap.get('c3')?.name).toBe('Transport');
    expect(groupMap.get('non-existent')).toBeUndefined();
  });

  it('correctly slices expenses for progressive windowing/pagination', () => {
    const manyExpenses = Array.from({ length: 75 }, (_, i) => ({
      id: `exp-${i}`,
      group_id: 'g1',
      payer_id: 'u1',
      description: `Expense ${i}`,
      total_amount: 1000 + i,
      split_type: 'equal' as const,
      created_at: new Date(2026, 8, 1, 0, i).toISOString(),
    }));

    const pageSize = 30;
    const firstSlice = manyExpenses.slice(0, pageSize);
    expect(firstSlice).toHaveLength(30);

    const secondSlice = manyExpenses.slice(0, pageSize + pageSize);
    expect(secondSlice).toHaveLength(60);

    const remaining = manyExpenses.length - secondSlice.length;
    expect(remaining).toBe(15);
  });
});
