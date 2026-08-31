import { useMemo } from 'react';
import { Card, Empty, Skeleton } from 'antd';
import {
  Activity,
  Receipt,
  Trash2,
  CheckCircle2,
  Settings,
  FileEdit,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useGroupActivities } from '../../hooks/supabase/useGroupActivities';
import { formatCents } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import type { GroupActivityItem, GroupActivityActionType } from '../../types';

interface GroupActivityTabProps {
  groupId: string | undefined;
  userId: string;
  getProfile: (id: string) => any;
}

export function GroupActivityTab({
  groupId,
  getProfile,
}: GroupActivityTabProps) {
  const { data: activities, loading } = useGroupActivities(groupId);

  const groupedActivities = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = dayjs().subtract(1, 'day').startOf('day');

    const groups: { bucket: string; items: GroupActivityItem[] }[] = [];
    const bucketMap = new Map<string, GroupActivityItem[]>();

    activities.forEach((item) => {
      const itemDate = dayjs(item.created_at);
      let bucket = 'Older';

      if (itemDate.isAfter(today) || itemDate.isSame(today, 'day')) {
        bucket = 'Today';
      } else if (itemDate.isSame(yesterday, 'day')) {
        bucket = 'Yesterday';
      } else if (itemDate.isSame(dayjs(), 'month')) {
        bucket = 'This Month';
      }

      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, []);
      }
      bucketMap.get(bucket)!.push(item);
    });

    const bucketOrder = ['Today', 'Yesterday', 'This Month', 'Older'];
    bucketOrder.forEach((b) => {
      if (bucketMap.has(b) && bucketMap.get(b)!.length > 0) {
        groups.push({ bucket: b, items: bucketMap.get(b)! });
      }
    });

    return groups;
  }, [activities]);

  const renderActionIcon = (actionType: GroupActivityActionType) => {
    switch (actionType) {
      case 'EXPENSE_CREATED':
        return (
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        );
      case 'EXPENSE_UPDATED':
        return (
          <div className="w-10 h-10 rounded-xl bg-bg-subtle text-text-base border border-border-base flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
        );
      case 'EXPENSE_DELETED':
        return (
          <div className="w-10 h-10 rounded-xl bg-error-bg text-error-text border border-error-border flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
        );
      case 'SETTLEMENT_RECORDED':
        return (
          <div className="w-10 h-10 rounded-xl bg-success-bg text-success-text border border-success-border flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'SETTLEMENT_DELETED':
        return (
          <div className="w-10 h-10 rounded-xl bg-error-bg text-error-text border border-error-border flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
        );
      case 'MEMBER_ADDED':
        return (
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        );
      case 'MEMBER_REMOVED':
        return (
          <div className="w-10 h-10 rounded-xl bg-error-bg text-error-text border border-error-border flex items-center justify-center shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
        );
      case 'GROUP_UPDATED':
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-bg-subtle text-text-muted border border-border-base flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
        );
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-4 bg-bg-surface border border-border-base rounded-2xl flex items-center gap-4"
          >
            <Skeleton.Avatar active size="large" shape="square" className="rounded-xl" />
            <div className="flex-1">
              <Skeleton.Input active block size="small" className="mb-2" />
              <Skeleton.Input active size="small" style={{ width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="rounded-2xl text-center py-12 border-border-base">
        <Empty
          image={<Activity className="w-12 h-12 mx-auto text-text-muted opacity-40 mb-2" />}
          description={
            <div>
              <p className="font-semibold text-text-base text-base">No activity recorded yet</p>
              <p className="text-xs text-text-muted mt-1">
                Expenses, payments, and member changes will appear here as an append-only timeline.
              </p>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedActivities.map(({ bucket, items }) => (
        <div key={bucket} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {bucket}
            </span>
            <div className="h-px flex-1 bg-border-base/60" />
          </div>

          <div className="space-y-2.5">
            {items.map((item) => {
              const actor = item.actor || (item.actor_id ? getProfile(item.actor_id) : null);
              const actorName = actor?.full_name || item.metadata?.payer_name || item.metadata?.user_name || 'A member';
              const hasAmount = typeof item.metadata?.amount === 'number';

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 bg-bg-surface rounded-2xl border border-border-base shadow-sm hover:shadow-md transition-all gap-3.5"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {renderActionIcon(item.action_type)}

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="text-sm font-medium text-text-base leading-snug">
                        {item.description}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-text-muted">
                        <span>{formatDate(item.created_at)}</span>
                        {item.actor_id && (
                          <>
                            <span>•</span>
                            <span className="truncate">by {actorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasAmount && (
                    <div className="shrink-0 pt-0.5 text-right">
                      <span className="font-financial font-bold text-sm sm:text-base text-text-base bg-bg-subtle px-2.5 py-1 rounded-xl border border-border-base inline-block">
                        {formatCents(item.metadata.amount!)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
