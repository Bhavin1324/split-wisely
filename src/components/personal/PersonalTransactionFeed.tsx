import { useState, useMemo } from "react";
import { Empty, Button, Popconfirm } from "antd";
import dayjs from "dayjs";
import {
  Utensils,
  Car,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  Banknote,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Tag,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Users,
} from "lucide-react";
import { formatCents } from "../../utils/currency";
import type { PersonalTransaction, Expense } from "../../types";

interface PersonalTransactionFeedProps {
  transactions: PersonalTransaction[];
  onDeleteTransaction: (id: string) => void;
  onOpenAddTransaction: () => void;
  onSelectTransaction?: (transaction: PersonalTransaction) => void;
  onSelectGroupExpense?: (expense: Expense) => void;
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  Food: Utensils,
  Transport: Car,
  Bills: Zap,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Health: HeartPulse,
  Salary: Banknote,
  Freelance: Laptop,
  Investments: TrendingUp,
  Gifts: Gift,
  Refund: RotateCcw,
  Other: Tag,
};

export function PersonalTransactionFeed({
  transactions,
  onDeleteTransaction,
  onOpenAddTransaction,
  onSelectTransaction,
  onSelectGroupExpense,
}: PersonalTransactionFeedProps) {
  type FilterKey = "ALL" | "EXPENSE" | "SOLO" | "GROUP" | "INCOME";
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");

  const totalCount = transactions.length;
  const expenseCount = useMemo(
    () => transactions.filter((t) => t.type === "EXPENSE").length,
    [transactions]
  );
  const soloExpenseCount = useMemo(
    () => transactions.filter((t) => t.type === "EXPENSE" && t.source !== "GROUP").length,
    [transactions]
  );
  const groupExpenseCount = useMemo(
    () => transactions.filter((t) => t.source === "GROUP").length,
    [transactions]
  );
  const incomeCount = useMemo(
    () => transactions.filter((t) => t.type === "INCOME").length,
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "EXPENSE") return t.type === "EXPENSE";
      if (activeFilter === "SOLO") return t.type === "EXPENSE" && t.source !== "GROUP";
      if (activeFilter === "GROUP") return t.source === "GROUP";
      if (activeFilter === "INCOME") return t.type === "INCOME";
      return true;
    });
  }, [transactions, activeFilter]);

  const filterChips = useMemo(() => {
    const chips: {
      key: FilterKey;
      label: string;
      count: number;
      icon?: React.ReactNode;
    }[] = [
      { key: "ALL", label: "All", count: totalCount },
      { key: "EXPENSE", label: "All Expenses", count: expenseCount },
    ];

    if (groupExpenseCount > 0) {
      chips.push(
        { key: "SOLO", label: "Solo Expenses", count: soloExpenseCount },
        {
          key: "GROUP",
          label: "Group Bills",
          count: groupExpenseCount,
          icon: <Users className="w-3 h-3 shrink-0" />,
        }
      );
    }

    chips.push({ key: "INCOME", label: "Income", count: incomeCount });

    return chips;
  }, [totalCount, expenseCount, soloExpenseCount, groupExpenseCount, incomeCount]);

  // Group by date ("Today", "Yesterday", "DD MMMM YYYY")
  const groupedByDate = useMemo(() => {
    const groups: Record<string, PersonalTransaction[]> = {};

    filteredTransactions.forEach((tx) => {
      const txDate = dayjs(tx.transaction_date);
      const today = dayjs();
      let dateKey = txDate.format("DD MMMM YYYY");

      if (txDate.isSame(today, "day")) {
        dateKey = "Today";
      } else if (txDate.isSame(today.subtract(1, "day"), "day")) {
        dateKey = "Yesterday";
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });

    return Object.entries(groups);
  }, [filteredTransactions]);

  return (
    <div className="space-y-4">
      {/* Filters Bar: Horizontally scrollable capsule chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1 flex-1 min-w-0">
            {filterChips.map((chip) => {
              const isSelected = activeFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setActiveFilter(chip.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? "bg-text-base text-bg-surface border-transparent shadow-xs font-bold"
                      : "bg-bg-subtle text-text-muted border-border-base hover:text-text-base hover:bg-bg-surface"
                  }`}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                      isSelected
                        ? "bg-bg-surface/20 text-bg-surface"
                        : "bg-bg-surface text-text-muted border border-border-subtle"
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-text-muted font-medium shrink-0 hidden sm:block">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="text-xs text-text-muted font-medium sm:hidden px-1">
          Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Feed List */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-5">
          {groupedByDate.map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                {dateGroup}
              </div>
              <div className="bg-bg-surface border border-border-base rounded-2xl divide-y divide-border-base overflow-hidden shadow-sm">
                {items.map((tx) => {
                  const Icon = CATEGORY_ICON_MAP[tx.category] || Tag;
                  const isIncome = tx.type === "INCOME";
                  const isGroup = tx.source === "GROUP";
                  const match = tx.description.match(
                    /^\[(UPI|CARD|CASH|BANK)\]\s*(.*)$/i,
                  );
                  const paymentMethod = match
                    ? (match[1].toLowerCase() as string)
                    : null;
                  const paymentDescription = match ? match[2] : null;

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (isGroup && tx.raw_expense && onSelectGroupExpense) {
                          onSelectGroupExpense(tx.raw_expense);
                        } else if (onSelectTransaction) {
                          onSelectTransaction(tx);
                        }
                      }}
                      className="flex items-center justify-between p-3.5 hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
                    >
                      {/* Left: Circular Avatar Icon & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div
                          className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isIncome
                              ? "bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-500)]"
                              : isGroup
                              ? "bg-primary-500/10 border-primary-500/20 text-primary-600"
                              : "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-500)]"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-text-base text-sm truncate group-hover:text-primary-500 transition-colors">
                            {paymentDescription || tx.description || tx.category}
                          </div>

                          {isGroup ? (
                            <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="bg-primary-500/10 text-primary-600 border border-primary-500/20 px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
                                {tx.group_name || "Group"} • Your share
                              </span>
                              <span>•</span>
                              <span className="bg-bg-subtle border border-border-base px-2 py-0.5 rounded-md text-xs font-medium text-text-muted">
                                {tx.category}
                              </span>
                              {tx.total_expense_amount && (
                                <span className="text-[11px] text-text-muted hidden sm:inline-block">
                                  (Bill: {formatCents(tx.total_expense_amount)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                              {paymentMethod && (
                                <span className="bg-bg-subtle border border-border-base px-2 py-0.5 rounded-md text-xs font-medium text-text-muted uppercase">
                                  {paymentMethod}
                                </span>
                              )}
                              <span>•</span>
                              <span className="bg-bg-subtle border border-border-base px-2 py-0.5 rounded-md text-xs font-medium text-text-muted">
                                {tx.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="text-right">
                          <div
                            className={`font-extrabold text-sm sm:text-base flex items-center justify-end gap-1 font-financial ${
                              isIncome ? "text-[var(--color-success-500)]" : "text-[var(--color-danger-500)]"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4 text-[var(--color-success-500)]" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-[var(--color-danger-500)]" />
                            )}
                            <span>
                              {isIncome ? "+" : "-"}
                              {formatCents(tx.amount)}
                            </span>
                          </div>
                        </div>

                        {isGroup ? (
                          <div
                            className="p-1.5 text-text-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
                            title="View full group bill"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                              title="Delete transaction?"
                              description="Are you sure you want to remove this record?"
                              onConfirm={() => onDeleteTransaction(tx.id)}
                              okText="Delete"
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                type="button"
                                className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Delete transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Popconfirm>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-base rounded-2xl p-8 text-center space-y-3">
          <Empty description="No personal transactions found for this month" />
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={onOpenAddTransaction}
            className="bg-primary-500 border-none rounded-xl"
          >
            Add Transaction
          </Button>
        </div>
      )}
    </div>
  );
}
