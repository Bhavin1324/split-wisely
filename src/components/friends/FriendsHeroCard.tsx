import React from 'react';
import { Button } from 'antd';
import { UserPlus } from 'lucide-react';
import { formatCents } from '../../utils/currency';

interface FriendsHeroCardProps {
  totalBalance: number; // in integer cents (positive = owed to you, negative = you owe)
  totalOwedToYou: number; // in integer cents (positive)
  totalYouOwe: number; // in integer cents (positive magnitude)
  countOwedToYou: number;
  countYouOwe: number;
  onAddFriend: () => void;
}

export const FriendsHeroCard = React.memo(function FriendsHeroCard({
  totalBalance,
  totalOwedToYou,
  totalYouOwe,
  countOwedToYou,
  countYouOwe,
  onAddFriend,
}: FriendsHeroCardProps) {
  // Conversational headline and status logic
  const getHeadline = () => {
    if (totalBalance > 0) {
      return (
        <span>
          You are owed <span className="font-financial font-bold text-success-text">{formatCents(totalBalance)}</span>
        </span>
      );
    }
    if (totalBalance < 0) {
      return (
        <span>
          You owe <span className="font-financial font-bold text-error-text">{formatCents(Math.abs(totalBalance))}</span>
        </span>
      );
    }
    if (totalOwedToYou > 0 || totalYouOwe > 0) {
      return (
        <span>
          Net balance is <span className="font-financial font-bold text-text-base">{formatCents(0)}</span>
        </span>
      );
    }
    return <span>All settled up</span>;
  };

  const getSubtext = () => {
    const parts: string[] = [];
    if (countOwedToYou > 0) {
      parts.push(`${countOwedToYou} friend${countOwedToYou > 1 ? 's owe' : ' owes'} you ${formatCents(totalOwedToYou)}`);
    }
    if (countYouOwe > 0) {
      parts.push(`You owe ${formatCents(totalYouOwe)} to ${countYouOwe} friend${countYouOwe > 1 ? 's' : ''}`);
    }
    if (parts.length === 0) {
      return 'No active balances with friends';
    }
    return parts.join(' • ');
  };

  return (
    <div className="rounded-2xl border border-border-base bg-bg-surface p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-0">
            Overall Friends Balance
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-base mb-0">
            {getHeadline()}
          </h2>
          <p className="text-sm text-text-muted mb-0">
            {getSubtext()}
          </p>
        </div>

        <Button
          type="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={onAddFriend}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-text-inverse shadow-sm flex items-center gap-2 self-start sm:self-center h-10 px-4 shrink-0 active:scale-[0.98] transition-all"
        >
          Add Friend
        </Button>
      </div>
    </div>
  );
});
