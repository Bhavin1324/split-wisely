import React from 'react';
import { InputNumber, Typography } from 'antd';
import { formatCents } from '../../utils/currency';

const { Text } = Typography;

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
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-2 sm:gap-3">
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{memberName(m.user_id)}</span>
          <InputNumber
            suffix="%"
            min={0}
            max={100}
            step={1}
            precision={2}
            className="w-[80px] shrink-0"
            placeholder="0"
            value={percentages[m.user_id]}
            onChange={(val) =>
              setPercentages((prev) => ({ ...prev, [m.user_id]: val }))
            }
          />
          {totalCents > 0 && percentages[m.user_id] != null && (
            <Text type="secondary" className="w-[60px] sm:min-w-[70px] shrink-0 text-right text-xs">
              {formatCents(Math.round(((percentages[m.user_id] ?? 0) / 100) * totalCents))}
            </Text>
          )}
        </div>
      ))}

      <div
        className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ${
          Math.abs(percentageSum - 100) < 0.01
            ? 'bg-success-bg text-success-text border-success-border'
            : 'bg-error-bg text-error-text border-error-border'
        }`}
      >
        {Math.abs(percentageSum - 100) < 0.01
          ? '✓ Percentages add up to 100%'
          : `Total: ${percentageSum.toFixed(2)}% — must equal 100%`}
      </div>
    </div>
  );
}
