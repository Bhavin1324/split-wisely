import React from 'react';
import { Button, InputNumber } from 'antd';
import { formatCents } from '../../utils/currency';

export interface SharesSplitTabProps {
  members: { user_id: string }[];
  shares: Record<string, number>;
  totalShares: number;
  totalCents: number;
  memberName: (uid: string) => string;
  setShares: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function SharesSplitTab({
  members,
  shares,
  totalShares,
  totalCents,
  memberName,
  setShares,
}: SharesSplitTabProps) {
  return (
    <div className="space-y-1">
      <div className="divide-y divide-border-subtle/50">
        {members.map((m) => {
          const userShare = shares[m.user_id] ?? 0;
          const shareAmount =
            totalShares > 0 && totalCents > 0
              ? Math.floor((userShare / totalShares) * totalCents)
              : 0;

          return (
            <div
              key={m.user_id}
              className="flex items-center justify-between gap-2.5 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-main">
                  {memberName(m.user_id)}
                </div>
                {totalCents > 0 && (
                  <div className="text-[11px] text-text-muted font-financial mt-0.5">
                    {formatCents(shareAmount)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="large"
                  disabled={userShare <= 0}
                  className="w-9 h-10 rounded-xl flex items-center justify-center p-0 text-base font-bold text-text-main"
                  onClick={() =>
                    setShares((prev) => ({
                      ...prev,
                      [m.user_id]: Math.max(0, (prev[m.user_id] ?? 0) - 1),
                    }))
                  }
                >
                  −
                </Button>
                <InputNumber
                  size="large"
                  min={0}
                  step={1}
                  precision={0}
                  placeholder="1"
                  inputMode="numeric"
                  controls={false}
                  className="w-14 sm:w-16 rounded-xl font-financial text-sm font-semibold text-center"
                  value={userShare}
                  onChange={(val) =>
                    setShares((prev) => ({ ...prev, [m.user_id]: val ?? 0 }))
                  }
                />
                <Button
                  size="large"
                  className="w-9 h-10 rounded-xl flex items-center justify-center p-0 text-base font-bold text-text-main"
                  onClick={() =>
                    setShares((prev) => ({
                      ...prev,
                      [m.user_id]: (prev[m.user_id] ?? 0) + 1,
                    }))
                  }
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 pt-2 border-t border-border-subtle/50 text-xs font-medium text-text-muted flex items-center justify-between">
        <span>Total shares:</span>
        <strong className="text-text-main font-financial text-sm">{totalShares}</strong>
      </div>
    </div>
  );
}
