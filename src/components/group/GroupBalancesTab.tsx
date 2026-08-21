import { Card, Button } from "antd";
import { CheckCircle2, Calculator } from "lucide-react";
import { formatCents } from "../../utils/currency";
import { UserAvatar } from "../ui/UserAvatar";

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-base mb-0">Group Balances</h2>
          <Button
            type="text"
            icon={<Calculator className="h-4 w-4 text-primary-500" />}
            onClick={onOpenLedger}
            className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 flex items-center gap-1"
          >
            Show Calculations
          </Button>
        </div>

        {displayedDebts.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
            <p className="font-medium text-text-base">Everyone is settled up!</p>
            <p className="text-xs">No outstanding balances in this group.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedDebts.map((debt, index) => {
              const fromProfile = getProfile(debt.from);
              const toProfile = getProfile(debt.to);
              const isUserDebtor = debt.from === userId;
              const isUserCreditor = debt.to === userId;
              const counterparty = isUserDebtor ? toProfile : fromProfile;

              return (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all bg-bg-surface border-border-base`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      user={counterparty || { id: isUserDebtor ? debt.to : debt.from, full_name: counterparty?.full_name || 'Member' }}
                      size={40}
                    />
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
