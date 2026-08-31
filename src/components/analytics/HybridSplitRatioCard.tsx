import { Card } from 'antd';
import { User, Users } from 'lucide-react';
import type { HybridTotals } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';

interface Props {
  hybrid: HybridTotals;
  onOpenBreakdown?: (tab: 'PERSONAL' | 'GROUP') => void;
}

export function HybridSplitRatioCard({ hybrid, onOpenBreakdown }: Props) {
  const total = hybrid.totalTrueCostCents;
  const personalPct = total > 0 ? Math.round((hybrid.personalExpenseCents / total) * 100) : 0;
  const groupPct = total > 0 ? Math.round((hybrid.groupNetShareCents / total) * 100) : 0;

  return (
    <Card 
      title={<span className="text-sm font-semibold tracking-wide">Personal vs. Group Bills</span>} 
      className="rounded-2xl border-border-base shadow-sm flex flex-col"
      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
    >
      <div className="space-y-6">
        {/* Two-tone segmented bar */}
        <div className="h-6 w-full flex rounded-lg overflow-hidden bg-bg-subtle">
          <div 
            className="h-full bg-primary-500 transition-all duration-500" 
            style={{ width: `${personalPct}%` }}
          />
          <div 
            className="h-full bg-[var(--color-yellow-500)] transition-all duration-500" 
            style={{ width: `${groupPct}%` }}
          />
        </div>

        {/* Interactive Cards */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onOpenBreakdown?.('PERSONAL')}
            className="flex flex-col gap-1.5 p-3 rounded-xl border border-border-subtle bg-bg-surface hover:border-primary-500/60 hover:shadow-md transition-all cursor-pointer text-left group active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-text-base">
                <div className="w-6 h-6 rounded-md bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="group-hover:text-primary-600 transition-colors font-semibold">Personal</span>
              </div>
              <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity font-medium hidden sm:inline">
                View &rarr;
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-lg font-bold font-financial text-text-base">
                {formatCents(hybrid.personalExpenseCents)}
              </span>
              <span className="text-xs font-semibold text-text-muted mb-1 font-financial">{personalPct}%</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenBreakdown?.('GROUP')}
            className="flex flex-col gap-1.5 p-3 rounded-xl border border-border-subtle bg-bg-surface hover:border-[var(--color-yellow-500)]/80 hover:shadow-md transition-all cursor-pointer text-left group active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-text-base">
                <div className="w-6 h-6 rounded-md bg-[var(--color-yellow-bg)] text-[var(--color-yellow-600)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="group-hover:text-[var(--color-yellow-600)] transition-colors font-semibold">Group Shares</span>
              </div>
              <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity font-medium hidden sm:inline">
                View &rarr;
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-lg font-bold font-financial text-text-base">
                {formatCents(hybrid.groupNetShareCents)}
              </span>
              <span className="text-xs font-semibold text-text-muted mb-1 font-financial">{groupPct}%</span>
            </div>
          </button>
        </div>
        
        <p className="text-xs text-text-muted text-center pt-2">
          This chart shows what proportion of your total spend comes from your own personal purchases versus your share of shared group bills.
        </p>
      </div>
    </Card>
  );
}
