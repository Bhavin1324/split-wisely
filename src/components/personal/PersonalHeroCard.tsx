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
    effectiveExpense,
    closingBalance,
    budgetAmount,
    remainingBudget,
    remainingBudgetStrict,
    dynamicBudgetEnabled,
    safeDailyLimit,
    daysRemaining,
  } = summary;

  const isBudgetSet = budgetAmount !== null && budgetAmount > 0;
  const isOverBudget = isBudgetSet && remainingBudget !== null && remainingBudget < 0;
  const percentageSpent = isBudgetSet
    ? Math.min(100, Math.max(0, Math.round((effectiveExpense / budgetAmount) * 100)))
    : 0;
  const overAmount = isOverBudget && remainingBudget !== null ? Math.abs(remainingBudget) : 0;

  // Dynamic color logic for budget gauge
  let progressColorClass = "bg-[var(--color-success-500)]";
  let textColorClass = "text-[var(--color-success-500)]";
  let badgeBgClass = "bg-[var(--color-success-bg)] border-[var(--color-success-border)]";

  if (isOverBudget || percentageSpent > 90) {
    progressColorClass = "bg-[var(--color-danger-500)]";
    textColorClass = "text-[var(--color-danger-500)]";
    badgeBgClass = "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)]";
  } else if (percentageSpent >= 70) {
    progressColorClass = "bg-[var(--color-warning-500)]";
    textColorClass = "text-[var(--color-warning-500)]";
    badgeBgClass = "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]";
  }

  // Net Closing Balance color formatting
  const closingBalanceColorClass =
    closingBalance !== null && closingBalance > 0
      ? "text-[var(--color-success-500)]"
      : closingBalance !== null && closingBalance < 0
      ? "text-[var(--color-danger-500)]"
      : "text-text-main";

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm space-y-6">
      {/* ── TOP SECTION: Budget Gauge & Safe Spending ── */}
      {isBudgetSet ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start justify-between sm:justify-start gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-text-muted flex items-center gap-1.5 flex-wrap">
                  <Target className="w-3.5 h-3.5 text-primary-500" />
                  Monthly Spending Budget
                  {dynamicBudgetEnabled && totalIncome > 0 && (
                    <span className="text-[10px] font-medium text-[var(--color-success-500)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)] px-1.5 py-0.5 rounded-md normal-case tracking-normal">
                      Dynamic (-{formatCents(totalIncome)} offset)
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-text-main mt-0.5 tracking-tight font-financial">
                  {formatCents(effectiveExpense)}{" "}
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
              <span className="text-[var(--color-danger-500)] font-medium font-financial">
                ⚠️ Over target budget by {formatCents(overAmount)}
              </span>
            ) : remainingBudget !== null ? (
              <span className="text-text-muted">
                Remaining Budget: <strong className="text-text-main font-financial">{formatCents(remainingBudget)}</strong>
                {dynamicBudgetEnabled && totalIncome > 0 && (
                  <span className="text-text-muted text-[11px] ml-1.5 font-normal">
                    (Strict: {formatCents(remainingBudgetStrict ?? 0)})
                  </span>
                )}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-subtle/50 p-4 rounded-xl border border-border-subtle">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              No Budget Set
            </div>
            <div className="text-sm text-text-main">
              Set a monthly spending limit to unlock daily safe spending limits, progress tracking, and dynamic offsetting.
            </div>
          </div>
          <Button
            size="small"
            icon={<Target className="w-3.5 h-3.5" />}
            onClick={onOpenSetBudget}
            className="rounded-lg text-xs font-semibold shrink-0"
          >
            + Set Monthly Budget
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
            <div className="text-xs text-text-muted font-medium flex items-center justify-between">
              <span>Opening Balance</span>
              {openingBalance === null && (
                <button
                  type="button"
                  onClick={onOpenSetBudget}
                  className="text-[10px] text-primary-500 hover:underline cursor-pointer font-medium"
                >
                  + Set
                </button>
              )}
            </div>
            <div className="text-base sm:text-lg font-bold text-text-base whitespace-nowrap truncate font-financial">
              {openingBalance !== null ? formatCents(openingBalance) : "—"}
            </div>
          </div>

          {/* Total Income */}
          <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] space-y-1">
            <div className="text-xs text-[var(--color-success-500)] font-semibold flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Money In
            </div>
            <div className="text-base sm:text-lg font-bold text-[var(--color-success-500)] whitespace-nowrap truncate font-financial">
              +{formatCents(totalIncome)}
            </div>
          </div>

          {/* Total Expense */}
          <div className="p-3.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] space-y-1">
            <div className="text-xs text-[var(--color-danger-500)] font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Money Out
            </div>
            <div className="text-base sm:text-lg font-bold text-[var(--color-danger-500)] whitespace-nowrap truncate font-financial">
              -{formatCents(totalExpense)}
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="p-3.5 rounded-xl bg-bg-subtle/70 border border-border-base space-y-1">
            <div className="text-xs text-text-muted font-medium flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-primary-500" />
              Net Cash Flow
            </div>
            <div className={`text-base sm:text-lg font-extrabold whitespace-nowrap truncate font-financial ${summary.netCashFlow >= 0 ? "text-[var(--color-success-500)]" : "text-[var(--color-danger-500)]"}`}>
              {summary.netCashFlow >= 0 ? "+" : ""}{formatCents(summary.netCashFlow)}
            </div>
          </div>
        </div>
      </div>

      {/* Available Balance Banner */}
      <div className="mt-3 p-3.5 rounded-xl bg-bg-subtle/70 border border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-text-muted font-semibold">
            <Wallet className="w-3.5 h-3.5 text-primary-500" />
            Available Balance
          </div>
          {closingBalance === null && (
            <p className="text-xs text-text-muted m-0">
              Configure your starting balance to track real-time net funds.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {closingBalance !== null ? (
            <div className={`text-lg font-extrabold font-financial ${closingBalanceColorClass}`}>
              {formatCents(closingBalance)}
            </div>
          ) : (
            <Button
              type="dashed"
              size="small"
              onClick={onOpenSetBudget}
              className="rounded-lg text-xs font-semibold text-primary-500 border-primary-500/40 hover:border-primary-500"
            >
              + Set Starting Balance
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
