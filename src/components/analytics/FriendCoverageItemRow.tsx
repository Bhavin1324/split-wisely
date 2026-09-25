import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { Tag } from 'antd';
import { formatCents } from '../../utils/currency';
import dayjs from 'dayjs';

export interface CoverageItemData {
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  expenseId: string;
  description: string;
  date: string;
  amountCents: number;
  direction: 'YOU_COVERED' | 'FRIEND_COVERED';
  groupName?: string;
}

interface Props {
  item: CoverageItemData;
  showFriendName?: boolean;
}

export function FriendCoverageItemRow({ item, showFriendName = true }: Props) {
  const isYouCovered = item.direction === 'YOU_COVERED';

  return (
    <div className="p-3 rounded-xl bg-bg-surface border border-border-base shadow-xs flex items-center justify-between gap-3 hover:border-primary-500/40 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isYouCovered
              ? 'bg-success-text/10 text-success-text'
              : 'bg-warning-500/10 text-warning-500'
          }`}
        >
          {isYouCovered ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownLeft className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-xs text-text-base block truncate">
            {item.description}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-text-muted flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-text-muted shrink-0" />
              {dayjs(item.date).format('D MMM YYYY')}
            </span>
            {showFriendName && (
              <>
                <span className="text-border-base font-black">&middot;</span>
                <span className="font-medium text-text-base truncate max-w-[110px]">
                  {item.friendName}
                </span>
              </>
            )}
            {item.groupName && (
              <Tag className="m-0 text-[10px] leading-tight px-1.5 py-0 rounded border-border-base bg-bg-subtle text-text-muted">
                {item.groupName}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span
          className={`text-sm font-bold font-financial block ${
            isYouCovered ? 'text-success-text' : 'text-warning-500'
          }`}
        >
          {isYouCovered ? `+${formatCents(item.amountCents)}` : `-${formatCents(item.amountCents)}`}
        </span>
        <span className="text-[10px] text-text-muted block">
          {isYouCovered ? 'You covered' : 'Friend covered'}
        </span>
      </div>
    </div>
  );
}
