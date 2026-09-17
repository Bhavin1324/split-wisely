import { useState, useMemo, useEffect } from 'react';
import { Button } from 'antd';
import {
  Sparkles, User, Users, X, ChevronLeft, ChevronRight, Utensils, Car, ShoppingBag,
} from 'lucide-react';
import { formatCents } from '../../utils/currency';
import type { StagedExpense } from '../../types/stagedExpense';
import { formatDate } from '../../utils/date';
import {
  detectExpenseDetails, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type DetectedExpenseDetails,
} from '../../utils/stagedExpenseParser';
import { StagedItemForm } from './StagedItemForm';

interface StagedTransactionsBannerProps {
  pendingExpenses: StagedExpense[];
  onApprovePersonal: (staged: StagedExpense, customData?: DetectedExpenseDetails) => Promise<boolean | void>;
  onDismiss: (stagedId: string) => Promise<void>;
  onSplitInGroup: (staged: StagedExpense, customData?: DetectedExpenseDetails) => void;
}

function getMerchantCategoryIcon(merchant: string) {
  const m = merchant.toLowerCase();
  if (/swiggy|zomato|starbucks|mcdonald|subway|cafe|coffee|restaurant|food|burger|pizza|diner|kitchen|bakery/i.test(m)) return Utensils;
  if (/uber|ola|rapido|metro|fuel|petrol|shell|indianoil|hpcl|bpcl|auto|taxi/i.test(m)) return Car;
  if (/amazon|flipkart|zara|myntra|h&m|blinkit|zepto|instamart|grocery|mart|store|retail|supermarket/i.test(m)) return ShoppingBag;
  return Sparkles;
}

export function StagedTransactionsBanner({
  pendingExpenses,
  onApprovePersonal,
  onDismiss,
  onSplitInGroup,
}: StagedTransactionsBannerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  const [inFlightActionId, setInFlightActionId] = useState<string | null>(null);
  const [customItemStates, setCustomItemStates] = useState<Record<string, DetectedExpenseDetails>>({});

  // Stable ID-based index resolution with boundary clamping
  const safeIndex = useMemo(() => {
    if (!activeId || pendingExpenses.length === 0) return 0;
    const idx = pendingExpenses.findIndex((exp) => exp.id === activeId);
    return idx !== -1 ? idx : Math.min(0, pendingExpenses.length - 1);
  }, [activeId, pendingExpenses]);

  // Reactive focus preservation: if active item vanished externally, advance to nearest card
  useEffect(() => {
    if (activeId && !pendingExpenses.some((exp) => exp.id === activeId)) {
      const nextId = pendingExpenses.length > 0
        ? pendingExpenses[Math.min(safeIndex, pendingExpenses.length - 1)]?.id || null
        : null;
      setActiveId(nextId);
    }
  }, [pendingExpenses, activeId, safeIndex]);

  if (pendingExpenses.length === 0) return null;

  const item = pendingExpenses[safeIndex];
  const IconComponent = getMerchantCategoryIcon(item.merchant_name);

  const getItemDetails = (exp: StagedExpense): DetectedExpenseDetails => {
    return customItemStates[exp.id] || detectExpenseDetails(exp);
  };

  const updateItemState = (
    id: string,
    baseExp: StagedExpense,
    partial: Partial<DetectedExpenseDetails>
  ) => {
    setCustomItemStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || detectExpenseDetails(baseExp)), ...partial },
    }));
  };

  const currentDetails = getItemDetails(item);
  const availableCategories =
    currentDetails.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleStep = (direction: 'prev' | 'next') => {
    const nextIdx =
      direction === 'prev'
        ? safeIndex > 0 ? safeIndex - 1 : pendingExpenses.length - 1
        : safeIndex < pendingExpenses.length - 1 ? safeIndex + 1 : 0;
    setActiveId(pendingExpenses[nextIdx].id);
  };

  const transitionToNextCard = (currentId: string) => {
    const remaining = pendingExpenses.filter((e) => e.id !== currentId);
    if (remaining.length === 0) {
      setActiveId(null);
    } else {
      const nextIdx = Math.min(safeIndex, remaining.length - 1);
      setActiveId(remaining[nextIdx].id);
    }
  };

  const handleApprovePersonal = async () => {
    if (inFlightActionId || isBatchApproving) return;
    setInFlightActionId(item.id);
    transitionToNextCard(item.id);
    try {
      await onApprovePersonal(item, currentDetails);
    } finally {
      setInFlightActionId(null);
    }
  };

  const handleDismiss = async () => {
    if (inFlightActionId || isBatchApproving) return;
    setInFlightActionId(item.id);
    transitionToNextCard(item.id);
    try {
      await onDismiss(item.id);
    } finally {
      setInFlightActionId(null);
    }
  };

  const handleApproveAllPersonal = async () => {
    if (isBatchApproving || inFlightActionId) return;
    setIsBatchApproving(true);
    const snapshot = [...pendingExpenses];
    try {
      for (const exp of snapshot) {
        await onApprovePersonal(exp, getItemDetails(exp));
      }
    } finally {
      setIsBatchApproving(false);
    }
  };

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
      {/* Deck Header Bar (Global Queue Level) */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 font-bold text-text-main">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <span>SMS Decision Queue</span>
          {pendingExpenses.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-500 border border-primary-500/20">
              {pendingExpenses.length} Unreviewed
            </span>
          )}
        </div>

        {pendingExpenses.length > 1 && (
          <button
            type="button"
            disabled={isBatchApproving}
            onClick={handleApproveAllPersonal}
            className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer disabled:opacity-50"
            title="Approve all remaining expenses as personal"
          >
            {isBatchApproving ? 'Approving...' : 'Approve all as Personal'}
          </button>
        )}
      </div>

      {/* Card Stack Representation */}
      <div className="relative pt-1">
        {/* Back Deck Layer 2 (Deep shadow card) */}
        {pendingExpenses.length > 2 && (
          <div className="absolute inset-x-3 top-0 h-10 rounded-2xl bg-bg-subtle/70 border border-border-subtle transform -translate-y-2 scale-[0.94] opacity-50 pointer-events-none" />
        )}

        {/* Back Deck Layer 1 (Middle shadow card) */}
        {pendingExpenses.length > 1 && (
          <div className="absolute inset-x-1.5 top-0 h-12 rounded-2xl bg-bg-subtle border border-border-subtle transform -translate-y-1 scale-[0.97] opacity-80 pointer-events-none" />
        )}

        {/* Active Top Decision Card */}
        <div className="relative z-10 p-4 rounded-2xl bg-bg-surface border border-primary-500/30 shadow-lg shadow-primary-500/5 space-y-3.5 transition-all">
          {/* In-Card Stepper Header Strip */}
          <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle text-xs">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-bold tracking-wider">
              <Sparkles className="w-3 h-3 text-primary-500" />
              <span>SMS Confirmation</span>
            </div>

            {pendingExpenses.length > 1 ? (
              <div className="inline-flex items-center gap-0.5 bg-bg-subtle px-1.5 py-0.5 rounded-lg border border-border-subtle">
                <button
                  type="button"
                  onClick={() => handleStep('prev')}
                  className="p-0.5 rounded hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors cursor-pointer active:scale-90"
                  title="Previous transaction"
                  aria-label="Previous transaction"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-text-main font-mono px-1 select-none">
                  {safeIndex + 1} of {pendingExpenses.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleStep('next')}
                  className="p-0.5 rounded hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors cursor-pointer active:scale-90"
                  title="Next transaction"
                  aria-label="Next transaction"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-text-muted font-medium">
                1 of 1
              </span>
            )}
          </div>

          {/* Card Meta Header */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/20">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-text-main truncate">
                  {item.merchant_name}
                </h3>
                <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                  {item.bank_short_code && (
                    <span className="px-1.5 py-0.2 rounded bg-bg-subtle border border-border-subtle font-semibold">
                      {item.bank_short_code}
                      {item.account_last4 ? ` ••${item.account_last4}` : ''}
                    </span>
                  )}
                  <span>•</span>
                  <span>{formatDate(item.transaction_date)}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-financial font-extrabold text-lg text-text-main">
                {formatCents(item.amount_cents)}
              </div>
              <span className="text-[9px] text-text-muted">Auto-detected SMS</span>
            </div>
          </div>

          {/* Extracted Modular Form: Description, Category & Payment Mode */}
          <StagedItemForm
            currentDetails={currentDetails}
            availableCategories={availableCategories}
            onUpdateDetails={(partial) => updateItemState(item.id, item, partial)}
          />

          {/* 3-Button Balanced Action Row */}
          <div className="grid grid-cols-12 gap-2 pt-0.5">
            <Button
              onClick={handleApprovePersonal}
              disabled={Boolean(inFlightActionId) || isBatchApproving}
              loading={inFlightActionId === item.id}
              icon={inFlightActionId !== item.id && <User className="w-3.5 h-3.5 text-text-muted" />}
              className="col-span-5 h-10 rounded-xl font-bold text-xs bg-bg-surface hover:bg-bg-subtle border border-border-base text-text-main flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Keep as Personal Expense"
            >
              Personal
            </Button>

            <Button
              type="primary"
              onClick={() => onSplitInGroup(item, currentDetails)}
              disabled={Boolean(inFlightActionId) || isBatchApproving}
              icon={<Users className="w-3.5 h-3.5" />}
              className="col-span-5 h-10 rounded-xl font-bold text-xs bg-primary-500 hover:bg-primary-600 border-none text-white shadow-xs shadow-primary-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="Split in a Group"
            >
              Split
            </Button>

            <Button
              onClick={handleDismiss}
              disabled={Boolean(inFlightActionId) || isBatchApproving}
              icon={<X className="w-4 h-4 text-text-muted hover:text-error-text transition-colors" />}
              className="col-span-2 h-10 rounded-xl border border-border-base bg-bg-subtle/50 hover:bg-error-bg hover:border-error-border flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
              title="Dismiss (Self-transfer, CC Bill, or Non-Expense)"
              aria-label="Dismiss transaction"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
