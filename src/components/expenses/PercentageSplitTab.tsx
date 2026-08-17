import React from 'react';
import { InputNumber } from 'antd';
import { formatCents } from '../../utils/currency';

export interface PercentageSplitTabProps {
  members: { user_id: string }[];
  percentages: Record<string, number | null>;
  percentageSum: number;
  totalCents: number;
  memberName: (uid: string) => string;
  setPercentages: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
}

export function PercentageSplitTab({
  members,
  percentages,
  percentageSum,
  totalCents,
  memberName,
  setPercentages,
}: PercentageSplitTabProps) {
  return (
    <div className="space-y-1">
      <div className="divide-y divide-border-subtle/50">
        {members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between gap-2.5 py-2 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-main">
                {memberName(m.user_id)}
              </div>
              {totalCents > 0 && percentages[m.user_id] != null && (
                <div className="text-[11px] text-text-muted font-financial mt-0.5">
                  {formatCents(Math.round(((percentages[m.user_id] ?? 0) / 100) * totalCents))}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <InputNumber
                size="large"
                suffix="%"
                min={0}
                max={100}
                step={1}
                precision={2}
                placeholder="0"
                inputMode="decimal"
                className="w-24 sm:w-32 shrink-0 rounded-xl font-financial text-sm font-semibold"
                value={percentages[m.user_id]}
                onChange={(val) =>
                  setPercentages((prev) => ({ ...prev, [m.user_id]: val }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-2.5 rounded-xl px-3 py-2 text-xs font-semibold font-financial border ${
          Math.abs(percentageSum - 100) < 0.01
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        }`}
      >
        {Math.abs(percentageSum - 100) < 0.01
          ? '✓ Percentages add up to 100%'
          : `Total: ${percentageSum.toFixed(2)}% — must equal 100%`}
      </div>
    </div>
  );
}
