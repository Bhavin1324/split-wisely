import React from 'react';
import { PenLine, Tag, CreditCard } from 'lucide-react';
import {
  PAYMENT_INSTRUMENTS,
  type DetectedExpenseDetails,
  type PaymentInstrument,
} from '../../utils/stagedExpenseParser';

interface StagedItemFormProps {
  currentDetails: DetectedExpenseDetails;
  availableCategories: readonly { readonly name: string }[];
  onUpdateDetails: (partial: Partial<DetectedExpenseDetails>) => void;
}

export const StagedItemForm = React.memo(function StagedItemForm({
  currentDetails,
  availableCategories,
  onUpdateDetails,
}: StagedItemFormProps) {
  return (
    <div className="space-y-2 pt-0.5">
      {/* Row 1: Editable Custom Description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-text-muted px-0.5">
          <span className="flex items-center gap-1">
            <PenLine className="w-3 h-3 text-primary-500" />
            <span>Description</span>
          </span>
          <span className="text-[9px] text-primary-600 dark:text-primary-400 font-semibold">
            Editable
          </span>
        </div>
        <input
          type="text"
          value={currentDetails.description}
          onChange={(e) => onUpdateDetails({ description: e.target.value })}
          className="w-full px-3 py-1.5 rounded-xl bg-bg-subtle border border-border-base text-xs font-bold text-text-main focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 focus:outline-none transition-colors"
          placeholder="Description / Merchant name"
        />
      </div>

      {/* Row 2: Category & Payment Mode Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-muted px-0.5 flex items-center gap-1">
            <Tag className="w-3 h-3 text-primary-500" />
            <span>Category</span>
          </label>
          <select
            value={currentDetails.category}
            onChange={(e) => onUpdateDetails({ category: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-xl bg-bg-subtle border border-border-base text-[11px] font-bold text-text-main focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 focus:outline-none cursor-pointer"
          >
            {availableCategories.map((c) => (
              <option
                key={c.name}
                value={c.name}
                className="bg-bg-surface text-text-main"
              >
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-muted px-0.5 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-primary-500" />
            <span>Payment Mode</span>
          </label>
          <select
            value={currentDetails.paymentMethod}
            onChange={(e) =>
              onUpdateDetails({
                paymentMethod: e.target.value as PaymentInstrument,
              })
            }
            className="w-full px-2.5 py-1.5 rounded-xl bg-bg-subtle border border-border-base text-[11px] font-bold text-text-main focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 focus:outline-none cursor-pointer"
          >
            {PAYMENT_INSTRUMENTS.map((inst) => (
              <option
                key={inst.id}
                value={inst.id}
                className="bg-bg-surface text-text-main"
              >
                {inst.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});
