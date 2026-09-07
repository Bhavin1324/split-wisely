import { useState } from 'react';
import { Button, Tag } from 'antd';
import { Sparkles, User, Users, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCents } from '../../utils/currency';
import type { StagedExpense } from '../../types/stagedExpense';
import { formatDate } from '../../utils/date';

interface StagedTransactionsBannerProps {
  pendingExpenses: StagedExpense[];
  onApprovePersonal: (staged: StagedExpense) => Promise<boolean | void>;
  onDismiss: (stagedId: string) => Promise<void>;
  onSplitInGroup: (staged: StagedExpense) => void;
}

export function StagedTransactionsBanner({
  pendingExpenses,
  onApprovePersonal,
  onDismiss,
  onSplitInGroup,
}: StagedTransactionsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pendingExpenses.length === 0) return null;

  const firstItem = pendingExpenses[0];
  const remainingCount = pendingExpenses.length - 1;

  return (
    <div className="bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/30 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
              Bank Transactions to Review
              <Tag color="orange" className="m-0 rounded-full font-bold px-2 py-0.2 text-[10px]">
                {pendingExpenses.length} new
              </Tag>
            </div>
            <div className="text-xs text-text-muted">
              Auto-synced from your phone. Confirm personal or split with friends.
            </div>
          </div>
        </div>

        {pendingExpenses.length > 1 && (
          <Button
            type="text"
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-text-muted hover:text-text-main flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Less <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                +{remainingCount} more <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2.5 pt-1">
        {(isExpanded ? pendingExpenses : [firstItem]).map((item) => (
          <div
            key={item.id}
            className="bg-bg-surface border border-border-subtle rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            {/* Details */}
            <div className="flex items-center gap-3">
              <div className="text-left">
                <div className="font-bold text-sm text-text-main flex items-center gap-1.5 flex-wrap">
                  <span>{item.merchant_name}</span>
                  {item.bank_short_code && (
                    <span className="text-[10px] bg-bg-subtle border border-border-subtle px-1.5 py-0.5 rounded font-medium text-text-muted">
                      {item.bank_short_code}
                      {item.account_last4 ? ` ••${item.account_last4}` : ''}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  {formatDate(item.transaction_date)} {item.upi_ref ? `• UPI Ref: ${item.upi_ref}` : ''}
                </div>
              </div>
            </div>

            {/* Actions & Amount */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="text-right font-financial font-extrabold text-base text-text-main">
                {formatCents(item.amount_cents)}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="small"
                  onClick={() => onApprovePersonal(item)}
                  icon={<User className="w-3.5 h-3.5" />}
                  className="rounded-lg text-xs font-semibold"
                  title="Keep as Personal Expense"
                >
                  Personal
                </Button>

                <Button
                  type="primary"
                  size="small"
                  onClick={() => onSplitInGroup(item)}
                  icon={<Users className="w-3.5 h-3.5" />}
                  className="rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 border-none text-white shadow-xs"
                  title="Split in a Group"
                >
                  Split
                </Button>

                <Button
                  type="text"
                  size="small"
                  onClick={() => onDismiss(item.id)}
                  icon={<X className="w-3.5 h-3.5 text-text-muted" />}
                  className="rounded-lg hover:bg-bg-subtle"
                  title="Dismiss (Transfer or CC Bill)"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
