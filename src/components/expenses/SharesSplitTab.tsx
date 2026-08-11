import React from 'react';
import { Button, InputNumber, Typography } from 'antd';
import { formatCents } from '../../utils/currency';

const { Text } = Typography;

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
    <div className="space-y-3">
      {members.map((m) => {
        const userShare = shares[m.user_id] ?? 0;
        const shareAmount =
          totalShares > 0 && totalCents > 0
            ? Math.floor((userShare / totalShares) * totalCents)
            : 0;

        return (
          <div key={m.user_id} className="flex items-center gap-2 sm:gap-3">
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{memberName(m.user_id)}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="small"
                disabled={userShare <= 0}
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
                min={0}
                step={1}
                precision={0}
                className="w-12 sm:w-16 text-center"
                value={userShare}
                onChange={(val) =>
                  setShares((prev) => ({ ...prev, [m.user_id]: val ?? 0 }))
                }
              />
              <Button
                size="small"
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
            {totalCents > 0 && (
              <Text type="secondary" className="w-[60px] sm:min-w-[70px] shrink-0 text-right text-xs">
                {formatCents(shareAmount)}
              </Text>
            )}
          </div>
        );
      })}

      <Text type="secondary" className="mt-1 block text-xs">
        Total shares: {totalShares}
      </Text>
    </div>
  );
}
