import React from 'react';
import { InputNumber } from 'antd';
import { formatCents, getCurrencySymbol } from '../../utils/currency';

export interface ExactSplitTabProps {
  members: { user_id: string }[];
  exactAmounts: Record<string, number | null>;
  exactRemaining: number;
  memberName: (uid: string) => string;
  setExactAmounts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
}

export function ExactSplitTab({
  members,
  exactAmounts,
  exactRemaining,
  memberName,
  setExactAmounts,
}: ExactSplitTabProps) {
  return (
    <div className="space-y-1">
      <div className="divide-y divide-border-subtle/50">
        {members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-medium text-text-main block">
                {memberName(m.user_id)}
              </span>
            </div>
            <div className="shrink-0">
              <InputNumber
                size="large"
                prefix={getCurrencySymbol()}
                min={0}
                step={0.01}
                precision={2}
                stringMode={false}
                placeholder="0.00"
                inputMode="decimal"
                className="w-28 sm:w-36 shrink-0 rounded-xl font-financial text-sm font-semibold"
                value={exactAmounts[m.user_id]}
                onChange={(val) =>
                  setExactAmounts((prev) => ({ ...prev, [m.user_id]: val }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-2.5 rounded-xl px-3 py-2 text-xs font-semibold font-financial border ${
          exactRemaining === 0
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        }`}
      >
        {exactRemaining === 0
          ? '✓ Amounts add up perfectly'
          : exactRemaining > 0
            ? `${formatCents(exactRemaining)} remaining to assign`
            : `${formatCents(Math.abs(exactRemaining))} over the total`}
      </div>
    </div>
  );
}
