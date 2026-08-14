import { formatCents } from "../../utils/currency";
import type { PersonalLedgerSummary } from "../../hooks/usePersonalLedger";
import { ArrowDownLeft, ArrowUpRight, Wallet, Target, Sparkles, Pencil } from "lucide-react";
import { Button } from "antd";

interface PersonalHeroCardProps {
  summary: PersonalLedgerSummary;
  onOpenSetBudget: () => void;
}

export function PersonalHeroCard({ summary, onOpenSetBudget }: PersonalHeroCardProps) {
  const {
    openingBalance,
    totalIncome,
    totalExpense,
    closingBalance,
    budgetAmount,
    remainingBudget,
    safeDailyLimit,
    daysRemaining,
  } = summary;

  const isBudgetSet = budgetAmount !== null && budgetAmount > 0;

  // Percentage spent
  const percentageSpent = isBudgetSet ? Math.min(100, Math.round((totalExpense / budgetAmount) * 100)) : 0;
  const isOverBudget = isBudgetSet && totalExpense > budgetAmount;

  // Dynamic color logic for budget gauge
  let progressColorClass = "bg-emerald-500";
  let textColorClass = "text-emerald-500";
  let badgeBgClass = "bg-emerald-500/10 border-emerald-500/20";

  if (isOverBudget || percentageSpent > 90) {
    progressColorClass = "bg-rose-500";
    textColorClass = "text-rose-500";
    badgeBgClass = "bg-rose-500/10 border-rose-500/20";
  } else if (percentageSpent >= 70) {
    progressColorClass = "bg-amber-500";
    textColorClass = "text-amber-500";
    badgeBgClass = "bg-amber-500/10 border-amber-500/20";
  }

  // Net Closing Balance color formatting
  const closingBalanceColorClass =
    closingBalance > 0
      ? "text-emerald-500"
      : closingBalance < 0
      ? "text-rose-500"
      : "text-text-main";

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm space-y-6">
      {/* ── TOP SECTION: Budget Gauge & Safe Spending ── */}
      {isBudgetSet ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start justify-between sm:justify-start gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-text-muted flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary-500" />
                  Monthly Spending Budget
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-text-main mt-0.5 tracking-tight font-financial">
                  {formatCents(totalExpense)}{" "}
                  <span className="text-sm font-normal text-text-muted">
                    / {formatCents(budgetAmount)} ({percentageSpent}%)
                  </span>
                </div>
              </div>

              {/* Mobile Contextual Edit Pill */}
              <button
                type="button"
                onClick={onOpenSetBudget}
                className="text-xs px-2.5 py-1 rounded-lg border border-border-subtle bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors flex items-center gap-1.5 cursor-pointer font-medium sm:hidden"
                title="Edit Target Budget"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {safeDailyLimit !== null && (
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold font-financial ${badgeBgClass} ${textColorClass}`}>
                  Safe to spend: {formatCents(safeDailyLimit)} / day ({daysRemaining} days left)
                </div>
              )}
              {/* Desktop Contextual Edit Pill */}
              <button
                type="button"
                onClick={onOpenSetBudget}
                className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-lg border border-border-subtle bg-bg-surface-hover text-text-muted hover:text-text-main transition-colors items-center gap-1.5 cursor-pointer font-medium"
                title="Edit Target Budget"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-bg-subtle h-3 rounded-full overflow-hidden border border-border-subtle">
            <div
              className={`h-full transition-all duration-500 rounded-full ${progressColorClass}`}
              style={{ width: `${Math.min(100, Math.max(0, percentageSpent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            {isOverBudget ? (
              <span className="text-rose-500 font-medium font-financial">
                ⚠️ Over target budget by {formatCents(totalExpense - budgetAmount)}
              </span>
            ) : remainingBudget !== null ? (
              <span className="text-text-muted">
                Remaining Budget: <strong className="text-text-main font-financial">{formatCents(remainingBudget)}</strong>
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-subtle/50 p-4 rounded-xl border border-border-subtle">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Pure Cash Flow Mode
            </div>
            <div className="text-sm text-text-main">
              Set a monthly spending limit to unlock daily safe spending budgets and progress tracking.
            </div>
          </div>
          <Button
            size="small"
            icon={<Target className="w-3.5 h-3.5" />}
            onClick={onOpenSetBudget}
            className="rounded-lg text-xs font-semibold shrink-0"
          >
            Set Target Budget
          </Button>
        </div>
      )}

      {/* ── BOTTOM SECTION: Cash Flow Breakdown Grid ── */}
      <div className="pt-4 border-t border-border-base space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Monthly Cash Flow Summary
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Opening Balance */}
          <div className="p-3.5 rounded-xl bg-bg-subtle/70 border border-border-base space-y-1">
            <div className="text-xs text-text-muted font-medium">Opening Balance</div>
            <div className="text-base sm:text-lg font-bold text-text-base whitespace-nowrap truncate font-financial">
              {formatCents(openingBalance)}
            </div>
          </div>

          {/* Total Income */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Money In
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-500 whitespace-nowrap truncate font-financial">
              +{formatCents(totalIncome)}
            </div>
          </div>

          {/* Total Expense */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
            <div className="text-xs text-rose-500 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Money Out
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-500 whitespace-nowrap truncate font-financial">
              -{formatCents(totalExpense)}
            </div>
          </div>

          {/* Closing Balance */}
          <div className="p-3.5 rounded-xl bg-bg-subtle/70 border border-border-base space-y-1">
            <div className="text-xs text-text-muted font-medium flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-primary-500" />
              Net Closing Balance
            </div>
            <div className={`text-base sm:text-lg font-extrabold whitespace-nowrap truncate font-financial ${closingBalanceColorClass}`}>
              {formatCents(closingBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
