import React from 'react';
import { UserPlus, SearchX, RotateCcw } from 'lucide-react';
import { Button } from 'antd';

interface FriendsEmptyStateProps {
  hasFriends: boolean;
  searchQuery: string;
  onClearFilters: () => void;
  onAddFriend: () => void;
}

export const FriendsEmptyState = React.memo(function FriendsEmptyState({
  hasFriends,
  searchQuery,
  onClearFilters,
  onAddFriend,
}: FriendsEmptyStateProps) {
  if (!hasFriends) {
    return (
      <div className="rounded-2xl border border-dashed border-border-base bg-bg-surface p-8 sm:p-12 text-center">
        <div className="mx-auto w-12 h-12 bg-bg-subtle rounded-2xl flex items-center justify-center mb-4 text-text-muted">
          <UserPlus className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-text-base mb-1">
          No friends yet
        </h3>
        <p className="text-sm text-text-muted max-w-sm mx-auto mb-6">
          Add your friends to start tracking shared expenses, group bills, and effortless settlements.
        </p>
        <Button
          type="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={onAddFriend}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-text-inverse shadow-sm h-10 px-5"
        >
          Add Your First Friend
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border-base bg-bg-surface p-8 sm:p-12 text-center">
      <div className="mx-auto w-12 h-12 bg-bg-subtle rounded-2xl flex items-center justify-center mb-4 text-text-muted">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-text-base mb-1">
        No friends found
      </h3>
      <p className="text-sm text-text-muted max-w-sm mx-auto mb-5">
        {searchQuery
          ? `No friends matched "${searchQuery}". Try searching with a different term.`
          : 'No friends match the selected filter.'}
      </p>
      <Button
        icon={<RotateCcw className="w-3.5 h-3.5" />}
        onClick={onClearFilters}
        className="rounded-xl border-border-base text-text-base hover:bg-bg-subtle"
      >
        Reset Filters &amp; Search
      </Button>
    </div>
  );
});
