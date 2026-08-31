import { useState } from 'react';
import { Modal, Button, Tag, Segmented } from 'antd';
import { 
  HelpCircle, 
  Wallet, 
  PieChart, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowDownRight, 
  Calculator, 
  Info 
} from 'lucide-react';
import type { AnalyticsSummary } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: AnalyticsSummary;
  periodLabel: string;
}

export function AnalyticsGuideModal({ open, onClose, summary, periodLabel }: Props) {
  const { hybrid, burnRate, budgetAmountCents, safeDailySpendCents } = summary;

  const hasUserData = hybrid.totalOutlayCents > 0 || hybrid.totalTrueCostCents > 0;
  const [activeTab, setActiveTab] = useState<'my-data' | 'sample'>('my-data');

  // Switch tab automatically if user opens with/without data
  const personalPct = hybrid.totalTrueCostCents > 0 
    ? Math.round((hybrid.personalExpenseCents / hybrid.totalTrueCostCents) * 100) 
    : 0;
  const groupPct = hybrid.totalTrueCostCents > 0 
    ? Math.round((hybrid.groupNetShareCents / hybrid.totalTrueCostCents) * 100) 
    : 0;

  const remainingDays = Math.max(1, burnRate.totalDaysInPeriod - burnRate.elapsedDays);
  const remainingBudgetCents = budgetAmountCents != null 
    ? Math.max(0, budgetAmountCents - hybrid.totalTrueCostCents) 
    : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      style={{ top: 16, maxWidth: 'calc(100vw - 24px)', margin: '0 auto' }}
      title={
        <div className="flex items-center gap-2 text-text-base text-base sm:text-lg font-bold">
          <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span>How Your Spending Analytics Are Calculated</span>
        </div>
      }
      className="analytics-guide-modal"
    >
      <div className="space-y-4 sm:space-y-5 pt-1 text-text-base max-h-[78vh] overflow-y-auto pr-1">
        {/* Mode Switcher */}
        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'my-data' | 'sample')}
          options={[
            {
              label: (
                <span className={`px-2 py-0.5 font-semibold text-xs transition-colors ${activeTab === 'my-data' ? 'text-primary-500 font-bold' : 'text-text-muted'}`}>
                  My Data({periodLabel})
                </span>
              ),
              value: 'my-data',
            },
            {
              label: (
                <span className={`px-2 py-0.5 font-semibold text-xs transition-colors ${activeTab === 'sample' ? 'text-primary-500 font-bold' : 'text-text-muted'}`}>
                  Sample Example
                </span>
              ),
              value: 'sample',
            },
          ]}
          className="w-full bg-bg-subtle p-1 rounded-xl border border-border-subtle"
          block
        />

        {activeTab === 'my-data' ? (
          /* TAB 1: LIVE USER AUDIT BREAKDOWN */
          <div className="space-y-4">
            {/* Live Audit Intro Banner */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 flex items-start gap-2.5 sm:gap-3">
              <Calculator className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
                This is the exact real-time math behind your cards for <strong className="text-text-main">{periodLabel}</strong>.
              </p>
            </div>

            {!hasUserData && (
              <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle text-xs text-text-muted flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-500 shrink-0" />
                <span>You have no recorded expenses in this period yet. Switch to the <strong>Sample Walkthrough</strong> tab to see how it works!</span>
              </div>
            )}

            {/* 1. Your True Spend Audit */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary-500" />
                  <h3 className="text-base font-bold mb-0 text-text-base">1. Your True Spend Breakdown</h3>
                </div>
                <span className="text-sm font-bold font-financial text-primary-600">
                  {formatCents(hybrid.totalTrueCostCents)}
                </span>
              </div>
              
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
                This is your actual consumed expense (personal purchases + only your split share of group bills):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                  <div className="text-xs text-text-muted font-medium">Personal Ledger Purchases</div>
                  <div className="text-base font-bold font-financial text-text-base mt-1">
                    {formatCents(hybrid.personalExpenseCents)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">Direct private spending</div>
                </div>

                <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                  <div className="text-xs text-text-muted font-medium">Your Group Bill Shares</div>
                  <div className="text-base font-bold font-financial text-text-base mt-1">
                    +{formatCents(hybrid.groupNetShareCents)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">Your share of split group expenses</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                <span>
                  <strong className="text-text-main font-financial">Calculation:</strong>{' '}
                  <span className="font-financial">{formatCents(hybrid.personalExpenseCents)}</span> (Personal) +{' '}
                  <span className="font-financial">{formatCents(hybrid.groupNetShareCents)}</span> (Group Share) ={' '}
                  <strong className="text-text-main font-financial">{formatCents(hybrid.totalTrueCostCents)}</strong>
                </span>
              </div>
            </div>

            {/* 2. Paid from Pocket vs Reimbursements */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  <h3 className="text-base font-bold mb-0 text-text-base">2. Paid from Pocket vs. True Spend</h3>
                </div>
                <span className="text-sm font-bold font-financial text-text-base">
                  {formatCents(hybrid.totalOutlayCents)}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
                Shows why the cash that left your bank is different from your true consumption:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                  <div className="text-xs text-text-muted font-medium">Total Cash Paid Upfront</div>
                  <div className="text-base font-bold font-financial text-text-base mt-1">
                    {formatCents(hybrid.totalOutlayCents)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">What you physically paid at checkout</div>
                </div>

                <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
                  <div className="text-xs text-text-muted font-medium">Your Actual Consumed Share</div>
                  <div className="text-base font-bold font-financial text-text-base mt-1">
                    −{formatCents(hybrid.totalTrueCostCents)}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">Your portion of all expenses</div>
                </div>
              </div>

              {hybrid.reimbursementPendingCents > 0 ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success-600)] border border-[var(--color-success-border)] text-xs">
                  <ArrowDownRight className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Pending Reimbursements:</strong> You fronted group bills for friends. You are expecting{' '}
                    <strong className="font-financial font-bold">{formatCents(hybrid.reimbursementPendingCents)}</strong> back from them!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-muted">
                  <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Your cash paid matches your true share (no pending fronted balances).</span>
                </div>
              )}
            </div>

            {/* 3. Daily Safe Limit & Month-End Forecast */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-success-500" />
                  <h3 className="text-base font-bold mb-0 text-text-base">3. Daily Safe Limit & Forecast</h3>
                </div>
                {safeDailySpendCents !== null && (
                  <Tag color="green" className="font-financial font-bold m-0">
                    {formatCents(safeDailySpendCents)} / day
                  </Tag>
                )}
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm text-text-muted">
                {budgetAmountCents != null ? (
                  <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle space-y-1">
                    <div className="text-text-main font-semibold">Safe Daily Limit Math:</div>
                    <div className="font-financial text-xs">
                      Budget (<span className="font-bold">{formatCents(budgetAmountCents)}</span>) − Spent (<span className="font-bold">{formatCents(hybrid.totalTrueCostCents)}</span>) = <strong className="text-text-main">{formatCents(remainingBudgetCents || 0)}</strong> remaining
                    </div>
                    <div className="font-financial text-xs pt-1 border-t border-border-subtle text-primary-600 font-semibold">
                      {formatCents(remainingBudgetCents || 0)} ÷ {remainingDays} days left = {formatCents(safeDailySpendCents || 0)} / day safe limit
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle text-xs text-text-muted">
                    No budget configured for this period. Set a budget in Personal Ledger to enable your Safe Daily Limit!
                  </div>
                )}

                <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle space-y-1">
                  <div className="text-text-main font-semibold">Month-End Forecast Math:</div>
                  <div className="font-financial text-xs">
                    Current Pace: <strong className="text-text-main">{formatCents(burnRate.dailyBurnCents)} / day</strong> (over {burnRate.elapsedDays} elapsed days)
                  </div>
                  <div className="font-financial text-xs pt-1 border-t border-border-subtle text-primary-600 font-semibold">
                    {formatCents(burnRate.dailyBurnCents)}/day × {burnRate.totalDaysInPeriod} total days = {formatCents(burnRate.projectedPeriodTotalCents)} Projected Total
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Personal vs Group Proportion */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                <h3 className="text-base font-bold mb-0 text-text-base">4. Personal vs. Group Share Ratio</h3>
              </div>

              <div className="space-y-2">
                <div className="h-5 w-full flex rounded-lg overflow-hidden bg-bg-surface border border-border-subtle">
                  <div className="h-full bg-primary-500" style={{ width: `${personalPct}%` }} />
                  <div className="h-full bg-[var(--color-yellow-500)]" style={{ width: `${groupPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold font-financial">
                  <span className="text-primary-600">👤 Personal: {personalPct}% ({formatCents(hybrid.personalExpenseCents)})</span>
                  <span className="text-yellow-600">👥 Group Shares: {groupPct}% ({formatCents(hybrid.groupNetShareCents)})</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: SAMPLE SCENARIO WALKTHROUGH */
          <div className="space-y-4">
            {/* Story Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-primary-500/5 border border-primary-500/20 space-y-3">
              <div className="flex items-center gap-2 text-primary-600 font-bold text-sm sm:text-base">
                <Sparkles className="w-5 h-5" />
                <span>The Story: "A Weekend with Friends"</span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
                Imagine this typical weekend scenario:
              </p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle flex items-start gap-2">
                  <span className="font-bold text-primary-600">1.</span>
                  <div>You buy personal weekly groceries for yourself: <strong className="font-financial text-text-main">₹2,000</strong>.</div>
                </div>
                <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle flex items-start gap-2">
                  <span className="font-bold text-primary-600">2.</span>
                  <div>You pay the full dinner bill for 4 friends: <strong className="font-financial text-text-main">₹4,000</strong> <em>(Your share is ₹1,000; friends owe you ₹3,000)</em>.</div>
                </div>
                <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle flex items-start gap-2">
                  <span className="font-bold text-primary-600">3.</span>
                  <div>Your friend Amit pays for movie tickets: <strong className="font-financial text-text-main">₹2,000</strong> <em>(Your share is ₹500; you owe Amit ₹500)</em>.</div>
                </div>
              </div>
            </div>

            {/* How Each Card is Calculated Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                How Centfolio Computes the Cards from this Story:
              </h4>

              {/* Row 1: Paid from Pocket */}
              <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-muted uppercase">Paid from Pocket</span>
                  <span className="text-base font-bold font-financial text-text-main">₹6,000</span>
                </div>
                <p className="text-xs text-text-muted mb-0">
                  Total cash swiped from your bank = <span className="font-financial font-semibold">₹2,000</span> (groceries) + <span className="font-financial font-semibold">₹4,000</span> (dinner bill paid upfront).
                </p>
              </div>

              {/* Row 2: Your True Spend */}
              <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-500 uppercase">Your True Spend</span>
                  <span className="text-base font-bold font-financial text-primary-600">₹3,500</span>
                </div>
                <p className="text-xs text-text-muted mb-0">
                  What you actually consumed = <span className="font-financial font-semibold">₹2,000</span> (groceries) + <span className="font-financial font-semibold">₹1,000</span> (dinner share) + <span className="font-financial font-semibold">₹500</span> (movie share).
                </p>
              </div>

              {/* Row 3: Reimbursement Badge */}
              <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-success-600 uppercase">Pending Reimbursements</span>
                  <span className="text-sm font-bold font-financial text-success-600 bg-[var(--color-success-bg)] px-2 py-0.5 rounded-full">
                    Expecting ₹2,500 back
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-0">
                  Cash Paid Upfront (<span className="font-financial font-semibold">₹6,000</span>) − Your True Share (<span className="font-financial font-semibold">₹3,500</span>) = <strong className="font-financial text-text-main">₹2,500</strong> friends owe you back.
                </p>
              </div>

              {/* Row 4: Forecast & Safe Daily Spend */}
              <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-subtle space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-muted uppercase">Safe Daily Spend (Budget: ₹15,000)</span>
                  <span className="text-sm font-bold font-financial text-success-600">₹575 / day</span>
                </div>
                <p className="text-xs text-text-muted mb-0">
                  Remaining Budget (<span className="font-financial font-semibold">₹11,500</span>) ÷ Remaining 20 days in month = <strong className="font-financial text-text-main">₹575/day</strong> safe limit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <Button 
            type="primary" 
            onClick={onClose}
            className="rounded-xl px-6 font-semibold"
          >
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
}
