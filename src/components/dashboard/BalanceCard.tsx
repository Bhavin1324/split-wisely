import type { LucideIcon } from 'lucide-react';
import { formatCents } from '../../utils/currency';

export function BalanceCard({
  title,
  amount,
  icon: Icon,
  colorClass,
  bgGradient,
  iconBgClass,
  subtitle,
  onClick,
}: {
  title: string;
  amount: number;
  icon: LucideIcon;
  colorClass: string;
  bgGradient: string;
  iconBgClass: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={`
        relative overflow-hidden rounded-2xl border border-border-base bg-bg-surface
        p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
        ${onClick ? 'cursor-pointer active:scale-[0.98] select-none' : ''}
      `}
    >
      {/* Decorative gradient blob */}
      <div
        className={`
          absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-2xl
          ${bgGradient}
        `}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <div
            className={`
              flex h-9 w-9 items-center justify-center rounded-xl
              ${iconBgClass}
            `}
          >
            <Icon className={`h-4.5 w-4.5 ${colorClass}`} strokeWidth={2} />
          </div>
        </div>

        <p className={`font-financial mt-3 text-3xl font-bold ${colorClass}`}>
          {formatCents(Math.abs(amount))}
        </p>

        <p className="mt-1.5 text-xs text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
