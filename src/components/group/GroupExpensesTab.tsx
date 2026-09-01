import { Card, Empty, Button, App } from "antd";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { getCategoryIcon } from "../../utils/icons";
import { formatDate } from "../../utils/date";
import { formatCents } from "../../utils/currency";
import { deleteSettlement } from "../../hooks/supabase/useMutations";
import { DEMO_MODE, useAppData } from "../../context/AppDataContext";
import type { Expense } from "../../types";

export function GroupExpensesTab({
  feedItems,
  userId,
  getProfile,
  onSelectExpense,
  onOpenAddExpense,
  onRefresh,
}: {
  feedItems: any[];
  userId: string;
  getProfile: (id: string) => any;
  onSelectExpense: (expense: Expense) => void;
  onOpenAddExpense: () => void;
  onRefresh?: () => Promise<void> | void;
}) {
  const { modal, message } = App.useApp();
  const { refetchData } = useAppData();

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
                onClick={() => {
                  if (!DEMO_MODE) {
                    modal.confirm({
                      title: "Delete Payment",
                      content:
                        "Are you sure you want to delete this payment record?",
                      okText: "Delete",
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        try {
                          await deleteSettlement(settlement.id, {
                            group_id: settlement.group_id,
                            actor_id: userId,
                            payer_id: settlement.payer_id,
                            payee_id: settlement.payee_id,
                            amount: settlement.amount,
                            payer_name: payer?.full_name,
                            payee_name: payee?.full_name,
                          });
                          message.success("Payment deleted");
                          await refetchData();
                          if (onRefresh) {
                            await onRefresh();
                          }
                        } catch (error: any) {
                          message.error(
                            error.message || "Failed to delete payment",
                          );
                        }
                      },
                    });
                  } else {
                    message.info("Cannot delete settlements in Demo Mode.");
                  }
                }}
                className="flex items-center justify-between p-3 my-1 mx-auto w-full md:w-5/6 bg-bg-base border border-border-base rounded-full shadow-sm hover:border-error-border hover:bg-error-bg transition-all cursor-pointer group"
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

                <div className="mr-4 group-hover:opacity-100 transition-opacity flex items-center text-error-text bg-error-bg p-1.5 rounded-full">
                  <Trash2 className="h-4 w-4" />
                </div>
              </div>
            );
          }
        })
      )}
    </div>
  );
}
