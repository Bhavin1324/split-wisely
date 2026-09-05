import { useState } from "react";
import { Card, Empty, Button } from "antd";
import { Plus, DollarSign, ChevronRight } from "lucide-react";
import { getCategoryIcon } from "../../utils/icons";
import { formatDate } from "../../utils/date";
import { formatCents } from "../../utils/currency";
import { PaymentDetailsModal } from "./PaymentDetailsModal";
import type { Expense } from "../../types";

export function GroupExpensesTab({
  feedItems,
  userId,
  getProfile,
  onSelectExpense,
  onOpenAddExpense,
  groupName,
  onRefresh,
}: {
  feedItems: any[];
  userId: string;
  getProfile: (id: string) => any;
  onSelectExpense: (expense: Expense) => void;
  onOpenAddExpense: () => void;
  groupName?: string;
  onRefresh?: () => Promise<void> | void;
}) {
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);

  return (
    <div className="space-y-3">
      {feedItems.length === 0 ? (
        <Card className="rounded-2xl text-center py-12">
          <Empty description="No activities recorded in this group yet" />
          <Button
            type="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={onOpenAddExpense}
            className="mt-4"
          >
            Add First Expense
          </Button>
        </Card>
      ) : (
        feedItems.map((item) => {
          if (item.type === "expense") {
            const expense = item.data;
            const payer = getProfile(expense.payer_id);
            const isUserPayer = expense.payer_id === userId;
            const userSplit = expense.splits?.find(
              (s: any) => s.user_id === userId,
            );
            const userOwesAmount = userSplit?.amount_owed ?? 0;

            return (
              <div
                key={`expense-${expense.id}`}
                onClick={() => onSelectExpense(expense)}
                className="flex items-center justify-between p-4 bg-bg-surface rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                    {(() => {
                      const CatIcon = getCategoryIcon(expense.category);
                      return <CatIcon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <div className="font-semibold text-text-base">
                      {expense.description}
                    </div>
                    <div className="text-xs text-text-muted flex flex-wrap items-center gap-2 mt-0.5">
                      <span>
                        Paid by{" "}
                        <strong className="text-text-base">
                          {isUserPayer ? "You" : payer?.full_name}
                        </strong>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatDate(expense.expense_date ?? expense.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold font-financial text-text-base">
                    {formatCents(expense.total_amount)}
                  </div>
                  <div className="text-xs mt-0.5">
                    {isUserPayer ? (
                      <span className="text-success-text font-medium">
                        You lent{" "}
                        {formatCents(expense.total_amount - userOwesAmount)}
                      </span>
                    ) : (
                      <span className="text-error-text font-medium">
                        You owe {formatCents(userOwesAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          } else {
            const settlement = item.data;
            const payer = getProfile(settlement.payer_id);
            const payee = getProfile(settlement.payee_id);
            const isUserPayer = settlement.payer_id === userId;
            const isUserPayee = settlement.payee_id === userId;

            return (
              <div
                key={`settlement-${settlement.id}`}
                onClick={() => setSelectedSettlement(settlement)}
                className="flex items-center justify-between p-3 my-1 mx-auto w-full md:w-5/6 bg-bg-base border border-border-base rounded-full shadow-sm hover:border-success-border hover:bg-success-bg/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 ml-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-bg text-success-text">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <strong className="text-text-base">
                      {isUserPayer ? "You" : payer?.full_name}
                    </strong>
                    <span className="text-text-muted">paid</span>
                    <strong className="text-text-base">
                      {isUserPayee ? "You" : payee?.full_name}
                    </strong>
                    <strong className="text-success-text ml-1 font-financial bg-success-bg px-2 py-0.5 rounded-full">
                      {formatCents(settlement.amount)}
                    </strong>
                    <span className="text-xs text-text-muted ml-2 hidden sm:inline-block">
                      • {formatDate(settlement.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mr-3 text-text-muted group-hover:text-text-base transition-colors flex items-center">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          }
        })
      )}

      {/* Payment Details / Dispute Modal */}
      <PaymentDetailsModal
        open={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
        currentUserId={userId}
        getProfile={getProfile}
        groupName={groupName}
        onRefresh={onRefresh}
      />
    </div>
  );
}
