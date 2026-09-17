import React from 'react';
import { Search, X } from 'lucide-react';

export type FriendFilterType = 'all' | 'outstanding' | 'owes_you' | 'you_owe' | 'settled';

interface FriendsFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FriendFilterType;
  onFilterChange: (filter: FriendFilterType) => void;
  counts: {
    all: number;
    owes_you: number;
    you_owe: number;
    settled: number;
  };
}

export const FriendsFilterBar = React.memo(function FriendsFilterBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
}: FriendsFilterBarProps) {
  const tabs: { key: FriendFilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    ...(activeFilter === 'outstanding'
      ? [{ key: 'outstanding' as FriendFilterType, label: 'Outstanding', count: counts.owes_you + counts.you_owe }]
      : []),
    { key: 'owes_you', label: 'Owes You', count: counts.owes_you },
    { key: 'you_owe', label: 'You Owe', count: counts.you_owe },
    { key: 'settled', label: 'Settled', count: counts.settled },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Pill */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search friends by name or UPI"
            placeholder="Search by name or UPI..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-bg-subtle sm:bg-bg-surface border border-border-base text-text-base placeholder:text-text-muted text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-bg-subtle transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips with native touch momentum & overscroll containment */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar overscroll-x-contain touch-pan-x">
          {tabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] shrink-0 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isActive
                    ? 'bg-text-base text-bg-surface shadow-xs'
                    : 'bg-bg-surface text-text-muted hover:text-text-base border border-border-subtle hover:border-border-base'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-financial ${
                    isActive
                      ? 'bg-bg-surface/20 text-bg-surface'
                      : 'bg-bg-subtle text-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
