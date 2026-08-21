import { Card, Avatar } from 'antd';
import { User, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { FriendInteraction } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';

interface Props {
  interactions: FriendInteraction[];
}

export function FriendDynamicsCard({ interactions }: Props) {
  return (
    <Card 
      title={<span className="text-sm font-semibold tracking-wide">Activity With Friends</span>} 
      className="rounded-2xl border-border-base shadow-sm flex flex-col"
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
      extra={<div className="bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-full text-xs font-semibold">{interactions.length} active</div>}
    >
      <div className="flex-1 space-y-4">
        {interactions.length === 0 ? (
          <div className="text-center text-text-muted py-8 text-sm">
            <Users className="w-8 h-8 mx-auto text-border-base mb-2" />
            No peer transactions this period.
          </div>
        ) : (
          interactions.map((friend) => (
            <div key={friend.friendId} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={friend.friendAvatar} icon={<User />} className="bg-primary-500 shrink-0" />
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
              
              <div className="shrink-0 ml-3">
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
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
