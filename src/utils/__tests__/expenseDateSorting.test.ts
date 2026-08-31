import { describe, it, expect } from 'vitest';
import { formatDate } from '../date';

describe('expense_date sorting and display resolution', () => {
  it('correctly prioritizes expense_date over created_at for display', () => {
    const expenseWithCustomDate = {
      id: 'exp-1',
      description: 'Dinner',
      created_at: '2026-08-31T10:00:00.000Z',
      expense_date: '2026-08-15T10:00:00.000Z',
    };

    const displayDate = formatDate(expenseWithCustomDate.expense_date ?? expenseWithCustomDate.created_at);
    // Should display August 15th, not August 31st
    expect(displayDate).toContain('15');
    expect(displayDate).not.toContain('31');
  });

  it('falls back to created_at when expense_date is missing or undefined', () => {
    const legacyExpense = {
      id: 'exp-2',
      description: 'Coffee',
      created_at: '2026-08-20T10:00:00.000Z',
      expense_date: undefined,
    };

    const displayDate = formatDate(legacyExpense.expense_date ?? legacyExpense.created_at);
    expect(displayDate).toContain('20');
  });

  it('correctly sorts feed items chronologically by expense_date', () => {
    const expenses = [
      {
        id: 'exp-new-but-backdated',
        description: 'Old receipt entered today',
        created_at: '2026-08-31T12:00:00.000Z',
        expense_date: '2026-08-01T12:00:00.000Z',
      },
      {
        id: 'exp-recent',
        description: 'Lunch yesterday',
        created_at: '2026-08-30T12:00:00.000Z',
        expense_date: '2026-08-30T12:00:00.000Z',
      },
      {
        id: 'exp-mid',
        description: 'Movie night',
        created_at: '2026-08-15T12:00:00.000Z',
        expense_date: '2026-08-15T12:00:00.000Z',
      },
    ];

    const sorted = [...expenses].sort(
      (a, b) => new Date(b.expense_date ?? b.created_at).getTime() - new Date(a.expense_date ?? a.created_at).getTime(),
    );

    expect(sorted[0].id).toBe('exp-recent'); // Aug 30
    expect(sorted[1].id).toBe('exp-mid');    // Aug 15
    expect(sorted[2].id).toBe('exp-new-but-backdated'); // Aug 1
  });
});
