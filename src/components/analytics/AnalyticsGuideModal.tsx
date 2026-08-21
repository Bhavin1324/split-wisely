import { Modal, Button, Tag } from 'antd';
import { 
  HelpCircle, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AnalyticsGuideModal({ open, onClose }: Props) {
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
          <span>How to Read Your Spending Analytics</span>
        </div>
      }
      className="analytics-guide-modal"
    >
      <div className="space-y-4 sm:space-y-5 pt-1 text-text-base max-h-[78vh] overflow-y-auto pr-1">
        {/* Intro Banner */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 flex items-start gap-2.5 sm:gap-3">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
            Split-Wisely combines your <strong className="text-text-main">Personal Ledger</strong> (private spending) with your <strong className="text-text-main">Group Splits</strong> (shared liabilities) into a single, unified financial intelligence dashboard.
          </p>
        </div>

        {/* Concept 1: Paid from Pocket vs True Spend */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h3 className="text-base font-bold mb-0 text-text-base">1. Paid from Pocket vs. Your True Spend</h3>
          </div>
          
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            When you pay for a group bill, your bank balance drops by the full amount, but your actual expense is only your individual share.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Paid from Pocket</div>
              <div className="text-sm font-bold text-text-base mt-1">Cash That Left Your Wallet</div>
              <p className="text-xs text-text-muted mt-1 mb-0">
                Personal purchases + full group bills paid upfront by you.
              </p>
              <div className="mt-2 text-xs font-financial font-semibold text-text-muted">
                Example: <span className="text-text-base">₹12,000 paid</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
              <div className="text-xs font-semibold text-[var(--color-primary-500)] uppercase tracking-wider">Your True Spend (Actual Share)</div>
              <div className="text-sm font-bold text-text-base mt-1">What You Actually Consumed</div>
              <p className="text-xs text-text-muted mt-1 mb-0">
                Personal purchases + only your split share of group expenses.
              </p>
              <div className="mt-2 text-xs font-financial font-semibold text-[var(--color-primary-500)]">
                Example: <span className="font-bold">₹4,000 true share</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success-500)] shrink-0" />
            <span>
              <strong className="text-text-main font-financial">Pending Reimbursements:</strong> Difference (<span className="font-financial font-bold text-text-base">₹8,000</span>) is money your friends owe back to you.
            </span>
          </div>
        </div>

        {/* Concept 2: Safe Daily Spend & Month-End Forecast */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-success-500)]" />
            <h3 className="text-base font-bold mb-0 text-text-base">2. Daily Safe Limit & Month-End Forecast</h3>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-text-muted">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-500)] mt-2 shrink-0" />
              <div>
                <strong className="text-text-main">Safe to Spend Daily:</strong> Dynamically calculates how much you can spend per day for the rest of the month without exceeding your budget:
                <div className="mt-1 p-2 rounded-lg bg-bg-surface border border-border-subtle font-financial text-xs font-semibold text-text-base">
                  Daily Safe Limit = Remaining Budget ÷ Remaining Days in Month
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-500)] mt-2 shrink-0" />
              <div>
                <strong className="text-text-main">Month-End Forecast:</strong> Extrapolates your current daily spending pace to predict total monthly spending:
                <div className="mt-1 p-2 rounded-lg bg-bg-surface border border-border-subtle font-financial text-xs font-semibold text-text-base">
                  Projected Total = (Net Spend ÷ Elapsed Days) × Total Days in Month
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concept 3: Spending Pace & Comparison */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h3 className="text-base font-bold mb-0 text-text-base">3. Spending Pace & Period Comparison</h3>
          </div>

          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            The spending pace chart graphs your month-to-date spending curve day-by-day (solid line) against the previous period (dashed line) at the exact same calendar milestone:
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Tag color="blue" className="rounded-full">Solid Line = Current Period Cumulative</Tag>
            <Tag className="rounded-full">Dashed Line = Previous Period Cumulative</Tag>
            <Tag color="green" className="rounded-full font-financial">-15% = Spending slower than last month</Tag>
          </div>
        </div>

        {/* Concept 4: Activity With Friends */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h3 className="text-base font-bold mb-0 text-text-base">4. Activity With Friends</h3>
          </div>

          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            Tracks real-time settlement dynamics with your top peers during the selected time window:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
              <Tag color="green" className="font-financial font-semibold">+₹X Net Inflow</Tag>
              <p className="text-text-muted mt-1.5 mb-0">You covered more for this friend than they covered for you.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
              <Tag color="red" className="font-financial font-semibold">-₹X Net Outflow</Tag>
              <p className="text-text-muted mt-1.5 mb-0">This friend covered more for you than you covered for them.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-bg-surface border border-border-subtle">
              <Tag className="font-semibold">Settled</Tag>
              <p className="text-text-muted mt-1.5 mb-0">All shared expenses in this period are perfectly balanced.</p>
            </div>
          </div>
        </div>

        {/* Concept 5: Strict vs Dynamic Budgeting */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bg-subtle border border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[var(--color-primary-500)]" />
            <h3 className="text-base font-bold mb-0 text-text-base">5. Strict vs. Dynamic Budgeting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
              <div className="font-bold text-text-base flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-text-muted" />
                <span>Strict Mode</span>
              </div>
              <p className="text-xs text-text-muted mt-1 mb-0">
                Gross expenses directly deplete your monthly budget. Inflows and refunds are tracked separately and do not expand spending capacity.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
              <div className="font-bold text-[var(--color-primary-500)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Dynamic Mode</span>
              </div>
              <p className="text-xs text-text-muted mt-1 mb-0">
                Inflows and reimbursements offset your expense total (<span className="font-financial">Net Expense = Expense - Income</span>), giving you more safe room to spend.
              </p>
            </div>
          </div>
        </div>

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
