import { Checkbox } from 'antd';
import { formatCents } from '../../utils/currency';

export interface EqualSplitTabProps {
  members: { user_id: string }[];
  selectedUserIds: string[];
  totalCents: number;
  equalPerPerson: number;
  memberName: (uid: string) => string;
  toggleParticipant: (uid: string, checked: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function EqualSplitTab({
  members,
  selectedUserIds,
  totalCents,
  equalPerPerson,
  memberName,
  toggleParticipant,
  onSelectAll,
  onDeselectAll,
}: EqualSplitTabProps) {
  const uniqueSelectedIds = new Set(selectedUserIds);

  return (
    <div className="space-y-2">
      {/* Quick selection toolbar */}
      {members.length > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-text-muted">
          <span>
            {uniqueSelectedIds.size} of {members.length} selected
          </span>
          <div className="flex items-center gap-3">
            {onSelectAll && uniqueSelectedIds.size < members.length && (
              <button
                type="button"
                onClick={onSelectAll}
                className="text-primary-500 hover:text-primary-600 font-medium transition-colors cursor-pointer"
              >
                Select All
              </button>
            )}
            {onDeselectAll && uniqueSelectedIds.size > 0 && (
              <button
                type="button"
                onClick={onDeselectAll}
                className="text-text-muted hover:text-text-main font-medium transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {members.map((m) => {
          const isSelected = uniqueSelectedIds.has(m.user_id);
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
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pointer-events-none">
                <Checkbox
                  checked={isSelected}
                  tabIndex={-1}
                />
                <span className="text-sm font-medium text-text-main truncate">
                  {memberName(m.user_id)}
                </span>
              </div>
              {isSelected && totalCents > 0 && (
                <span className="text-xs sm:text-sm font-semibold text-text-main font-financial shrink-0 ml-2">
                  {formatCents(equalPerPerson)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

