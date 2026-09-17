import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, Tag } from 'antd';
import { ArrowUpRight, ArrowDownLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Group, SimplifiedTransaction } from '../../types';
import { formatCents } from '../../utils/currency';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUP_MEMBERS, getProfileById } from '../../lib/mockData';
import { UserAvatar } from '../ui/UserAvatar';

export const GroupCard = React.memo(function GroupCard({
  group,
  balance,
  userId,
  groupDebts = [],
  memberMap,
}: {
  group: Group;
  balance: number;
  userId?: string;
  groupDebts?: SimplifiedTransaction[];
  memberMap?: Map<string, { full_name: string; avatar_url?: string | null }>;
}) {
  const navigate = useNavigate();

  const demoMembers = DEMO_MODE ? MOCK_GROUP_MEMBERS.filter(m => m.group_id === group.id) : [];

  const myDebts = userId
    ? groupDebts.filter(d => d.from === userId || d.to === userId)
    : [];

  const getResolvedUser = (id: string) => {
    const fromMap = memberMap?.get(id);
    if (fromMap) return { id, full_name: fromMap.full_name, avatar_url: fromMap.avatar_url };
    if (DEMO_MODE) {
      const mock = getProfileById(id);
      if (mock) return { id: mock.id, full_name: mock.full_name, avatar_url: mock.avatar_url };
    }
    return { id, full_name: 'Friend', avatar_url: null };
  };

  const previewMembers = useMemo(() => {
    if (group.members_preview && group.members_preview.length > 0) {
      return group.members_preview.slice(0, 3);
    }

    const list: Array<{ id?: string; full_name?: string; avatar_url?: string | null }> = [];
    const seen = new Set<string>();

    for (const d of groupDebts) {
      for (const id of [d.from, d.to]) {
        if (id && !seen.has(id)) {
          seen.add(id);
          list.push(getResolvedUser(id));
        }
      }
    }

    if (DEMO_MODE) {
      for (const m of demoMembers) {
        if (!seen.has(m.user_id)) {
          seen.add(m.user_id);
          list.push(getResolvedUser(m.user_id));
        }
      }
    }

    return list.slice(0, 3);
  }, [group.members_preview, groupDebts, demoMembers, memberMap]);

  const memberCount =
    group.member_count ??
    (previewMembers.length > 0 ? previewMembers.length : (DEMO_MODE ? demoMembers.length : 1));

  const topDebts = myDebts.slice(0, 2);
  const extraDebts = myDebts.slice(2);

  const extraPopoverContent = (
    <div className="space-y-1.5 p-1 max-w-xs">
      <div className="text-xs font-bold text-text-base border-b border-border-base pb-1 mb-1">
        Other Balances in {group.name}
      </div>
      {extraDebts.map((debt, i) => {
        const isOwe = debt.from === userId;
        const otherId = isOwe ? debt.to : debt.from;
        const otherUser = getResolvedUser(otherId);
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <UserAvatar
                user={otherUser}
                size={16}
                className="shrink-0 text-[8px]"
              />
              <span className="text-text-muted truncate">
                {isOwe ? `Owe ${otherUser.full_name}` : `${otherUser.full_name} owes you`}
              </span>
            </div>
            <span className={`font-financial font-semibold ${isOwe ? 'text-error-text' : 'text-success-text'}`}>
              {formatCents(debt.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );

  const isSettled = Math.abs(balance) < 1 && myDebts.length === 0;

  return (
    <div
      onClick={() => navigate(`/groups/${group.id}`)}
      className="
        group relative flex flex-col justify-between overflow-hidden rounded-3xl
        border border-border-base bg-bg-surface text-left shadow-xs
        transition-[transform,border-color,box-shadow] duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer
      "
    >
      {/* Optional Cover Banner Header */}
      {group.cover_image_url && (
        <div className="relative h-24 w-full overflow-hidden bg-bg-subtle">
          <img
            src={group.cover_image_url}
            alt={group.name}
            onError={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) parent.style.display = 'none';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-transparent to-transparent" />
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-base/80 text-text-inverse border border-border-subtle">
            {memberCount} Members
          </span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-base font-bold text-text-base leading-snug pr-4 group-hover:text-primary-500 transition-colors line-clamp-1">
              {group.name}
            </h3>
            <ChevronRight
              className="
                h-4 w-4 flex-shrink-0 text-text-muted
                transition-transform duration-200 group-hover:translate-x-0.5
                group-hover:text-text-base
              "
            />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
            {previewMembers.length > 0 && (
              <div className="flex -space-x-1.5 overflow-hidden">
                {previewMembers.map((m, i) => (
                  <UserAvatar
                    key={m.id || i}
                    user={m}
                    size={20}
                    className="ring-2 ring-bg-surface shrink-0 text-[9px]"
                  />
                ))}
              </div>
            )}
            <span className="text-[11px] text-text-muted font-medium">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Inner Status Breakdown Box */}
        <div className="mt-4 bg-bg-subtle/80 rounded-2xl p-3 border border-border-subtle">
          {myDebts.length === 0 ? (
            <div className="text-xs text-success-text flex items-center gap-1.5 font-semibold py-0.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success-text shrink-0" />
              <span>All debts settled up</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {topDebts.map((debt, idx) => {
                const isOwe = debt.from === userId;
                const otherId = isOwe ? debt.to : debt.from;
                const otherUser = getResolvedUser(otherId);

                return (
                  <div key={idx} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserAvatar
                        user={otherUser}
                        size={18}
                        className="shrink-0 text-[8px]"
                      />
                      <span className="text-text-base truncate">
                        {isOwe ? (
                          <>You owe <strong className="font-semibold">{otherUser.full_name}</strong></>
                        ) : (
                          <><strong className="font-semibold">{otherUser.full_name}</strong> owes you</>
                        )}
                      </span>
                    </div>
                    <span className={`font-financial font-bold shrink-0 ${isOwe ? 'text-error-text' : 'text-success-text'}`}>
                      {formatCents(debt.amount)}
                    </span>
                  </div>
                );
              })}

              {extraDebts.length > 0 && (
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Popover content={extraPopoverContent} trigger={['hover', 'click']} placement="bottom">
                    <Tag className="text-[10px] font-semibold rounded-full border-none bg-primary-500/10 text-primary-500 cursor-pointer hover:bg-primary-500/20 m-0">
                      +{extraDebts.length} more balance{extraDebts.length > 1 ? 's' : ''}
                    </Tag>
                  </Popover>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Balance footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs">
          <span className="font-medium text-text-muted">Your net balance</span>
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
            isSettled
              ? 'bg-bg-subtle text-text-muted border border-border-base font-semibold'
              : balance > 0
                ? 'bg-success-bg text-success-text border border-success-border font-bold'
                : 'bg-error-bg text-error-text border border-error-border font-bold'
          }`}>
            {isSettled ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success-text shrink-0" />
                <span className="font-financial text-xs font-semibold">Settled</span>
              </>
            ) : (
              <>
                {balance > 0 && <ArrowDownLeft className="h-3.5 w-3.5" />}
                {balance < 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
                <span className="font-financial text-xs font-bold">
                  {formatCents(Math.abs(balance))}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
