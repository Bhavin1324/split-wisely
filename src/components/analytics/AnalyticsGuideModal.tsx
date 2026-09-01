import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Tag, Segmented } from 'antd';
import { 
  HelpCircle, 
  Wallet, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  ArrowDownRight, 
  ArrowRight,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import type { AnalyticsSummary } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: AnalyticsSummary;
  periodLabel: string;
}

export function AnalyticsGuideModal({ open, onClose, summary, periodLabel }: Props) {
  const isMobile = useIsMobile(640);
  const { hybrid, burnRate, budgetAmountCents, safeDailySpendCents } = summary;

  const [activeTab, setActiveTab] = useState<'pipeline' | 'forecast'>('pipeline');
  const [dataMode, setDataMode] = useState<'my-data' | 'sample'>('my-data');

  // Sample Data for Tutorial Mode
  const SAMPLE = {
    personalSpendCents: 200000,      // ₹2,000 personal groceries
    groupBillTotalCents: 400000,     // ₹4,000 dinner bill fronted
    yourGroupShareCents: 100000,     // ₹1,000 personal share
    friendsOwedCents: 300000,        // ₹3,000 friends owe back
    otherGroupShareCents: 50000,     // ₹500 movie ticket split
    totalTrueSpendCents: 350000,     // ₹2,000 + ₹1,000 + ₹500 = ₹3,500
    totalOutlayCents: 600000,        // ₹2,000 + ₹4,000 = ₹6,000
    reimbursementsCents: 250000,     // ₹6,000 - ₹3,500 = ₹2,500
    // Forecast Sample (e.g. Day 16 of 31)
    sampleElapsedDays: 16,
    sampleTotalDays: 31,
    sampleRemainingDays: 15,
    sampleActualSpentCents: 1420000, // ₹14,200
    sampleDailyBurnCents: 88750,     // ₹887.50 / day
    sampleRemainingForecastCents: 1331250, // ₹13,312.50
    sampleProjectedTotalCents: 2751250,    // ₹27,512.50
    sampleBudgetCents: 3000000,      // ₹30,000
    sampleSafeDailySpendCents: 105333, // (30,000 - 14,200) / 15 = ₹1,053.33 / day
  };

  const isSample = dataMode === 'sample';

  // Pipeline Data
  const personalSpend = isSample ? SAMPLE.personalSpendCents : hybrid.personalExpenseCents;
  const groupShare = isSample ? (SAMPLE.yourGroupShareCents + SAMPLE.otherGroupShareCents) : hybrid.groupNetShareCents;
  const trueSpend = isSample ? SAMPLE.totalTrueSpendCents : hybrid.totalTrueCostCents;
  const outlay = isSample ? SAMPLE.totalOutlayCents : hybrid.totalOutlayCents;
  const pendingReimbursement = isSample ? SAMPLE.reimbursementsCents : hybrid.reimbursementPendingCents;

  // Forecast Data
  const elapsedDays = isSample ? SAMPLE.sampleElapsedDays : burnRate.elapsedDays;
  const totalDays = isSample ? SAMPLE.sampleTotalDays : burnRate.totalDaysInPeriod;
  const daysRemaining = isSample ? SAMPLE.sampleRemainingDays : burnRate.daysRemainingInPeriod;
  const actualSpent = isSample ? SAMPLE.sampleActualSpentCents : burnRate.actualSpentSoFarCents;
  const dailyBurn = isSample ? SAMPLE.sampleDailyBurnCents : burnRate.dailyBurnCents;
  const remainingForecast = isSample ? SAMPLE.sampleRemainingForecastCents : burnRate.projectedRemainingSpendCents;
  const projectedTotal = isSample ? SAMPLE.sampleProjectedTotalCents : burnRate.projectedPeriodTotalCents;
  const budgetVal = isSample ? SAMPLE.sampleBudgetCents : budgetAmountCents;
  const safeDailyVal = isSample ? SAMPLE.sampleSafeDailySpendCents : safeDailySpendCents;
  const isCompleted = isSample ? false : burnRate.isCompletedPeriod;

  const elapsedPercent = Math.min(100, Math.round((elapsedDays / Math.max(1, totalDays)) * 100));

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose });

  const renderContent = () => (
    <div className="space-y-4">
      {/* ── Top Level Tab Navigation ── */}
      <Segmented
        value={activeTab}
        onChange={(val) => setActiveTab(val as 'pipeline' | 'forecast')}
        options={[
          {
            label: (
              <span className="flex items-center justify-center gap-1.5 py-1 font-semibold text-xs truncate">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>{isMobile ? 'Money Flow' : 'Money Flow (True Spend vs Outlay)'}</span>
              </span>
            ),
            value: 'pipeline',
          },
          {
            label: (
              <span className="flex items-center justify-center gap-1.5 py-1 font-semibold text-xs truncate">
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>{isMobile ? 'Month Forecast' : 'Month Forecast & Pace'}</span>
              </span>
            ),
            value: 'forecast',
          },
        ]}
        className="w-full bg-bg-subtle p-1 rounded-xl border border-border-base"
        block
      />

      {/* ── Data Source Toggle ── */}
      <div className="flex items-center justify-between px-1 text-xs gap-2">
        <span className="text-text-muted font-medium truncate">
          {dataMode === 'my-data' ? `Period: ${periodLabel}` : 'Tutorial Mode'}
        </span>
        <Segmented
          value={dataMode}
          onChange={(v) => setDataMode(v as 'my-data' | 'sample')}
          options={[
            { label: 'My Data', value: 'my-data' },
            { label: 'Sample Story', value: 'sample' },
          ]}
          size="small"
          className="bg-bg-subtle border border-border-base shrink-0"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: VISUAL MONEY PIPELINE (True Spend vs Outlay)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pipeline' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Friendly Story Banner */}
          <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-xs text-text-muted flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-base block mb-0.5">
                {isSample ? 'Sample Story: Weekend with Friends' : `Your Spend Flow (${periodLabel})`}
              </strong>
              <p className="mb-0 leading-relaxed">
                {isSample
                  ? 'You bought ₹2,000 solo groceries, fronted a ₹4,000 dinner bill (your share ₹1,000), and split a ₹500 movie ticket paid by a friend.'
                  : 'How your solo purchases and shared group bills branch into actual consumption vs cash paid.'}
              </p>
            </div>
          </div>

          {/* Visual Money Pipeline Diagram */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle border border-border-base space-y-3.5">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                1. Where Did Your Money Go?
              </span>
            </div>

            {/* Input Streams */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Stream 1: Solo Purchases */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base space-y-1 text-center shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Solo Purchases</span>
                </div>
                <div className="text-lg font-bold font-financial text-text-base">
                  {formatCents(personalSpend)}
                </div>
                <span className="text-[10px] text-text-muted block">Groceries, coffee & private bills</span>
              </div>

              {/* Stream 2: Shared Group Bills */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base space-y-1 text-center shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>Your Share of Shared Bills</span>
                </div>
                <div className="text-lg font-bold font-financial text-text-base">
                  +{formatCents(groupShare)}
                </div>
                <span className="text-[10px] text-text-muted block">Your slice of group dinners & rent</span>
              </div>
            </div>

            {/* Flow Indicator Badge */}
            <div className="flex items-center justify-center py-0.5">
              <div className="px-3 py-1 rounded-full bg-bg-surface border border-border-base text-[10px] font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
                <span>Why Are There 2 Different Numbers?</span>
                <ArrowRight className="w-3 h-3 text-primary-500" />
              </div>
            </div>

            {/* Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Output A: Card 1 (True Spend) */}
              <div className="p-3.5 rounded-xl bg-[var(--color-primary-500)]/10 border border-primary-500/30 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">
                    Card 1: Your True Spend
                  </span>
                  <Tag color="blue" className="font-bold text-[10px] m-0">Consumption</Tag>
                </div>
                <div className="text-xl font-extrabold font-financial text-primary-600">
                  {formatCents(trueSpend)}
                </div>
                <p className="text-[11px] text-text-muted leading-tight mb-0">
                  {formatCents(personalSpend)} (Solo) + {formatCents(groupShare)} (Group Share).
                </p>
                <span className="text-[10px] text-primary-700 font-medium block">
                  What you actually consumed — counts against your budget.
                </span>
              </div>

              {/* Output B: Card 3 (Paid from Pocket) */}
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border-base space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Card 3: Paid from Pocket
                  </span>
                  <Tag color="default" className="font-bold text-[10px] m-0">Bank Outlay</Tag>
                </div>
                <div className="text-xl font-extrabold font-financial text-text-base">
                  {formatCents(outlay)}
                </div>
                <p className="text-[11px] text-text-muted leading-tight mb-0">
                  Total money that physically left your card or bank account.
                </p>
                <span className="text-[10px] text-text-muted font-medium block">
                  Includes full group bills you paid upfront for others.
                </span>
              </div>
            </div>

            {/* Money Coming Back Box */}
            <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-500)]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-[var(--color-success-500)]/20 text-success-text shrink-0">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-success-text block truncate">
                    {pendingReimbursement > 0 ? 'Money Coming Back to You' : 'Settled Balance'}
                  </span>
                  <span className="text-[11px] text-text-muted block truncate">
                    Cash Paid ({formatCents(outlay)}) − True Spend ({formatCents(trueSpend)})
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base sm:text-lg font-extrabold font-financial text-success-text block">
                  {pendingReimbursement > 0 ? `+${formatCents(pendingReimbursement)}` : '₹0.00'}
                </span>
                <span className="text-[10px] text-success-text font-semibold uppercase tracking-wider">
                  {pendingReimbursement > 0 ? 'Expecting Back' : 'All Square'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: TIMELINE FORECAST & PACE EXPLORER (Composite Model)
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'forecast' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Header Banner */}
          <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-xs text-text-muted flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-base block mb-0.5">
                {isCompleted
                  ? 'Final Month Spend (Period Concluded)'
                  : 'How Centfolio Predicts Your Month-End Total'}
              </strong>
              <p className="mb-0 leading-relaxed">
                {isCompleted
                  ? 'The month is over, so the forecast multiplier drops to 0 remaining days. Your final total equals your exact unrounded spend.'
                  : 'We anchor to what you have already spent, and predict only the remaining days using your daily spending pace.'}
              </p>
            </div>
          </div>

          {/* Visual Timeline Gauge */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle border border-border-base space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text-base flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-500" />
                <span>{isCompleted ? 'Concluded Month' : 'Calendar Timeline'} ({elapsedDays}/{totalDays} days)</span>
              </span>
              <span className="text-[11px] font-semibold text-primary-600 font-financial">
                {isCompleted ? 'Month complete' : `${daysRemaining} days left`}
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="h-6 w-full rounded-xl bg-bg-surface border border-border-base overflow-hidden flex p-0.5 shadow-inner">
              <div
                style={{ width: `${elapsedPercent}%` }}
                className="h-full bg-primary-500 rounded-lg flex items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden px-1"
              >
                {elapsedPercent >= 20 && `${elapsedDays}d (${elapsedPercent}%)`}
              </div>
              <div
                style={{ width: `${100 - elapsedPercent}%` }}
                className="h-full bg-primary-500/20 border-l border-dashed border-primary-500/40 rounded-r-lg flex items-center justify-center text-[10px] font-bold text-primary-700 overflow-hidden px-1"
              >
                {(100 - elapsedPercent) >= 20 && `${daysRemaining}d left`}
              </div>
            </div>

            <div className="grid grid-cols-2 text-xs pt-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-primary-600 block">Solid (Past Days)</span>
                <span className="font-financial font-semibold text-text-base">
                  {formatCents(actualSpent)} ({elapsedDays} days)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-primary-700 block">Dotted (Remaining)</span>
                <span className="font-financial font-semibold text-text-base">
                  +{formatCents(remainingForecast)} ({daysRemaining}d × {formatCents(dailyBurn)}/d)
                </span>
              </div>
            </div>
          </div>

          {/* 3-Step Plain English Blocks */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-1 block">
              How Card 2 is Calculated (Step-by-Step):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Step 1 */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase block">1. Already Spent</span>
                <div className="text-base font-bold font-financial text-text-base">
                  {formatCents(actualSpent)}
                </div>
                <p className="text-[10px] text-text-muted mb-0">
                  Real purchases recorded up to today.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base space-y-1">
                <span className="text-[11px] font-bold text-primary-600 uppercase block">2. Expected Upcoming</span>
                <div className="text-base font-bold font-financial text-primary-600">
                  +{formatCents(remainingForecast)}
                </div>
                <p className="text-[10px] text-text-muted mb-0 font-financial">
                  {formatCents(dailyBurn)}/day × {daysRemaining} days left.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/30 space-y-1">
                <span className="text-[11px] font-bold text-primary-700 uppercase block">3. Expected Total</span>
                <div className="text-base font-extrabold font-financial text-primary-600">
                  {formatCents(projectedTotal)}
                </div>
                <p className="text-[10px] text-primary-700 mb-0">
                  Already Spent + Expected Upcoming.
                </p>
              </div>
            </div>
          </div>

          {/* Month Finished Callout */}
          <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-text-base font-bold">
              <CheckCircle2 className="w-4 h-4 text-success-text" />
              <span>When the Month Finishes</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed mb-0">
              When the last day ends, remaining days become 0. Expected Upcoming drops to <strong>₹0.00</strong>, so your expected total becomes your exact final bill with 0% guesswork!
            </p>
          </div>

          {/* Safe Daily Spend Limit Insight */}
          {budgetVal != null && (
            <div className="p-3.5 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success-500)]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-[var(--color-success-500)]/20 text-success-text shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-success-text block truncate">
                    Daily Safe Spend Limit
                  </span>
                  <span className="text-[11px] text-text-muted block truncate">
                    Remaining Budget ÷ {daysRemaining} days left
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base sm:text-lg font-extrabold font-financial text-success-text block">
                  {safeDailyVal != null ? `${formatCents(safeDailyVal)} / day` : '₹0.00 / day'}
                </span>
                <span className="text-[10px] text-success-text font-semibold uppercase tracking-wider">
                  Safe Daily Pace
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  Mobile Bottom Sheet Drawer (< 640px)
  // ══════════════════════════════════════════════════════════════
  if (isMobile) {
    if (!isRendered) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
        {/* Backdrop Overlay */}
        <div
          ref={backdropRef}
          onClick={() => triggerDismiss()}
          className="fixed inset-0 bg-black/65 backdrop-blur-md animate-backdrop-fade-in will-change-[opacity]"
        />

        {/* Sliding Bottom Sheet */}
        <div
          ref={sheetRef}
          className="relative z-10 w-full max-h-[90dvh] bg-bg-surface rounded-t-3xl border-t border-border-base shadow-2xl flex flex-col overflow-hidden will-change-transform animate-sheet-slide-up"
        >
          {/* Drag Handle & Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="pt-3 pb-2.5 px-4 flex flex-col items-center border-b border-border-base shrink-0 cursor-grab active:cursor-grabbing select-none touch-none bg-bg-surface"
          >
            <div className="w-12 h-1.5 bg-border-base hover:bg-border-strong rounded-full shrink-0 transition-colors" />
            <div className="flex items-center justify-between w-full pt-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-primary-500/10 text-primary-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-text-base">Analytics Guide</span>
              </div>
              <span className="text-xs text-text-muted font-medium truncate max-w-[140px]">{periodLabel}</span>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">{renderContent()}</div>
        </div>
      </div>,
      document.body
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  Desktop Centered Modal (>= 640px)
  // ══════════════════════════════════════════════════════════════
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      centered
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2 text-text-base text-base font-bold">
            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>How Your Spending Analytics Are Calculated</span>
          </div>
          <span className="text-xs font-normal text-text-muted bg-bg-subtle border border-border-base px-2.5 py-1 rounded-lg truncate max-w-[180px]">
            {periodLabel}
          </span>
        </div>
      }
    >
      <div className="pt-2 pb-1 max-h-[75vh] overflow-y-auto pr-1">{renderContent()}</div>
    </Modal>
  );
}
