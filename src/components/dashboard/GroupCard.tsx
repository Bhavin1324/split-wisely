import { useNavigate } from 'react-router-dom';
import { Popover, Tag } from 'antd';
import { ArrowUpRight, ArrowDownLeft, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Group, SimplifiedTransaction } from '../../types';
import { formatCents } from '../../utils/currency';
import { useGroupMembers } from '../../hooks/supabase/useGroupsData';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUP_MEMBERS, getProfileById } from '../../lib/mockData';

export function GroupCard({
  group,
  balance,
  userId,
  groupDebts = [],
}: {
  group: Group;
  balance: number;
  userId?: string;
  groupDebts?: SimplifiedTransaction[];
}) {
  const navigate = useNavigate();
  const { data: liveMembers } = useGroupMembers(group.id);
  const members = DEMO_MODE ? MOCK_GROUP_MEMBERS.filter(m => m.group_id === group.id) : liveMembers;
  const memberCount = group.member_count ?? members.length;

  const myDebts = userId
    ? groupDebts.filter(d => d.from === userId || d.to === userId)
    : [];
  const getMemberName = (id: string) => {
    if (DEMO_MODE) return getProfileById(id)?.full_name ?? id;
    const member = members?.find(m => m.user_id === id);
    return member?.profile?.full_name ?? id;
  };

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
        const otherName = getMemberName(otherId);
        return (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-text-muted truncate">
              {isOwe ? `Owe ${otherName}` : `${otherName} owes you`}
            </span>
            <span className={`font-financial font-semibold ${isOwe ? 'text-error-text' : 'text-success-text'}`}>
              {formatCents(debt.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );

  const isSettled = Math.abs(balance) < 1;

  return (
    <div
      onClick={() => navigate(`/groups/${group.id}`)}
      className="
        group relative flex flex-col justify-between overflow-hidden rounded-2xl
        border border-border-base bg-bg-surface text-left shadow-sm
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer
      "
    >
      {/* Optional Cover Banner Header */}
      {group.cover_image_url && (
        <div className="relative h-20 w-full overflow-hidden bg-bg-subtle">
          <img
            src={group.cover_image_url}
            alt={group.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-transparent to-black/30" />
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-base font-bold text-text-base leading-snug pr-4">
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
            <Users className="h-3.5 w-3.5" />
            <span>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

      {/* Inner Status Breakdown Box */}
      <div className="mt-3 bg-bg-subtle rounded-xl p-2.5 border border-border-base/60">
        {isSettled || myDebts.length === 0 ? (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold py-0.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Settled up
          </div>
        ) : (
          <div className="space-y-1.5">
            {topDebts.map((debt, idx) => {
              const isOwe = debt.from === userId;
              const otherId = isOwe ? debt.to : debt.from;
              const otherName = getMemberName(otherId);

              return (
                <div key={idx} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-text-base truncate">
                    {isOwe ? (
                      <>You owe <strong className="font-semibold">{otherName}</strong></>
                    ) : (
                      <><strong className="font-semibold">{otherName}</strong> owes you</>
                    )}
                  </span>
                  <span className={`font-financial font-bold shrink-0 ${isOwe ? 'text-error-text' : 'text-success-text'}`}>
                    {formatCents(debt.amount)}
                  </span>
                </div>
              );
            })}

            {extraDebts.length > 0 && (
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Popover content={extraPopoverContent} trigger="hover" placement="bottom">
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
      <div className="mt-4 flex items-center justify-between border-t border-border-base pt-3">
        <span className="text-xs font-medium text-text-muted">Your net balance</span>
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
          isSettled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold' :
          balance > 0 ? 'bg-success-bg text-success-text font-bold' : 
          'bg-error-bg text-error-text font-bold'
        }`}>
          {isSettled ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="font-financial text-xs font-semibold">Settled</span>
            </>
          ) : (
            <>
              {balance > 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
              {balance < 0 && <ArrowDownLeft className="h-3.5 w-3.5" />}
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
}
