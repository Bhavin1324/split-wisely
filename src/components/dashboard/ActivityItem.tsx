import { useNavigate } from 'react-router-dom';
import type { Expense, Group } from '../../types';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getProfileById } from '../../lib/mockData';
import { formatCents } from '../../utils/currency';
import { formatDate } from '../../utils/date';

import { getCategoryIcon } from '../../utils/icons';

export function ActivityItem({
  expense,
  userId,
  groups: groupsList,
  onClick,
}: {
  expense: Expense;
  userId: string;
  groups: Group[];
  onClick?: (expense: Expense) => void;
}) {
  const navigate = useNavigate();
  const payerName =
    expense.payer?.full_name ??
    (DEMO_MODE ? getProfileById(expense.payer_id)?.full_name : null) ??
    'Unknown';

  const isCurrentUserPayer = expense.payer_id === userId;
  const userSplit = (expense.splits ?? []).find(
    (s) => s.user_id === userId,
  );

  // If the current user paid, they are owed (total - their share).
  // If someone else paid, the current user owes their share.
  let userAmount = 0;
  if (isCurrentUserPayer) {
    userAmount = expense.base_currency_amount - (userSplit?.amount_owed ?? 0);
  } else {
    userAmount = -(userSplit?.amount_owed ?? 0);
  }

  const CatIcon = getCategoryIcon(expense.category);

  const groupName = groupsList.find((g) => g.id === expense.group_id)?.name;

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
        flex w-full items-center gap-4 rounded-xl bg-white/70 px-4 py-3.5
        text-left transition-all duration-200
        hover:bg-white hover:shadow-md cursor-pointer
        border border-transparent hover:border-gray-100
      "
    >
      {/* Category icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <CatIcon className="h-5 w-5" strokeWidth={1.8} />
      </div>

      {/* Description & payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          {expense.description}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span>
            {isCurrentUserPayer ? 'You' : payerName} paid{' '}
            <span className="font-financial font-medium text-gray-500">
              {formatCents(expense.base_currency_amount)}
            </span>
          </span>
          {groupName && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate">{groupName}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount & date */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span
          className={`font-financial text-sm font-bold ${
            userAmount > 0
              ? 'text-primary-500'
              : userAmount < 0
                ? 'text-orange-500'
                : 'text-gray-400'
          }`}
        >
          {userAmount > 0 ? '+' : ''}
          {formatCents(userAmount)}
        </span>
        <span className="text-[11px] text-gray-400">
          {formatDate(expense.expense_date ?? expense.created_at)}
        </span>
      </div>
    </button>
  );
}
