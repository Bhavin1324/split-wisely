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
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-2 sm:gap-3">
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{memberName(m.user_id)}</span>
          <InputNumber
            prefix={getCurrencySymbol()}
            min={0}
            step={0.01}
            precision={2}
            className="w-[120px] shrink-0"
            placeholder="0.00"
            value={exactAmounts[m.user_id]}
            onChange={(val) =>
              setExactAmounts((prev) => ({ ...prev, [m.user_id]: val }))
            }
          />
        </div>
      ))}

      <div
        className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ${
          exactRemaining === 0
            ? 'bg-primary-50 text-primary-700'
            : 'bg-orange-50 text-orange-700'
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
