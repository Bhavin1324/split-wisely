import { Checkbox } from 'antd';
import { formatCents } from '../../utils/currency';

export interface EqualSplitTabProps {
  members: { user_id: string }[];
  selectedUserIds: string[];
  totalCents: number;
  equalPerPerson: number;
  memberName: (uid: string) => string;
  toggleParticipant: (uid: string, checked: boolean) => void;
}

export function EqualSplitTab({
  members,
  selectedUserIds,
  totalCents,
  equalPerPerson,
  memberName,
  toggleParticipant,
}: EqualSplitTabProps) {
  return (
    <div className="space-y-1.5">
      {members.map((m) => {
        const isSelected = selectedUserIds.includes(m.user_id);
        return (
          <div
            key={m.user_id}
            onClick={() => toggleParticipant(m.user_id, !isSelected)}
            className={`flex items-center justify-between rounded-xl border p-2.5 sm:p-3 transition-colors cursor-pointer select-none ${
              isSelected
                ? 'border-primary-500/30 bg-primary-500/5'
                : 'border-border-subtle bg-bg-surface hover:bg-bg-subtle/50'
            }`}
          >
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleParticipant(m.user_id, e.target.checked);
              }}
              className="flex-1 min-w-0"
            >
              <span className="text-sm font-medium text-text-main truncate">
                {memberName(m.user_id)}
              </span>
            </Checkbox>
            {isSelected && totalCents > 0 && (
              <span className="text-xs sm:text-sm font-semibold text-text-main font-financial shrink-0 ml-2">
                {formatCents(equalPerPerson)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
