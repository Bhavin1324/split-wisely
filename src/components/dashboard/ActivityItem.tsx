import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Expense } from '../../types';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getProfileById } from '../../lib/mockData';
import { formatCents } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { getCategoryIcon } from '../../utils/icons';

export const ActivityItem = React.memo(function ActivityItem({
  expense,
  userId,
  groupName,
  onClick,
}: {
  expense: Expense;
  userId: string;
  groupName?: string;
  onClick?: (expense: Expense) => void;
}) {
  const navigate = useNavigate();
  const payerName =
    expense.payer?.full_name ??
    (DEMO_MODE ? getProfileById(expense.payer_id)?.full_name : null) ??
    'Unknown';

  const isCurrentUserPayer = expense.payer_id === userId;
  const userSplit = (expense.splits ?? []).find((s) => s.user_id === userId);
  const isParticipant = (expense.splits ?? []).some((s) => s.user_id === userId);
  const isSoloPayer = isCurrentUserPayer && (!expense.splits?.length || (expense.splits.length === 1 && expense.splits[0].user_id === userId));

  let userAmount = 0;
  let statusLabel = 'settled';

  if (isSoloPayer) {
    userAmount = expense.base_currency_amount;
    statusLabel = 'personal';
  } else if (isCurrentUserPayer) {
    userAmount = expense.base_currency_amount - (userSplit?.amount_owed ?? 0);
    statusLabel = userAmount > 0 ? 'you lent' : 'settled';
  } else if (isParticipant) {
    userAmount = -(userSplit?.amount_owed ?? 0);
    statusLabel = 'your share';
  } else {
    userAmount = 0;
    statusLabel = 'not involved';
  }

  const CatIcon = getCategoryIcon(expense.category);

  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          onClick(expense);
        } else if (expense.group_id) {
          navigate(`/groups/${expense.group_id}`);
        }
      }}
      className="
        flex w-full items-center gap-3.5 sm:gap-4 rounded-2xl bg-bg-surface p-3.5 sm:p-4
        text-left transition-[transform,border-color,box-shadow] duration-200
        hover:shadow-xs hover:border-border-base cursor-pointer
        border border-border-subtle group active:scale-[0.99]
      "
    >
      {/* Category icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-500">
        <CatIcon className="h-5 w-5" strokeWidth={1.8} />
      </div>

      {/* Description & payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs sm:text-sm font-bold text-text-main group-hover:text-primary-500 transition-colors">
          {expense.description}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-text-muted">
          <span>
            {isCurrentUserPayer ? 'You' : payerName} paid{' '}
            <span className="font-financial font-medium text-text-main">
              {formatCents(expense.base_currency_amount)}
            </span>
          </span>
          {groupName && (
            <>
              <span className="hidden sm:inline text-text-muted">·</span>
              <span className="text-primary-500 font-medium truncate">{groupName}</span>
            </>
          )}
          <span className="hidden sm:inline text-text-muted">·</span>
          <span>{formatDate(expense.expense_date ?? expense.created_at)}</span>
        </div>
      </div>

      {/* Amount & delta status */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        {statusLabel === 'not involved' ? (
          <span className="font-financial text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-bg-subtle text-text-muted border border-border-base">
            —
          </span>
        ) : (
          <span
            className={`font-financial text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full ${
              userAmount > 0
                ? 'bg-success-bg text-success-text border border-success-border'
                : userAmount < 0
                  ? 'bg-error-bg text-error-text border border-error-border'
                  : 'bg-bg-subtle text-text-muted border border-border-base'
            }`}
          >
            {userAmount > 0 ? '+' : ''}
            {formatCents(userAmount)}
          </span>
        )}
        <span className="text-[10px] text-text-muted font-medium">
          {statusLabel}
        </span>
      </div>
    </button>
  );
});
