import React from "react";
import { Tag } from "antd";
import { CheckCircle2 } from "lucide-react";
import { formatCents } from "../../utils/currency";

interface GroupStatusCardProps {
  isSimplified: boolean;
  myDebts: any[];
  userId: string;
  getProfile: (id: string) => any;
}

export const GroupStatusCard = React.memo(function GroupStatusCard({
  isSimplified,
  myDebts,
  userId,
  getProfile,
}: GroupStatusCardProps) {
  return (
    <div className="bg-bg-subtle rounded-xl p-3 sm:p-4 border border-border-base">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
          Your Status
        </div>
        {isSimplified ? (
          <Tag className="rounded-full text-[10px] font-semibold border-none px-2 py-0.5 m-0 bg-primary-500/10 text-primary-500">
            Simplified View
          </Tag>
        ) : (
          <Tag className="rounded-full text-[10px] font-semibold border-none px-2 py-0.5 m-0 bg-bg-surface text-text-muted">
            Direct Balances View
          </Tag>
        )}
      </div>
      {myDebts.length === 0 ? (
        <div className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-4 w-4" /> All settled up!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {myDebts.map((debt, idx) => {
            const isOwe = debt.from === userId;
            const otherPersonId = isOwe ? debt.to : debt.from;
            const otherPerson = getProfile(otherPersonId);
            const otherName = otherPerson?.full_name ?? otherPersonId;

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 text-sm bg-bg-surface rounded-lg px-3 py-2 border border-border-base"
              >
                <span className="text-text-base truncate">
                  {isOwe ? (
                    <>
                      You owe <strong>{otherName}</strong>
                    </>
                  ) : (
                    <>
                      <strong>{otherName}</strong> owes you
                    </>
                  )}
                </span>
                <span
                  className={`font-bold font-financial shrink-0 ${
                    isOwe ? "text-error-text" : "text-success-text"
                  }`}
                >
                  {formatCents(debt.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
