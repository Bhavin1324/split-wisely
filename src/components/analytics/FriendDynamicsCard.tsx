import { Card } from 'antd';
import { Users, ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import type { FriendInteraction } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';
import { UserAvatar } from '../ui/UserAvatar';

interface Props {
  interactions: FriendInteraction[];
  onSelectFriend?: (friend: FriendInteraction) => void;
}

export function FriendDynamicsCard({ interactions, onSelectFriend }: Props) {
  return (
    <Card 
      title={<span className="text-sm font-semibold tracking-wide">Activity With Friends</span>} 
      className="rounded-2xl border-border-base shadow-sm flex flex-col"
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
      extra={<div className="bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-full text-xs font-semibold">{interactions.length} active</div>}
    >
      <div className="flex-1 space-y-2">
        {interactions.length === 0 ? (
          <div className="text-center text-text-muted py-8 text-sm">
            <Users className="w-8 h-8 mx-auto text-border-base mb-2" />
            No peer transactions this period.
          </div>
        ) : (
          interactions.map((friend) => (
            <div 
              key={friend.friendId} 
              onClick={() => onSelectFriend?.(friend)}
              role={onSelectFriend ? 'button' : undefined}
              tabIndex={onSelectFriend ? 0 : undefined}
              onKeyDown={(e) => {
                if (onSelectFriend && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectFriend(friend);
                }
              }}
              className={`flex items-center justify-between py-2 px-2 -mx-2 rounded-xl transition-colors border-b border-border-subtle last:border-0 ${
                onSelectFriend ? 'cursor-pointer hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar 
                  user={{ id: friend.friendId, full_name: friend.friendName, avatar_url: friend.friendAvatar }} 
                  size={38} 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-text-base truncate">
                    {friend.friendName}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                    <span className="flex items-center gap-0.5" title="You covered">
                      <ArrowUpRight className="w-3 h-3 text-primary-500" />
                      <span className="font-financial">{formatCents(friend.totalPaidForFriend)}</span>
                    </span>
                    <span className="text-border-base font-black">&middot;</span>
                    <span className="flex items-center gap-0.5" title="Covered you">
                      <ArrowDownLeft className="w-3 h-3 text-border-base" />
                      <span className="font-financial">{formatCents(friend.totalPaidByFriend)}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 ml-3 flex items-center gap-1.5">
                {friend.netFlow > 0 ? (
                  <div className="bg-[var(--color-success-bg)] text-[var(--color-success-600)] px-2.5 py-1 rounded-xl text-xs font-semibold font-financial border border-[var(--color-success-border)]">
                    +{formatCents(friend.netFlow)}
                  </div>
                ) : friend.netFlow < 0 ? (
                  <div className="bg-[var(--color-danger-bg)] text-[var(--color-danger-600)] px-2.5 py-1 rounded-xl text-xs font-semibold font-financial border border-[var(--color-danger-border)]">
                    -{formatCents(Math.abs(friend.netFlow))}
                  </div>
                ) : (
                  <div className="bg-bg-subtle text-text-muted px-2.5 py-1 rounded-xl text-xs font-semibold border border-border-subtle">
                    Settled
                  </div>
                )}
                {onSelectFriend && (
                  <ChevronRight className="w-4 h-4 text-text-muted shrink-0 opacity-60" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
