import { Button } from "antd";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import dayjs from "dayjs";

interface PersonalHeaderProps {
  monthYear: string; // "YYYY-MM"
  onMonthChange: (newMonthYear: string) => void;
  onOpenAddTransaction: () => void;
  onOpenSetBudget?: () => void;
  hasBudget?: boolean;
}

export function PersonalHeader({
  monthYear,
  onMonthChange,
  onOpenAddTransaction,
}: PersonalHeaderProps) {
  const dateObj = dayjs(`${monthYear}-01`);

  const handlePrevMonth = () => {
    const prev = dateObj.subtract(1, "month").format("YYYY-MM");
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = dateObj.add(1, "month").format("YYYY-MM");
    onMonthChange(next);
  };

  return (
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-main m-0">
        Personal Ledger
      </h1>

      {/* Right Controls: Month Selector + Desktop CTA */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-bg-surface border border-border-subtle rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-bg-surface-hover cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-text-main px-1.5 sm:px-2 min-w-[90px] sm:min-w-[110px] text-center whitespace-nowrap">
            {dateObj.format("MMMM YYYY")}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-bg-surface-hover cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop-only Add Transaction button (Mobile uses floating dock FAB) */}
        <div className="hidden md:block">
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={onOpenAddTransaction}
            className="rounded-xl font-semibold bg-primary-500 hover:bg-primary-600 border-none inline-flex items-center"
          >
            Add Transaction
          </Button>
        </div>
      </div>
    </div>
  );
}

