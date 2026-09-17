import React from 'react';
import { Segmented } from 'antd';
import { Plus, Users } from 'lucide-react';
import type { Group, SimplifiedTransaction } from '../../types';
import { GroupCard } from './GroupCard';

interface DashboardGroupsSectionProps {
  groups: Group[];
  displayedGroups: Group[];
  hideSettledGroups: boolean;
  onToggleHideSettled: (hide: boolean) => void;
  onOpenCreateGroup: () => void;
  balances: {
    groupBalances: Record<string, number>;
    groupDebtsMap?: Record<string, SimplifiedTransaction[]>;
  };
  userId: string;
  memberMap?: Map<string, { full_name: string; avatar_url?: string | null }>;
}

export const DashboardGroupsSection = React.memo(function DashboardGroupsSection({
  groups,
  displayedGroups,
  hideSettledGroups,
  onToggleHideSettled,
  onOpenCreateGroup,
  balances,
  userId,
  memberMap,
}: DashboardGroupsSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-text-base mb-0">Your Groups</h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-bg-subtle text-text-muted border border-border-base">
            {displayedGroups.length} of {groups.length}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <Segmented
            options={[
              { label: 'Hide Settled', value: true },
              { label: 'Show All', value: false },
            ]}
            value={hideSettledGroups}
            onChange={(val) => onToggleHideSettled(val as boolean)}
            className="bg-bg-subtle p-1 self-start rounded-xl border border-border-base"
          />
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="group inline-flex items-center gap-2 text-xs font-semibold text-primary-500 bg-primary-500/10 hover:bg-primary-500/20 active:scale-[0.97] border border-primary-500/30 rounded-xl transition-[transform,border-color] shadow-xs cursor-pointer px-2 pb-2 pt-2"
          >
            <Plus className="w-3.5 h-3.5 text-primary-500 transition-transform duration-150 group-hover:scale-110" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {displayedGroups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-base p-8 text-center bg-bg-surface">
          <Users className="mx-auto h-8 w-8 text-text-muted mb-2" />
          <p className="text-sm font-semibold text-text-base">
            {groups.length === 0 ? 'No groups yet' : 'All groups are settled up!'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {groups.length === 0
              ? 'Create a group to start splitting bills with friends.'
              : 'Toggle "Show All" above to view settled groups.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              balance={balances.groupBalances[group.id] ?? 0}
              userId={userId}
              groupDebts={balances.groupDebtsMap?.[group.id]}
              memberMap={memberMap}
            />
          ))}
        </div>
      )}
    </section>
  );
});
