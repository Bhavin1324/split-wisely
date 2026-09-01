import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Segmented, Button } from 'antd';
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Scale,
  Receipt,
  Play,
  Calculator,
} from 'lucide-react';
import { formatCents } from '../../utils/currency';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';
import {
  calculateGroupDebtVisualization,
  type GroupDebtVisualizationData,
  type UserDebtStory,
} from '../../utils/debtVisualizerCalculations';
import { UserAvatar } from '../ui/UserAvatar';

interface DebtVisualizerModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupMembers: string[];
  expenses: any[];
  settlements: any[];
  profilesMap: Record<string, any>;
  initialUserId?: string;
  currentUserId: string;
  onOpenReplay?: () => void;
}

export function DebtVisualizerModal({
  open,
  onClose,
  groupId,
  groupName,
  groupMembers,
  expenses,
  settlements,
  profilesMap,
  initialUserId,
  currentUserId,
  onOpenReplay,
}: DebtVisualizerModalProps) {
  const isMobile = useIsMobile(640);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || currentUserId);
  const [activeTab, setActiveTab] = useState<'MATH' | 'ROUTES' | 'ZEROSUM'>('MATH');
  const [expandedOffsetFriendId, setExpandedOffsetFriendId] = useState<string | null>(null);
  const [isPaidReceiptsExpanded, setIsPaidReceiptsExpanded] = useState(false);
  const [isConsumedReceiptsExpanded, setIsConsumedReceiptsExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedUserId(initialUserId || currentUserId);
      setExpandedOffsetFriendId(null);
    }
  }, [open, initialUserId, currentUserId]);

  const visualizationData: GroupDebtVisualizationData = useMemo(() => {
    return calculateGroupDebtVisualization({
      groupId,
      groupMembers,
      expenses,
      settlements,
      profilesMap,
    });
  }, [groupId, groupMembers, expenses, settlements, profilesMap]);

  const currentStory: UserDebtStory = useMemo(() => {
    return (
      visualizationData.userStories[selectedUserId] || {
        userId: selectedUserId,
        userName: profilesMap[selectedUserId]?.full_name || 'Member',
        userAvatar: profilesMap[selectedUserId]?.avatar_url || null,
        receiptAccumulation: {
          totalPaidCents: 0,
          totalConsumedCents: 0,
          netTakeHomeCents: 0,
          paidBillsCount: 0,
          consumedBillsCount: 0,
          paidReceipts: [],
          consumedReceipts: [],
        },
        pairwiseOffsets: [],
        directReceivables: [],
        directPayables: [],
        totalDirectInflowCents: 0,
        totalDirectOutflowCents: 0,
        directNetBalanceCents: 0,
        simplifiedReceivables: [],
        simplifiedPayables: [],
        totalSimplifiedInflowCents: 0,
        totalSimplifiedOutflowCents: 0,
        simplifiedNetBalanceCents: 0,
        status: 'SETTLED',
        shortcutExplanation: 'No balances in this group.',
        transitiveClearingDetails: [],
      }
    );
  }, [visualizationData, selectedUserId, profilesMap]);

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
      {/* ── 1. Interactive Member Selector Pill Bar ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Inspect Perspective
          </span>
          <span className="text-[11px] text-text-muted">Tap to switch member</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {visualizationData.members.map((m) => {
            const isSelected = m.id === selectedUserId;
            const isMe = m.id === currentUserId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(m.id);
                  setExpandedOffsetFriendId(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer text-xs font-semibold ${
                  isSelected
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                    : 'bg-bg-surface text-text-base border-border-base hover:border-primary-500/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-primary-500/10 text-primary-600'
                  }`}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate max-w-[110px]">{m.name}</span>
                {isMe && <span className="text-[10px] opacity-80">(You)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Top View Switcher Segmented Control ── */}
      <div className="border-b border-border-base pb-3">
        <Segmented
          options={[
            {
              label: '1. Receipt & Pairwise Math',
              value: 'MATH',
              icon: <Calculator className="w-3.5 h-3.5 inline mr-1" />,
            },
            {
              label: '2. Simplified Routes',
              value: 'ROUTES',
              icon: <Layers className="w-3.5 h-3.5 inline mr-1" />,
            },
            {
              label: '3. Zero-Sum Proof',
              value: 'ZEROSUM',
              icon: <Scale className="w-3.5 h-3.5 inline mr-1" />,
            },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'MATH' | 'ROUTES' | 'ZEROSUM')}
          block
          className="bg-bg-subtle p-0.5 rounded-xl border border-border-base text-xs font-semibold"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: RECEIPT ACCUMULATION & PAIRWISE MUTUAL OFFSETTING
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'MATH' && (
        <div className="space-y-4 animate-fade-in">
          {/* Stage 1: Receipt Accumulation Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle border border-border-base space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-primary-500" />
                <span>Stage 1: Receipt Accumulation ({currentStory.userName})</span>
              </span>
              <span className="text-[11px] text-text-muted font-medium">
                Paid − Consumed = Net Take-Home
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
              {/* Card 1: Total Paid */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base flex flex-col justify-between gap-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-success-text flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-text" />
                      <span>Total Paid Out-of-Pocket</span>
                    </span>
                    {currentStory.receiptAccumulation.paidBillsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsPaidReceiptsExpanded(!isPaidReceiptsExpanded)}
                        className="text-[10px] text-text-muted hover:text-text-base flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{currentStory.receiptAccumulation.paidBillsCount} bills</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isPaidReceiptsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-financial text-success-text mt-1">
                    +{formatCents(currentStory.receiptAccumulation.totalPaidCents)}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted">
                  Money {selectedUserId === currentUserId ? 'you' : currentStory.userName} personally funded
                </span>

                {isPaidReceiptsExpanded && currentStory.receiptAccumulation.paidReceipts.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border-subtle space-y-1 max-h-36 overflow-y-auto">
                    {currentStory.receiptAccumulation.paidReceipts.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-text-base truncate mr-1">{r.description}</span>
                        <span className="font-financial font-medium text-success-text shrink-0">+{formatCents(r.totalAmountCents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Total Consumed */}
              <div className="p-3 rounded-xl bg-bg-surface border border-border-base flex flex-col justify-between gap-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-error-text flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error-text" />
                      <span>Personal Consumption</span>
                    </span>
                    {currentStory.receiptAccumulation.consumedBillsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsConsumedReceiptsExpanded(!isConsumedReceiptsExpanded)}
                        className="text-[10px] text-text-muted hover:text-text-base flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{currentStory.receiptAccumulation.consumedBillsCount} bills</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isConsumedReceiptsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-financial text-error-text mt-1">
                    −{formatCents(currentStory.receiptAccumulation.totalConsumedCents)}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted">
                  {selectedUserId === currentUserId ? 'Your' : `${currentStory.userName}'s`} share of all split bills
                </span>

                {isConsumedReceiptsExpanded && currentStory.receiptAccumulation.consumedReceipts.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-border-subtle space-y-1 max-h-36 overflow-y-auto">
                    {currentStory.receiptAccumulation.consumedReceipts.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-text-base truncate mr-1">{r.description}</span>
                        <span className="font-financial font-medium text-error-text shrink-0">−{formatCents(r.yourShareCents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: Direct Net Balance */}
              <div
                className={`p-3 rounded-xl border flex flex-col justify-between gap-1 ${
                  currentStory.directNetBalanceCents > 0
                    ? 'bg-[var(--color-success-bg)] border-[var(--color-success-500)]/30'
                    : currentStory.directNetBalanceCents < 0
                    ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-500)]/30'
                    : 'bg-bg-surface border-border-base'
                }`}
              >
                <div>
                  <span className="text-[11px] font-medium text-text-muted">
                    💰 Direct Net Balance
                  </span>
                  <div
                    className={`text-base sm:text-lg font-extrabold font-financial mt-1 ${
                      currentStory.directNetBalanceCents > 0
                        ? 'text-success-text'
                        : currentStory.directNetBalanceCents < 0
                        ? 'text-error-text'
                        : 'text-text-base'
                    }`}
                  >
                    {currentStory.directNetBalanceCents > 0 ? '+' : ''}
                    {formatCents(currentStory.directNetBalanceCents)}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted">
                  {currentStory.status === 'RECEIVING'
                    ? 'Group owes this member'
                    : currentStory.status === 'PAYING'
                    ? 'Owes the group overall'
                    : 'All square (₹0.00)'}
                </span>
              </div>
            </div>
          </div>

          {/* Stage 2: 1-on-1 Pairwise Mutual Offsetting Accordion */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-primary-500" />
                <span>Stage 2: 1-on-1 Pairwise Offsetting ({currentStory.userName})</span>
              </span>
              <span className="text-[11px] text-text-muted">Mutual bills subtraction</span>
            </div>

            {currentStory.pairwiseOffsets.length === 0 ? (
              <div className="p-4 rounded-xl bg-bg-surface border border-border-base text-center text-xs text-text-muted">
                No overlapping transactions with other members.
              </div>
            ) : (
              currentStory.pairwiseOffsets.map((offset) => {
                const isExpanded = expandedOffsetFriendId === offset.friendId;
                return (
                  <div
                    key={offset.friendId}
                    className="p-3 rounded-2xl bg-bg-surface border border-border-base space-y-2.5 shadow-xs transition-all"
                  >
                    <div
                      onClick={() => setExpandedOffsetFriendId(isExpanded ? null : offset.friendId)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          user={{ id: offset.friendId, full_name: offset.friendName, avatar_url: offset.avatarUrl }}
                          size={32}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-text-base block truncate">
                            {currentStory.userName} ⟷ {offset.friendName}
                          </span>
                          <span className="text-[10px] text-text-muted block">
                            {offset.theyOweYouBills.length + offset.youOweThemBills.length} shared receipts
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-xs sm:text-sm font-bold font-financial block ${
                              offset.direction === 'THEY_OWE_YOU'
                                ? 'text-success-text'
                                : offset.direction === 'YOU_OWE_THEM'
                                ? 'text-error-text'
                                : 'text-text-muted'
                            }`}
                          >
                            {offset.direction === 'THEY_OWE_YOU' ? '+' : offset.direction === 'YOU_OWE_THEM' ? '−' : ''}
                            {formatCents(offset.netDirectDebtCents)}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {offset.direction === 'THEY_OWE_YOU'
                              ? `${offset.friendName} owes you`
                              : offset.direction === 'YOU_OWE_THEM'
                              ? `You owe ${offset.friendName}`
                              : 'Even'}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Subtraction Formula Banner */}
                    <div className="p-2 rounded-xl bg-bg-subtle border border-border-subtle text-[11px] text-text-muted font-medium leading-relaxed">
                      💡 <strong>Offset Math:</strong> {offset.subtractionEquation}
                    </div>

                    {/* Expanded Drilldown of All Shared Bills */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {/* What they owe you bills */}
                        <div className="p-2.5 rounded-xl bg-[var(--color-success-bg)]/40 border border-[var(--color-success-500)]/20 space-y-1">
                          <span className="font-bold text-success-text block">
                            {offset.friendName} owes you ({formatCents(offset.theyOweYouTotalCents)})
                          </span>
                          {offset.theyOweYouBills.length === 0 ? (
                            <span className="text-[10px] text-text-muted italic">No bills paid by you for them</span>
                          ) : (
                            offset.theyOweYouBills.map((b, i) => (
                              <div key={i} className="flex justify-between text-text-base">
                                <span className="truncate mr-1">{b.description}</span>
                                <span className="font-financial font-medium text-success-text shrink-0">+{formatCents(b.amountCents)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* What you owe them bills */}
                        <div className="p-2.5 rounded-xl bg-[var(--color-danger-bg)]/40 border border-[var(--color-danger-500)]/20 space-y-1">
                          <span className="font-bold text-error-text block">
                            You owe {offset.friendName} ({formatCents(offset.youOweThemTotalCents)})
                          </span>
                          {offset.youOweThemBills.length === 0 ? (
                            <span className="text-[10px] text-text-muted italic">No bills paid by them for you</span>
                          ) : (
                            offset.youOweThemBills.map((b, i) => (
                              <div key={i} className="flex justify-between text-text-base">
                                <span className="truncate mr-1">{b.description}</span>
                                <span className="font-financial font-medium text-error-text shrink-0">−{formatCents(b.amountCents)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: MULTI-PARTY SIMPLIFIED ROUTING & SHORTCUTS
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ROUTES' && (
        <div className="space-y-3 animate-fade-in">
          {/* Dynamic Transfer Cards for Selected User */}
          {currentStory.status === 'SETTLED' ? (
            <div className="p-6 rounded-2xl bg-bg-surface border border-dashed border-border-base text-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-success-text mx-auto" />
              <p className="font-bold text-xs sm:text-sm text-text-base">{currentStory.userName} is completely settled up!</p>
              <p className="text-[11px] text-text-muted">No money needs to be transferred.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Incoming Simplified Transfers */}
              {currentStory.simplifiedReceivables.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-bg-surface border border-[var(--color-success-500)]/30 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      user={{ id: t.fromId, full_name: t.fromName, avatar_url: t.fromAvatar }}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-xs font-semibold text-text-base">
                        <span className="truncate">{t.fromName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-success-text shrink-0" />
                        <span className="text-success-text font-bold truncate">
                          {selectedUserId === currentUserId ? 'You' : currentStory.userName}
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted block">Direct simplified settlement</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-extrabold font-financial text-success-text block">
                      +{formatCents(t.amountCents)}
                    </span>
                    <span className="text-[10px] text-success-text font-semibold uppercase tracking-wider">
                      Receives
                    </span>
                  </div>
                </div>
              ))}

              {/* Outgoing Simplified Transfers */}
              {currentStory.simplifiedPayables.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-bg-surface border border-[var(--color-danger-500)]/30 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      user={{ id: t.fromId, full_name: t.fromName, avatar_url: t.fromAvatar }}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-xs font-semibold text-text-base">
                        <span className="text-error-text font-bold truncate">
                          {selectedUserId === currentUserId ? 'You' : currentStory.userName}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-error-text shrink-0" />
                        <span className="truncate">{t.toName}</span>
                      </div>
                      <span className="text-[11px] text-text-muted block">Direct simplified settlement</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-extrabold font-financial text-error-text block">
                      −{formatCents(t.amountCents)}
                    </span>
                    <span className="text-[10px] text-error-text font-semibold uppercase tracking-wider">
                      Pays
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Plain-English Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-text-base block">
                  Why this shortcut route works:
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed mb-0">
                  {currentStory.shortcutExplanation}
                </p>
              </div>
            </div>

            {currentStory.transitiveClearingDetails.length > 0 && (
              <div className="pt-2 border-t border-primary-500/20 space-y-1">
                {currentStory.transitiveClearingDetails.map((detail, idx) => (
                  <div key={idx} className="text-[11px] text-text-base flex items-start gap-1.5">
                    <span className="text-primary-600 font-bold">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group Efficiency Metric Banner */}
          <div className="p-3 rounded-xl bg-bg-subtle border border-border-base flex items-center justify-between text-xs">
            <span className="font-semibold text-text-base">Group Efficiency</span>
            <span className="text-[11px] font-medium text-success-text font-financial">
              ⚡ Settle in {visualizationData.totalSimplifiedTransfersCount} transfers instead of {visualizationData.totalDirectTransfersCount}
              {visualizationData.transfersSavedCount > 0 ? ` (Saved ${visualizationData.transfersSavedCount} transfers!)` : ''}
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: ZERO-SUM RECONCILIATION BOARD
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ZEROSUM' && (
        <div className="space-y-3 animate-fade-in">
          {/* Zero-Sum Balance Proof Card */}
          <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-primary-500" />
                <span>Zero-Sum Conservation of Money</span>
              </span>
              <span className="text-[11px] font-semibold text-success-text font-financial">
                Sum: ₹0.00 Verified ✅
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-500)]/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-success-text block">
                  Total Incoming (Creditors)
                </span>
                <span className="text-base sm:text-lg font-extrabold font-financial text-success-text mt-0.5 block">
                  +{formatCents(visualizationData.zeroSumBoard.totalCreditorsCents)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger-500)]/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-error-text block">
                  Total Outgoing (Debtors)
                </span>
                <span className="text-base sm:text-lg font-extrabold font-financial text-error-text mt-0.5 block">
                  −{formatCents(visualizationData.zeroSumBoard.totalDebtorsCents)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed mb-0">
              The total money owed to net creditors strictly equals the total money owed by net debtors ({formatCents(visualizationData.zeroSumBoard.totalCreditorsCents)}). No money is created, lost, or inflated during simplification.
            </p>
          </div>

          {/* Member Zeroing Out Resolution Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 block">
              Individual Settlement Zeroing-Out
            </span>

            <div className="space-y-1.5">
              {visualizationData.zeroSumBoard.tallies.map((tally) => (
                <div
                  key={tally.userId}
                  className="p-3 rounded-2xl bg-bg-surface border border-border-base flex items-center justify-between gap-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      user={{ id: tally.userId, full_name: tally.userName, avatar_url: tally.avatarUrl }}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text-base truncate">{tally.userName}</div>
                      <div className="text-[10px] text-text-muted truncate">
                        {tally.actions.join(' • ')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className={`font-financial font-bold ${
                          tally.startingNetBalanceCents > 0
                            ? 'text-success-text'
                            : tally.startingNetBalanceCents < 0
                            ? 'text-error-text'
                            : 'text-text-muted'
                        }`}
                      >
                        {tally.startingNetBalanceCents > 0 ? '+' : ''}
                        {formatCents(tally.startingNetBalanceCents)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-text-muted" />
                      <span className="font-financial font-bold text-success-text">₹0.00</span>
                    </div>
                    <span className="text-[10px] text-success-text font-medium">Zeroed Out</span>
                  </div>
                </div>
              ))}
            </div>
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
            className="pt-3 pb-2 px-4 flex flex-col items-center border-b border-border-base shrink-0 cursor-grab active:cursor-grabbing select-none touch-none bg-bg-surface"
          >
            <div className="w-12 h-1.5 bg-border-base hover:bg-border-strong rounded-full shrink-0 transition-colors" />
            <div className="flex items-center justify-between w-full pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-bold text-text-base">Debt Visualizer</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenReplay && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<Play className="w-3 h-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDismiss();
                      setTimeout(() => {
                        onOpenReplay();
                      }, 150);
                    }}
                    className="bg-primary-500 hover:bg-primary-600 rounded-lg text-xs font-semibold border-none text-white shadow-xs"
                  >
                    Replay
                  </Button>
                )}
                <span className="text-xs text-text-muted font-medium truncate max-w-[100px]">{groupName}</span>
              </div>
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
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-base font-bold text-text-base">Debt Simplification & Zero-Sum Visualizer</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenReplay && (
              <Button
                type="primary"
                size="small"
                icon={<Play className="w-3.5 h-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  setTimeout(() => {
                    onOpenReplay();
                  }, 150);
                }}
                className="bg-primary-500 hover:bg-primary-600 rounded-lg text-xs font-semibold border-none text-white shadow-xs"
              >
                Replay Story
              </Button>
            )}
            <span className="text-xs font-normal text-text-muted bg-bg-subtle border border-border-base px-2.5 py-1 rounded-lg truncate max-w-[180px]">
              {groupName}
            </span>
          </div>
        </div>
      }
    >
      <div className="pt-2 pb-1 max-h-[75vh] overflow-y-auto pr-1">{renderContent()}</div>
    </Modal>
  );
}
