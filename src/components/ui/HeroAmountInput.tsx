import { useRef } from 'react';
import { X } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';

export interface HeroAmountInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  currencySymbol?: string;
  error?: string | null;
  className?: string;
  badgeVariant?: 'primary' | 'danger' | 'success';
  disabled?: boolean;
  min?: number;
  max?: number;
}

export function HeroAmountInput({
  value,
  onChange,
  label = 'EXPENSE AMOUNT',
  placeholder = '0.00',
  autoFocus = false,
  currencySymbol,
  error,
  className = '',
  badgeVariant = 'primary',
  disabled = false,
  min = 0,
  max,
}: HeroAmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const symbol = currencySymbol ?? getCurrencySymbol();

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    inputRef.current?.focus();
  };

  // Badge variant styling
  let badgeStyles = 'bg-primary-500/15 text-primary-500 border-primary-500/30';
  let focusRingStyles = 'focus-within:!border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/20';

  if (badgeVariant === 'danger') {
    badgeStyles = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    focusRingStyles = 'focus-within:!border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/20';
  } else if (badgeVariant === 'success') {
    badgeStyles = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    focusRingStyles = 'focus-within:!border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20';
  }

  const hasError = !!error;

  return (
    <div className={`w-full ${className}`}>
      <div
        onClick={handleContainerClick}
        className={`relative group bg-bg-surface border-2 rounded-2xl p-3 sm:p-3.5 transition-all cursor-text ${
          hasError
            ? '!border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/20'
            : `border-border-base hover:border-text-muted/40 ${focusRingStyles}`
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Micro-label */}
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5 select-none">
          {label}
        </span>

        {/* Currency Badge + Input Row */}
        <div className="flex items-center gap-3">
          {/* Currency Indicator Badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 select-none border text-lg font-extrabold font-financial ${badgeStyles}`}
          >
            {symbol}
          </div>

          {/* Numeric Input */}
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min={min}
            max={max}
            inputMode="decimal"
            placeholder={placeholder}
            value={value !== null && value !== undefined ? value : ''}
            onChange={handleInputChange}
            disabled={disabled}
            autoFocus={autoFocus}
            className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-text-main placeholder:text-text-muted/40 focus:outline-none tracking-tight font-financial [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {/* Clear Button */}
          {value !== null && value !== undefined && value > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-bg-subtle active:scale-90 transition-all shrink-0 cursor-pointer"
              title="Clear amount"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <span className="text-xs text-rose-500 font-medium block mt-1.5 px-1">
          {error}
        </span>
      )}
    </div>
  );
}
