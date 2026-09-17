import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Profile } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';
import { formatCents, getBalanceColorClass } from '../../utils/currency';

interface FriendListItemProps {
  friend: Profile;
  balance: number; // in integer cents
  isLast: boolean;
  onSelectFriend: (friendId: string) => void;
}

export const FriendListItem = React.memo(function FriendListItem({
  friend,
  balance,
  isLast,
  onSelectFriend,
}: FriendListItemProps) {
  const firstName = (friend.full_name || 'Friend').split(' ')[0];

  const getBalanceStatusText = () => {
    if (balance > 0) return `${firstName} owes you`;
    if (balance < 0) return `You owe ${firstName}`;
    return 'Settled up';
  };

  const handleAction = () => onSelectFriend(friend.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleAction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleAction();
        }
      }}
      className={`group flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-bg-surface-hover active:bg-bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset transition-colors ${
        !isLast ? 'border-b border-border-subtle' : ''
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <UserAvatar user={friend} size={44} />
        <div className="min-w-0">
          <p className="font-semibold text-text-base truncate mb-0.5 text-sm sm:text-base group-hover:text-primary-500 transition-colors">
            {friend.full_name || 'Friend'}
          </p>
          <p className="text-xs text-text-muted truncate mb-0">
            {getBalanceStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right">
          <p className={`text-sm sm:text-base font-bold font-financial mb-0 ${getBalanceColorClass(balance)}`}>
            {balance === 0
              ? formatCents(0)
              : `${balance > 0 ? '+' : ''}${formatCents(balance)}`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-base group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
});
