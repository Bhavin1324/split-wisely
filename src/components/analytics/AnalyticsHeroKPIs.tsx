import { Card, Tag, Tooltip } from 'antd';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, TrendingUp, HelpCircle } from 'lucide-react';
import type { AnalyticsSummary } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';

interface Props {
  summary: AnalyticsSummary;
}

export function AnalyticsHeroKPIs({ summary }: Props) {
  const { hybrid, totalDeltaPercent, burnRate } = summary;

  const isUp = totalDeltaPercent !== null && totalDeltaPercent > 0;
  const isDown = totalDeltaPercent !== null && totalDeltaPercent < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Your True Spend */}
      <Card className="rounded-2xl border-border-base shadow-sm h-full flex flex-col justify-between">
        <div>
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Your True Spend</span>
            <Tooltip title="Your private personal expenses plus your individual share of shared group bills.">
              <HelpCircle className="w-3.5 h-3.5 text-text-muted cursor-pointer hover:text-text-base" />
            </Tooltip>
          </div>
          <div className="text-3xl font-bold font-financial text-text-base">
            {formatCents(hybrid.totalTrueCostCents)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {totalDeltaPercent !== null ? (
            <Tag
              color="borderless"
              className={`rounded-full m-0 px-2 flex items-center gap-1 ${
                isDown 
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success-600)]' 
                  : isUp 
                    ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger-600)]'
                    : 'bg-bg-subtle text-text-muted'
              }`}
            >
              {isDown && <ArrowDownRight className="w-3 h-3" />}
              {isUp && <ArrowUpRight className="w-3 h-3" />}
              <span className="font-semibold text-xs font-financial">{Math.abs(totalDeltaPercent)}%</span>
            </Tag>
          ) : (
            <span className="text-xs text-text-muted">No prior data</span>
          )}
          {totalDeltaPercent !== null && <span className="text-xs text-text-muted">vs last period</span>}
        </div>
      </Card>

      {/* 2. Month-End Forecast / Final Period Spend */}
      <Card className="rounded-2xl border-border-base shadow-sm h-full flex flex-col justify-between">
        <div>
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{burnRate.isCompletedPeriod ? 'Final Month Spend' : 'Month-End Forecast'}</span>
            <Tooltip
              title={
                burnRate.isCompletedPeriod
                  ? 'Total finalized spending for this completed period.'
                  : 'Projected total spend combining your actual spending so far with expected spending for remaining days.'
              }
            >
              <HelpCircle className="w-3.5 h-3.5 text-text-muted cursor-pointer hover:text-text-base" />
            </Tooltip>
          </div>
          <div className="text-3xl font-bold font-financial text-primary-600">
            {formatCents(burnRate.projectedPeriodTotalCents)}
          </div>

          {/* Subtitle Details Breakdown */}
          <div className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-0.5">
            {!burnRate.isCompletedPeriod && burnRate.daysRemainingInPeriod > 0 ? (
              <span>
                {formatCents(burnRate.actualSpentSoFarCents)} spent + {formatCents(burnRate.projectedRemainingSpendCents)} forecast ({burnRate.daysRemainingInPeriod} days left)
              </span>
            ) : (
              <span>
                Month concluded ({burnRate.totalDaysInPeriod}/{burnRate.totalDaysInPeriod} days) • Avg {formatCents(burnRate.dailyBurnCents)}/day
              </span>
            )}
            {burnRate.incomeOffsetCents > 0 && (
              <span className="text-success-text font-medium">
                Net after {formatCents(burnRate.incomeOffsetCents)} income offset
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {burnRate.status === 'on-track' && (
            <Tag color="borderless" className="rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-600)] m-0 flex items-center gap-1 px-2">
              <CheckCircle className="w-3 h-3" />
              <span className="font-semibold">
                {burnRate.isCompletedPeriod ? (
                  burnRate.budgetVarianceCents && burnRate.budgetVarianceCents > 0
                    ? `Saved ${formatCents(burnRate.budgetVarianceCents)}`
                    : 'Within Budget'
                ) : (
                  'On Track'
                )}
              </span>
            </Tag>
          )}
          {burnRate.status === 'warning' && (
            <Tag color="borderless" className="rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning-600)] m-0 flex items-center gap-1 px-2">
              <AlertTriangle className="w-3 h-3" /> <span className="font-semibold">Nearing Cap</span>
            </Tag>
          )}
          {burnRate.status === 'overspend' && (
            <Tag color="borderless" className="rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger-600)] m-0 flex items-center gap-1 px-2">
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold">
                {burnRate.isCompletedPeriod ? 'Over Budget by ' : 'Overspend by '}
                <span className="font-financial">{formatCents(Math.abs(burnRate.budgetVarianceCents || 0))}</span>
              </span>
            </Tag>
          )}
          {burnRate.status === 'no-budget' && (
            <Tag color="borderless" className="rounded-full bg-bg-subtle text-text-muted m-0 flex items-center gap-1 px-2">
              <span className="font-semibold cursor-pointer hover:text-text-main">+ Set Budget</span>
            </Tag>
          )}
        </div>
        {!burnRate.isCompletedPeriod && summary.safeDailySpendCents !== null && (
          <div className="mt-3 bg-[var(--color-success-bg)] text-[var(--color-success-600)] border border-[var(--color-success-border)] rounded-lg px-2.5 py-1.5 text-xs font-semibold inline-flex items-center self-start font-financial">
            Safe to spend: {formatCents(summary.safeDailySpendCents)} / day
          </div>
        )}
      </Card>

      {/* 3. Paid from Your Pocket */}
      <Card className="rounded-2xl border-border-base shadow-sm h-full flex flex-col justify-between">
        <div>
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Paid from Pocket</span>
            <Tooltip title="Actual cash or card transactions paid by you upfront (including group bills covered for friends).">
              <HelpCircle className="w-3.5 h-3.5 text-text-muted cursor-pointer hover:text-text-base" />
            </Tooltip>
          </div>
          <div className="text-3xl font-bold font-financial text-text-base">
            {formatCents(hybrid.totalOutlayCents)}
          </div>
        </div>
        <div className="mt-3">
          {hybrid.reimbursementPendingCents > 0 ? (
            <div className="text-xs flex items-center gap-1 text-[var(--color-success-600)] bg-[var(--color-success-bg)] px-2.5 py-1 rounded-full inline-flex font-medium">
              <ArrowDownRight className="w-3 h-3 shrink-0" />
              <span>Expecting <span className="font-financial font-bold">{formatCents(hybrid.reimbursementPendingCents)}</span> back</span>
            </div>
          ) : (
            <div className="text-xs text-text-muted">Matches your true spend</div>
          )}
        </div>
      </Card>
    </div>
  );
}
