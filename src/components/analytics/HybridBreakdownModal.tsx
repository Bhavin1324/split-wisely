import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Segmented, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  ChevronRight,
  Utensils,
  Car,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  Banknote,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Tag,
  Smartphone,
  CreditCard,
  Building2,
  Receipt,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { formatCents } from '../../utils/currency';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';
import type {
  GroupSpendingBreakdown,
  PersonalSpendingBreakdown,
  HybridTotals,
} from '../../hooks/useAnalyticsData';

interface HybridBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'PERSONAL' | 'GROUP';
  periodLabel: string;
  groupBreakdowns: GroupSpendingBreakdown[];
  personalBreakdown: PersonalSpendingBreakdown;
  hybrid: HybridTotals;
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  Food: Utensils,
  Transport: Car,
  Bills: Zap,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Health: HeartPulse,
  Salary: Banknote,
  Freelance: Laptop,
  Investments: TrendingUp,
  Gifts: Gift,
  Refund: RotateCcw,
  Other: Tag,
};

const PAYMENT_ICON_MAP: Record<string, any> = {
  UPI: Smartphone,
  CARD: CreditCard,
  CASH: Banknote,
  BANK: Building2,
  OTHER: Tag,
};

export function HybridBreakdownModal({
  open,
  onClose,
  initialTab = 'GROUP',
  periodLabel,
  groupBreakdowns,
  personalBreakdown,
  hybrid,
}: HybridBreakdownModalProps) {
  const isMobile = useIsMobile(640);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'GROUP'>(initialTab);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose });

  const handleNavigateGroup = (groupId: string) => {
    if (groupId && groupId !== 'standalone') {
      if (isMobile) triggerDismiss();
      else onClose();
      navigate(`/groups/${groupId}`);
    }
  };

  const handleNavigatePersonal = () => {
    if (isMobile) triggerDismiss();
    else onClose();
    navigate('/personal');
  };

  // ══════════════════════════════════════════════════════════════
  //  Modal Body Content
  // ══════════════════════════════════════════════════════════════
  const renderContent = () => (
    <div className="space-y-4">
      {/* ── Segmented Control Switcher ── */}
      <div className="flex justify-center">
        <Segmented
          options={[
            {
              label: (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs sm:text-sm">Personal Spend</span>
                </div>
              ),
              value: 'PERSONAL',
            },
            {
              label: (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs sm:text-sm">Group Bills</span>
                </div>
              ),
              value: 'GROUP',
            },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'PERSONAL' | 'GROUP')}
          className="bg-bg-subtle p-1 rounded-xl border border-border-base w-full max-w-xs"
          block
        />
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  VIEW A: Personal Spend Breakdown                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'PERSONAL' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Stat Pill Rail */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-bg-subtle border border-border-base text-center">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-wider">Total Spent</span>
              <span className="text-xs sm:text-base font-bold font-financial text-text-base truncate">
                {formatCents(personalBreakdown.totalExpenseCents)}
              </span>
            </div>
            <div className="flex flex-col border-x border-border-subtle px-1">
              <span className="text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-wider">Entries</span>
              <span className="text-xs sm:text-base font-bold font-financial text-text-base truncate">
                {personalBreakdown.transactionCount} <span className="text-[11px] font-normal text-text-muted">tx</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] font-medium text-text-muted uppercase tracking-wider">Average</span>
              <span className="text-xs sm:text-base font-bold font-financial text-text-base truncate">
                {formatCents(personalBreakdown.averageTxCents)}
              </span>
            </div>
          </div>

          {/* Categories Distribution List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Category Distribution ({personalBreakdown.categories.length})
              </span>
              <span className="text-[11px] text-text-muted">Sorted by spend</span>
            </div>

            {personalBreakdown.categories.length > 0 ? (
              <div className="space-y-2">
                {personalBreakdown.categories.map((cat) => {
                  const Icon = CATEGORY_ICON_MAP[cat.name] || Tag;
                  return (
                    <div
                      key={cat.name}
                      className="p-3 rounded-xl bg-bg-surface border border-border-base flex flex-col gap-2 hover:border-primary-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-semibold text-text-base truncate block">
                              {cat.name}
                            </span>
                            <span className="text-[11px] text-text-muted font-normal block">
                              {cat.count} {cat.count === 1 ? 'transaction' : 'transactions'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-bold font-financial text-text-base block">
                            {formatCents(cat.totalCents)}
                          </span>
                          <span className="text-[11px] font-semibold text-primary-600 font-financial">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual Category Progress Rail */}
                      <div className="w-full bg-bg-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(3, cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border-base rounded-2xl text-text-muted text-xs">
                No personal transactions recorded for {periodLabel}.
              </div>
            )}
          </div>

          {/* Payment Method Distribution */}
          {personalBreakdown.paymentMethods.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                Payment Instruments
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {personalBreakdown.paymentMethods.map((pm) => {
                  const Icon = PAYMENT_ICON_MAP[pm.method] || Tag;
                  return (
                    <div
                      key={pm.method}
                      className="p-2.5 rounded-xl border border-border-base bg-bg-surface flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Icon className="w-3.5 h-3.5 text-text-base shrink-0" />
                        <span className="font-semibold text-text-base">{pm.method}</span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-bold font-financial text-text-base truncate mr-1">
                          {formatCents(pm.totalCents)}
                        </span>
                        <span className="text-[10px] text-text-muted font-financial font-medium shrink-0">
                          {pm.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA Link to Personal Page */}
          <Button
            type="default"
            block
            onClick={handleNavigatePersonal}
            className="h-11 rounded-xl font-semibold text-xs sm:text-sm border-border-base hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2"
          >
            <span>Open Full Personal Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  VIEW B: Group Shares Breakdown                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === 'GROUP' && (
        <div className="space-y-4 animate-fade-in">
          {/* Quick Context Banner */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-yellow-bg)] border border-[var(--color-yellow-500)]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-yellow-500)]/20 text-[var(--color-yellow-600)] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-text-base block truncate">Your Shared Consumption</span>
                <span className="text-[11px] text-text-muted block truncate">Calculated from individual expense splits</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-extrabold font-financial text-text-base block">
                {formatCents(hybrid.groupNetShareCents)}
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-yellow-600)] font-financial">
                {groupBreakdowns.length} {groupBreakdowns.length === 1 ? 'Group' : 'Groups'}
              </span>
            </div>
          </div>

          {/* List of Active Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Group Breakdown ({groupBreakdowns.length})
              </span>
              <span className="text-[11px] text-text-muted">Tap to view group</span>
            </div>

            {groupBreakdowns.length > 0 ? (
              <div className="space-y-2.5">
                {groupBreakdowns.map((grp) => (
                  <div
                    key={grp.groupId}
                    onClick={() => handleNavigateGroup(grp.groupId)}
                    className="p-3.5 rounded-2xl bg-bg-surface border border-border-base flex flex-col gap-2 hover:border-primary-500/60 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    {/* Top Row: Group Identity & Your Share */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                          {grp.groupName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-xs sm:text-sm text-text-base truncate group-hover:text-primary-600 transition-colors">
                              {grp.groupName}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:translate-x-0.5 group-hover:text-primary-600 transition-all shrink-0" />
                          </div>
                          <span className="text-[11px] text-text-muted block truncate">
                            {grp.expenseCount} {grp.expenseCount === 1 ? 'expense' : 'expenses'} in {periodLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold font-financial text-text-base block">
                          {formatCents(grp.myShareCents)}
                        </span>
                        <span className="text-[10px] font-semibold text-text-muted font-financial">
                          {grp.percentageOfTotalGroupShares}% of your shared bills
                        </span>
                      </div>
                    </div>

                    {/* Progress Rail Showing Proportion */}
                    <div className="w-full bg-bg-subtle h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--color-yellow-500)] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(3, grp.percentageOfTotalGroupShares)}%` }}
                      />
                    </div>

                    {/* Metadata Footer: Total Bill Volume & Outlay */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5 text-text-muted border-t border-border-subtle/60 gap-2">
                      <span className="truncate">
                        Total Volume: <strong className="text-text-base font-financial">{formatCents(grp.totalGroupVolumeCents)}</strong>
                      </span>
                      {grp.myPaidOutlayCents > 0 && (
                        <span className="bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-md font-medium text-[10px] font-financial shrink-0">
                          You paid {formatCents(grp.myPaidOutlayCents)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border-base rounded-2xl text-text-muted text-xs space-y-1">
                <Receipt className="w-6 h-6 mx-auto text-text-muted/60 mb-1" />
                <p className="font-semibold text-text-base mb-0">No shared group expenses</p>
                <p className="mb-0">No group bills were recorded for {periodLabel}.</p>
              </div>
            )}
          </div>
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
        <div
          ref={backdropRef}
          onClick={() => triggerDismiss()}
          className="fixed inset-0 bg-black/65 backdrop-blur-md animate-backdrop-fade-in will-change-[opacity]"
        />

        <div
          ref={sheetRef}
          className="relative z-10 w-full max-h-[85dvh] bg-bg-surface rounded-t-3xl border-t border-border-subtle shadow-2xl flex flex-col overflow-hidden will-change-transform animate-sheet-slide-up"
        >
          {/* Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="pt-2.5 pb-2 px-4 flex flex-col items-center border-b border-border-subtle shrink-0 cursor-grab active:cursor-grabbing select-none touch-none bg-bg-surface"
          >
            <div className="w-12 h-1.5 bg-border-base hover:bg-border-strong rounded-full shrink-0 transition-colors" />
            <div className="flex items-center justify-between w-full pt-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-bold text-text-base">Spending Breakdown</span>
              </div>
              <span className="text-xs text-text-muted font-medium truncate max-w-[120px]">{periodLabel}</span>
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
      width={560}
      centered
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-500" />
            <span className="text-base font-bold text-text-base">Spending Breakdown</span>
          </div>
          <span className="text-xs font-normal text-text-muted bg-bg-subtle border border-border-base px-2.5 py-1 rounded-lg">
            {periodLabel}
          </span>
        </div>
      }
    >
      <div className="pt-2 pb-1">{renderContent()}</div>
    </Modal>
  );
}
