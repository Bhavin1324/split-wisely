import React from 'react';
import { Receipt } from 'lucide-react';
import type { Expense } from '../../types';
import { ActivityItem } from './ActivityItem';

interface DashboardActivitySectionProps {
  recentActivity: { month: string; expenses: Expense[] }[];
  userId: string;
  groupNameMap: Map<string, string>;
  onSelectExpense: (expense: Expense) => void;
  onNavigateSpending: () => void;
}

export const DashboardActivitySection = React.memo(function DashboardActivitySection({
  recentActivity,
  userId,
  groupNameMap,
  onSelectExpense,
  onNavigateSpending,
}: DashboardActivitySectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-base sm:text-lg font-bold text-text-base">
        Recent Activity
      </h2>

      <div className="space-y-6">
        {recentActivity.map(({ month, expenses }) => (
          <div key={month}>
            {/* Month header */}
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {month}
              </h3>
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="font-financial text-[11px] text-text-muted">
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Expense items */}
            <div className="space-y-2.5">
              {expenses.map((expense) => (
                <ActivityItem
                  key={expense.id}
                  expense={expense}
                  userId={userId}
                  groupName={groupNameMap.get(expense.group_id ?? '')}
                  onClick={onSelectExpense}
                />
              ))}
            </div>
          </div>
        ))}

        {recentActivity.length > 0 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onNavigateSpending}
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors cursor-pointer inline-flex items-center gap-1 py-1 px-3 rounded-full hover:bg-primary-500/10"
            >
              <span>View all spending & activity</span>
              <span>→</span>
            </button>
          </div>
        )}

        {recentActivity.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border-base py-16 text-center bg-bg-surface">
            <Receipt className="mx-auto h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">No recent activity</p>
          </div>
        )}
      </div>
    </section>
  );
});
