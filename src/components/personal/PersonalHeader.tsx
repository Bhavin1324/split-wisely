import { Button } from "antd";
import { ChevronLeft, ChevronRight, Target, Plus } from "lucide-react";
import dayjs from "dayjs";

interface PersonalHeaderProps {
  monthYear: string; // "YYYY-MM"
  onMonthChange: (newMonthYear: string) => void;
  onOpenSetBudget: () => void;
  onOpenAddTransaction: () => void;
  hasBudget: boolean;
}

export function PersonalHeader({
  monthYear,
  onMonthChange,
  onOpenSetBudget,
  onOpenAddTransaction,
  hasBudget,
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-base">
      {/* Title & Month Selector */}
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-base m-0">
          Personal Ledger
        </h1>
        <div className="flex items-center gap-1 bg-bg-subtle border border-border-base rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-text-muted hover:text-text-base transition-colors rounded-lg hover:bg-border-base"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-text-base px-2 min-w-[100px] text-center">
            {dateObj.format("MMMM YYYY")}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-text-muted hover:text-text-base transition-colors rounded-lg hover:bg-border-base"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          icon={<Target className="w-4 h-4" />}
          onClick={onOpenSetBudget}
          className="rounded-xl border-border-base text-text-base font-medium flex items-center"
        >
          {hasBudget ? "Edit Budget" : "Set Target Budget"}
        </Button>
        {/* Secondary + Add Transaction button hidden on mobile to avoid duplication with floating dock FAB */}
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={onOpenAddTransaction}
          className="hidden md:inline-flex rounded-xl font-semibold bg-primary-500 hover:bg-primary-600 border-none items-center"
        >
          Add Transaction
        </Button>
      </div>
    </div>
  );
}
