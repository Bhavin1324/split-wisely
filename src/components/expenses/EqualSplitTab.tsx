import { Checkbox, Typography } from 'antd';
import { formatCents } from '../../utils/currency';

const { Text } = Typography;

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
    <div className="space-y-2">
      {members.map((m) => (
        <div
          key={m.user_id}
          className="flex items-center justify-between rounded-lg border border-border-base bg-bg-base px-3 py-2"
        >
          <Checkbox
            checked={selectedUserIds.includes(m.user_id)}
            onChange={(e) => toggleParticipant(m.user_id, e.target.checked)}
          >
            <span className="text-sm font-medium">{memberName(m.user_id)}</span>
          </Checkbox>
          {selectedUserIds.includes(m.user_id) && totalCents > 0 && (
            <Text type="secondary" className="text-sm">
              {formatCents(equalPerPerson)}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}
