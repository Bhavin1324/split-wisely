import React from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight, Plus, Send, Users, PieChart, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatCents } from '../../utils/currency';

interface DashboardHeroCardProps {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
  onNavigateSpending: () => void;
  onNavigateYouOwe: () => void;
  onNavigateYouAreOwed: () => void;
  onOpenAddExpense: () => void;
  onOpenCreateGroup: () => void;
}

export const DashboardHeroCard = React.memo(function DashboardHeroCard({
  totalBalance,
  youOwe,
  youAreOwed,
  onNavigateSpending,
  onNavigateYouOwe,
  onNavigateYouAreOwed,
  onOpenAddExpense,
  onOpenCreateGroup,
}: DashboardHeroCardProps) {
  const isZero = totalBalance === 0;
  const isPositive = totalBalance > 0;

  return (
    <div className="rounded-3xl border border-border-base bg-bg-surface p-5 sm:p-7 shadow-xs relative overflow-hidden">
      {/* Top Title & Quick Link */}
      <div className="flex items-center justify-between text-xs text-text-muted mb-2">
        <span className="font-bold uppercase tracking-wider">Total Net Position</span>
        <button
          type="button"
          onClick={onNavigateSpending}
          className="font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Detailed Analytics</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Balance Number */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4">
        <div
          onClick={onNavigateSpending}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateSpending()}
          className={`font-financial text-4xl sm:text-5xl font-black tracking-tight cursor-pointer hover:opacity-90 transition-opacity ${
            isZero ? 'text-text-base' : isPositive ? 'text-success-text' : 'text-error-text'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatCents(totalBalance)}
        </div>
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1 rounded-full self-start sm:self-auto ${
            isZero
              ? 'text-text-muted bg-bg-subtle border-border-base'
              : isPositive
                ? 'text-success-text bg-success-bg border-success-border'
                : 'text-error-text bg-error-bg border-error-border'
          }`}
        >
          {isZero ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success-text" />
          ) : isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          <span>
            {isZero
              ? 'All settled up across groups'
              : isPositive
                ? 'You are overall in the green'
                : 'Net amount you owe across groups'}
          </span>
        </div>
      </div>

      {/* 2-Sided Balance Split (You Owe vs You Are Owed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-border-subtle">
        {/* You have to pay */}
        <div
          onClick={onNavigateYouOwe}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateYouOwe()}
          className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle/70 border border-border-subtle hover:border-error-border transition-all cursor-pointer group flex items-center justify-between active:scale-[0.98]"
        >
          <div>
            <div className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error-text shrink-0"></span>
              You have to pay
            </div>
            <div className="font-financial text-xl font-bold text-error-text mt-1">
              {youOwe > 0 ? `-${formatCents(youOwe)}` : formatCents(0)}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">Total amount to settle</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-error-text bg-error-bg px-2.5 py-1 rounded-xl group-hover:bg-error-text group-hover:text-text-inverse transition-all">
            <span>Settle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* You will receive */}
        <div
          onClick={onNavigateYouAreOwed}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigateYouAreOwed()}
          className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle/70 border border-border-subtle hover:border-success-border transition-all cursor-pointer group flex items-center justify-between active:scale-[0.98]"
        >
          <div>
            <div className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-text shrink-0"></span>
              You will receive
            </div>
            <div className="font-financial text-xl font-bold text-success-text mt-1">
              {youAreOwed > 0 ? `+${formatCents(youAreOwed)}` : formatCents(0)}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">Total amount owed to you</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-success-text bg-success-bg px-2.5 py-1 rounded-xl group-hover:border group-hover:border-success-text transition-all">
            <span>Collect</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="px-3.5 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.97] text-text-inverse font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Expense</span>
        </button>
        <button
          type="button"
          onClick={onNavigateYouOwe}
          className="px-3.5 py-2.5 rounded-2xl bg-bg-surface hover:bg-bg-subtle active:scale-[0.97] border border-border-base text-text-main font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-text-muted" />
          <span>Settle Up</span>
        </button>
        <button
          type="button"
          onClick={onOpenCreateGroup}
          className="px-3.5 py-2.5 rounded-2xl bg-bg-surface hover:bg-bg-subtle active:scale-[0.97] border border-border-base text-text-main font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-text-muted" />
          <span>New Group</span>
        </button>
        <button
          type="button"
          onClick={onNavigateSpending}
          className="px-3.5 py-2.5 rounded-2xl bg-bg-surface hover:bg-bg-subtle active:scale-[0.97] border border-border-base text-text-main font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <PieChart className="w-3.5 h-3.5 text-text-muted" />
          <span>Spending</span>
        </button>
      </div>
    </div>
  );
});
