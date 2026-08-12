import { Card, Avatar, Button } from "antd";
import { CheckCircle2, Calculator } from "lucide-react";
import { formatCents } from "../../utils/currency";

export function GroupBalancesTab({
  displayedDebts,
  userId,
  getProfile,
  onSettleUp,
  onOpenLedger,
}: {
  displayedDebts: any[];
  userId: string;
  getProfile: (id: string) => any;
  onSettleUp: (targetId: string, targetName: string, maxAmount: number) => void;
  onOpenLedger: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border-base shadow-sm">
        <h3 className="text-lg font-bold text-text-base mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary-500" />
          Simplified Repayment Instructions
        </h3>

        {displayedDebts.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-2 opacity-80" />
            <p className="font-medium text-gray-700">
              Everyone in this group is settled up!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedDebts.map((debt, index) => {
              const fromProfile = getProfile(debt.from);
              const toProfile = getProfile(debt.to);
              const isUserDebtor = debt.from === userId;
              const isUserCreditor = debt.to === userId;

              return (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all bg-bg-surface border-border-base`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      size="large"
                      style={{
                        backgroundColor: isUserDebtor
                          ? "#f43f5e"
                          : isUserCreditor
                            ? "#10b981"
                            : "#64748b",
                      }}
                    >
                      {isUserDebtor
                        ? toProfile?.full_name.charAt(0)
                        : fromProfile?.full_name.charAt(0)}
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-text-base">
                        {isUserDebtor ? (
                          <>
                            You owe{" "}
                            <strong className="text-text-base">
                              {toProfile?.full_name}
                            </strong>
                          </>
                        ) : isUserCreditor ? (
                          <>
                            <strong className="text-text-base">
                              {fromProfile?.full_name}
                            </strong>{" "}
                            owes you
                          </>
                        ) : (
                          <>
                            <strong className="text-text-base">
                              {fromProfile?.full_name}
                            </strong>{" "}
                            owes{" "}
                            <strong className="text-text-base">
                              {toProfile?.full_name}
                            </strong>
                          </>
                        )}
                      </div>
                      <div className="text-xl font-bold font-financial mt-0.5">
                        <span
                          className={
                            isUserDebtor
                              ? "text-error-text"
                              : isUserCreditor
                                ? "text-success-text"
                                : "text-gray-700"
                          }
                        >
                          {formatCents(debt.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isUserDebtor && (
                    <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => {
                          onSettleUp(debt.to, toProfile?.full_name, debt.amount);
                        }}
                        className="w-full sm:w-auto rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none text-white shadow-sm"
                      >
                        Settle Up
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 border-t border-border-base pt-4 flex justify-center">
          <Button
            type="link"
            icon={<Calculator className="h-4 w-4" />}
            onClick={onOpenLedger}
            className="text-text-muted hover:text-primary-600"
          >
            How are these calculated?
          </Button>
        </div>
      </Card>
    </div>
  );
}
