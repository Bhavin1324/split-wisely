import { Card, Button } from "antd";
import { CheckCircle2, Calculator, Sparkles } from "lucide-react";
import { formatCents } from "../../utils/currency";
import { UserAvatar } from "../ui/UserAvatar";

export function GroupBalancesTab({
  displayedDebts,
  userId,
  getProfile,
  onSettleUp,
  onOpenLedger,
  onOpenVisualizer,
}: {
  displayedDebts: any[];
  userId: string;
  getProfile: (id: string) => any;
  onSettleUp: (targetId: string, targetName: string, maxAmount: number) => void;
  onOpenLedger: () => void;
  onOpenVisualizer?: (targetUserId?: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-semibold text-text-base mb-0">Group Balances</h2>
          <div className="flex items-center gap-2">
            {onOpenVisualizer && (
              <Button
                type="primary"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => onOpenVisualizer(userId)}
                className="text-xs font-semibold bg-primary-500 hover:bg-primary-600 rounded-lg flex items-center gap-1 shadow-xs border-none text-white"
              >
                Visual Debt Explainer
              </Button>
            )}
            <Button
              type="text"
              icon={<Calculator className="h-3.5 w-3.5 text-text-muted" />}
              onClick={onOpenLedger}
              className="text-xs font-semibold text-text-muted hover:text-text-base flex items-center gap-1"
            >
              Raw Ledger
            </Button>
          </div>
        </div>

        {displayedDebts.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success-text" />
            <p className="font-medium text-text-base mb-0.5">Everyone is settled up!</p>
            <p className="text-xs text-text-muted">No outstanding balances in this group.</p>
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all bg-bg-surface border-border-base"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      user={counterparty || { id: isUserDebtor ? debt.to : debt.from, full_name: counterparty?.full_name || 'Member' }}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-base truncate">
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
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-lg sm:text-xl font-bold font-financial">
                          <span
                            className={
                              isUserDebtor
                                ? "text-error-text"
                                : isUserCreditor
                                ? "text-success-text"
                                : "text-text-base"
                            }
                          >
                            {formatCents(debt.amount)}
                          </span>
                        </div>
                        {onOpenVisualizer && (
                          <button
                            type="button"
                            onClick={() => onOpenVisualizer(isUserDebtor ? debt.from : debt.to)}
                            className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 hover:underline cursor-pointer bg-primary-500/10 px-2 py-0.5 rounded-md"
                          >
                            <Sparkles className="w-3 h-3 text-primary-500" />
                            <span>Why this transfer?</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUserDebtor && (
                    <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
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

        <div className="mt-6 border-t border-border-base pt-4 flex flex-wrap items-center justify-center gap-4">
          {onOpenVisualizer && (
            <Button
              type="default"
              icon={<Sparkles className="h-4 w-4 text-primary-500" />}
              onClick={() => onOpenVisualizer(userId)}
              className="text-xs font-semibold rounded-xl border-border-base hover:border-primary-500 hover:text-primary-600"
            >
              Open Debt Flow Map
            </Button>
          )}
          <Button
            type="text"
            icon={<Calculator className="h-4 w-4" />}
            onClick={onOpenLedger}
            className="text-xs font-semibold text-text-muted hover:text-text-base"
          >
            How are these calculated?
          </Button>
        </div>
      </Card>
    </div>
  );
}
