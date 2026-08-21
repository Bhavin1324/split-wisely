import { Segmented, Button, Tooltip } from 'antd';
import { Download, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import type { AnalyticsPeriod } from '../../hooks/useAnalyticsData';
import dayjs from 'dayjs';

interface Props {
  period: AnalyticsPeriod;
  onChangePeriod: (next: AnalyticsPeriod) => void;
  onOpenExport: () => void;
  onOpenGuide: () => void;
}

export function AnalyticsHeaderToolbar({ period, onChangePeriod, onOpenExport, onOpenGuide }: Props) {
  const handleModeChange = (mode: string | number) => {
    const nextMode = mode as 'Monthly' | 'Weekly';
    if (nextMode === period.mode) return;
    
    onChangePeriod({
      ...period,
      mode: nextMode,
    });
  };

  const handlePrev = () => {
    if (period.mode === 'Monthly') {
      onChangePeriod({
        ...period,
        monthYear: dayjs(`${period.monthYear}-01`).subtract(1, 'month').format('YYYY-MM'),
      });
    } else {
      onChangePeriod({
        ...period,
        weekStart: dayjs(period.weekStart).subtract(1, 'week').toISOString(),
      });
    }
  };

  const handleNext = () => {
    if (period.mode === 'Monthly') {
      onChangePeriod({
        ...period,
        monthYear: dayjs(`${period.monthYear}-01`).add(1, 'month').format('YYYY-MM'),
      });
    } else {
      onChangePeriod({
        ...period,
        weekStart: dayjs(period.weekStart).add(1, 'week').toISOString(),
      });
    }
  };

  let periodLabel = '';
  if (period.mode === 'Monthly') {
    periodLabel = dayjs(`${period.monthYear}-01`).format('MMMM YYYY');
  } else {
    const start = dayjs(period.weekStart);
    const end = start.endOf('isoWeek');
    periodLabel = `${start.format('D MMM')} – ${end.format('D MMM')}`;
  }

  return (
    <div>
      {/* Mobile Layout (< 768px): 2-Row Architecture */}
      <div className="block md:hidden space-y-3">
        {/* Row 1: Title + Action Icons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0 pr-2">
            <h1 className="text-xl font-bold text-text-main tracking-tight truncate mb-0">
              Spending Analytics
            </h1>
            <p className="text-xs text-text-muted truncate mb-0 mt-0.5">
              Financial intelligence & insights
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onOpenGuide}
              aria-label="How to read your analytics"
              className="w-11 h-11 rounded-xl bg-bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-main active:scale-95 transition-all shadow-sm"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
            <button 
              onClick={onOpenExport}
              aria-label="Export report"
              className="w-11 h-11 rounded-xl bg-bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-main active:scale-95 transition-all shadow-sm"
            >
              <Download className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Row 2: Symmetrical 50/50 Control Bar */}
        <div className="grid grid-cols-2 gap-2">
          <Segmented 
            block
            options={[
              {
                label: (
                  <span className={`font-semibold text-xs transition-colors ${period.mode === "Monthly" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                    Monthly
                  </span>
                ),
                value: "Monthly",
              },
              {
                label: (
                  <span className={`font-semibold text-xs transition-colors ${period.mode === "Weekly" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                    Weekly
                  </span>
                ),
                value: "Weekly",
              },
            ]} 
            value={period.mode} 
            onChange={handleModeChange}
            className="bg-bg-subtle/80 p-1 rounded-xl border border-border-subtle text-xs font-semibold w-full"
          />

          <div className="flex items-center justify-between w-full bg-bg-surface/80 border border-border-subtle rounded-xl px-2 py-1.5 shadow-sm">
            <button 
              onClick={handlePrev}
              aria-label="Previous period"
              className="p-1 text-text-muted hover:text-text-main active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-text-main font-financial select-none truncate px-1 text-center">
              {periodLabel}
            </span>
            <button 
              onClick={handleNext}
              aria-label="Next period"
              className="p-1 text-text-muted hover:text-text-main active:scale-90 transition-transform"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout (>= 768px): Preserved Single Horizontal Bar */}
      <div className="hidden md:flex md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text-base tracking-tight">Spending Analytics</h1>
          <p className="text-sm text-text-muted">Financial intelligence across personal and group ledgers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Segmented 
            options={[
              {
                label: (
                  <span className={`font-semibold text-xs transition-colors ${period.mode === "Monthly" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                    Monthly
                  </span>
                ),
                value: "Monthly",
              },
              {
                label: (
                  <span className={`font-semibold text-xs transition-colors ${period.mode === "Weekly" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                    Weekly
                  </span>
                ),
                value: "Weekly",
              },
            ]} 
            value={period.mode} 
            onChange={handleModeChange}
            className="bg-bg-subtle p-1 rounded-xl border border-border-base"
          />

          <div className="flex items-center gap-1 bg-bg-surface border border-border-base rounded-xl px-2 py-1">
            <Button 
              type="text" 
              size="small" 
              icon={<ChevronLeft className="w-4 h-4" />} 
              onClick={handlePrev}
              className="text-text-muted hover:text-text-main"
            />
            <span className="text-sm font-medium w-28 text-center text-text-base font-financial">{periodLabel}</span>
            <Button 
              type="text" 
              size="small" 
              icon={<ChevronRight className="w-4 h-4" />} 
              onClick={handleNext}
              className="text-text-muted hover:text-text-main"
            />
          </div>

          <Tooltip title="How to read your analytics">
            <Button 
              icon={<HelpCircle className="w-4 h-4" />} 
              onClick={onOpenGuide}
              className="rounded-xl border-border-base text-text-muted hover:text-primary-500 hover:border-primary-500 shadow-sm"
            >
              Guide
            </Button>
          </Tooltip>

          <Button 
            icon={<Download className="w-4 h-4" />} 
            onClick={onOpenExport}
            className="rounded-xl border-border-base text-text-main hover:text-primary-500 hover:border-primary-500 shadow-sm"
          >
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
