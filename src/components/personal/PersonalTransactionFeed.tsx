import { useState, useMemo } from "react";
import { Segmented, Empty, Button, Popconfirm } from "antd";
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
} from "lucide-react";
import { formatCents } from "../../utils/currency";
import type { PersonalTransaction } from "../../types";

interface PersonalTransactionFeedProps {
  transactions: PersonalTransaction[];
  onDeleteTransaction: (id: string) => void;
  onOpenAddTransaction: () => void;
  onSelectTransaction?: (transaction: PersonalTransaction) => void;
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
}: PersonalTransactionFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  const filteredTransactions = useMemo(() => {
    if (filter === "ALL") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

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
      {/* Segmented Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Segmented
          options={[
            { label: `All (${transactions.length})`, value: "ALL" },
            {
              label: `Income (${transactions.filter((t) => t.type === "INCOME").length})`,
              value: "INCOME",
            },
            {
              label: `Expense (${transactions.filter((t) => t.type === "EXPENSE").length})`,
              value: "EXPENSE",
            },
          ]}
          value={filter}
          onChange={(val) => setFilter(val as "ALL" | "INCOME" | "EXPENSE")}
          className="bg-bg-subtle p-1 self-start rounded-xl border border-border-base"
        />
        <div className="text-xs text-text-muted font-medium">
          Showing {filteredTransactions.length} transactions
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
                      onClick={() => onSelectTransaction?.(tx)}
                      className="flex items-center justify-between p-3.5 hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
                    >
                      {/* Left: Circular Avatar Icon & Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div
                          className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isIncome
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-text-base text-sm truncate group-hover:text-primary-500 transition-colors">
                            {paymentDescription || tx.category}
                          </div>
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
                        </div>
                      </div>

                      {/* Right: Amount & Actions (Increased Horizontal Gap) */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="text-right">
                          <div
                            className={`font-extrabold text-sm sm:text-base flex items-center justify-end gap-1 font-financial ${
                              isIncome ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-rose-500" />
                            )}
                            <span>
                              {isIncome ? "+" : "-"}
                              {formatCents(tx.amount)}
                            </span>
                          </div>
                        </div>

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
