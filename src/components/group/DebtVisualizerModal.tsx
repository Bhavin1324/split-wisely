import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Segmented, Button } from 'antd';
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  HelpCircle,
  Users,
  Play,
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
  const [viewMode, setViewMode] = useState<'SIMPLIFIED' | 'DIRECT'>('SIMPLIFIED');
  const [isReceivablesExpanded, setIsReceivablesExpanded] = useState(false);
  const [isPayablesExpanded, setIsPayablesExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedUserId(initialUserId || currentUserId);
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
            Inspect Member Story
          </span>
          <span className="text-[11px] text-text-muted">Tap to switch</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {visualizationData.members.map((m) => {
            const isSelected = m.id === selectedUserId;
            const isMe = m.id === currentUserId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedUserId(m.id)}
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

      {/* ── 2. The 3-Card Dynamic Balance Formula ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle border border-border-base space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>Balance Formula: {currentStory.userName}</span>
          </span>
          <span className="text-[11px] font-semibold text-text-muted hidden sm:inline">
            Direct Inflow − Direct Outflow = Net
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
          {/* Card 1: Money In */}
          <div className="p-3 rounded-xl bg-bg-surface border border-border-base flex flex-col justify-between gap-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-success-text flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-text" />
                  <span>Direct Inflow</span>
                </span>
                {currentStory.directReceivables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsReceivablesExpanded(!isReceivablesExpanded)}
                    className="text-[10px] text-text-muted hover:text-text-base flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{currentStory.directReceivables.length} {currentStory.directReceivables.length === 1 ? 'bill' : 'bills'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isReceivablesExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold font-financial text-success-text mt-1">
                +{formatCents(currentStory.totalDirectInflowCents)}
              </div>
            </div>
            <span className="text-[10px] text-text-muted">
              Owed to {selectedUserId === currentUserId ? 'you' : currentStory.userName}
            </span>

            {/* Expandable itemized receivables */}
            {isReceivablesExpanded && currentStory.directReceivables.length > 0 && (
              <div className="pt-2 mt-1 border-t border-border-subtle space-y-1">
                {currentStory.directReceivables.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-text-base truncate mr-1">{r.friendName}</span>
                    <span className="font-financial font-medium text-success-text shrink-0">+{formatCents(r.amountCents)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Money Out */}
          <div className="p-3 rounded-xl bg-bg-surface border border-border-base flex flex-col justify-between gap-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-error-text flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error-text" />
                  <span>Direct Outflow</span>
                </span>
                {currentStory.directPayables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPayablesExpanded(!isPayablesExpanded)}
                    className="text-[10px] text-text-muted hover:text-text-base flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{currentStory.directPayables.length} {currentStory.directPayables.length === 1 ? 'bill' : 'bills'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isPayablesExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold font-financial text-error-text mt-1">
                −{formatCents(currentStory.totalDirectOutflowCents)}
              </div>
            </div>
            <span className="text-[10px] text-text-muted">
              {selectedUserId === currentUserId ? 'You' : currentStory.userName} owe others
            </span>

            {/* Expandable itemized payables */}
            {isPayablesExpanded && currentStory.directPayables.length > 0 && (
              <div className="pt-2 mt-1 border-t border-border-subtle space-y-1">
                {currentStory.directPayables.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-text-base truncate mr-1">{p.friendName}</span>
                    <span className="font-financial font-medium text-error-text shrink-0">−{formatCents(p.amountCents)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Final Net Result */}
          <div
            className={`p-3 rounded-xl border flex flex-col justify-between gap-1 ${
              currentStory.simplifiedNetBalanceCents > 0
                ? 'bg-[var(--color-success-bg)] border-[var(--color-success-500)]/30'
                : currentStory.simplifiedNetBalanceCents < 0
                ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-500)]/30'
                : 'bg-bg-surface border-border-base'
            }`}
          >
            <div>
              <span className="text-[11px] font-medium text-text-muted">
                💰 Final Net Take-Home
              </span>
              <div
                className={`text-base sm:text-lg font-extrabold font-financial mt-1 ${
                  currentStory.simplifiedNetBalanceCents > 0
                    ? 'text-success-text'
                    : currentStory.simplifiedNetBalanceCents < 0
                    ? 'text-error-text'
                    : 'text-text-base'
                }`}
              >
                {currentStory.simplifiedNetBalanceCents > 0 ? '+' : ''}
                {formatCents(currentStory.simplifiedNetBalanceCents)}
              </div>
            </div>
            <span className="text-[10px] text-text-muted">
              {currentStory.status === 'RECEIVING'
                ? 'Will receive in bank'
                : currentStory.status === 'PAYING'
                ? 'Needs to pay out'
                : 'All square (Zero balance)'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. The Visual Route Flow (Simplified vs Direct) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-500" />
            <span>Transfer Routes</span>
          </span>

          <Segmented
            options={[
              { label: 'Smart Shortcuts', value: 'SIMPLIFIED' },
              { label: 'Original Bills', value: 'DIRECT' },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as 'SIMPLIFIED' | 'DIRECT')}
            size="medium"
            className="bg-bg-subtle p-0.5 rounded-lg border border-border-base self-start sm:self-auto"
          />
        </div>

        {/* View A: Simplified Shortcuts */}
        {viewMode === 'SIMPLIFIED' && (
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
                        <span className="text-[11px] text-text-muted block">Direct settlement transfer</span>
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
                        <span className="text-[11px] text-text-muted block">Direct settlement transfer</span>
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
            <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-text-base block">
                  Why this shortcut works:
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed mb-0">
                  {currentStory.shortcutExplanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View B: Original Direct Bills */}
        {viewMode === 'DIRECT' && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="p-3 rounded-xl bg-bg-surface border border-border-base text-xs text-text-muted space-y-1">
              <span className="font-bold text-text-base flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--color-warning-500)]" />
                <span>What is the difference?</span>
              </span>
              <p className="mb-0 text-[11px]">
                Without simplification, every single person who split a bill must exchange separate bank transfers with the person who paid for it.
              </p>
            </div>

            <div className="space-y-2">
              {visualizationData.allDirectDebts.length > 0 ? (
                visualizationData.allDirectDebts.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-bg-surface border border-border-base flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <span className="font-medium text-text-base truncate">{d.fromName}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="font-medium text-text-base truncate">{d.toName}</span>
                    </div>
                    <span className="font-bold font-financial text-text-base shrink-0">
                      {formatCents(d.amountCents)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-text-muted">No direct debts recorded.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Group Efficiency Metric Banner ── */}
      <div className="p-3 rounded-xl bg-bg-subtle border border-border-base flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-text-base">Group Efficiency</span>
        </div>
        <span className="text-[11px] font-medium text-success-text font-financial">
          ⚡ Settle in {visualizationData.totalSimplifiedTransfersCount} transfers instead of {visualizationData.totalDirectTransfersCount}
          {visualizationData.transfersSavedCount > 0 ? ` (Saved ${visualizationData.transfersSavedCount} transfers!)` : ''}
        </span>
      </div>
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
          className="relative z-10 w-full max-h-[88dvh] bg-bg-surface rounded-t-3xl border-t border-border-subtle shadow-2xl flex flex-col overflow-hidden will-change-transform animate-sheet-slide-up"
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
      width={640}
      centered
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-base font-bold text-text-base">Debt Simplification Visualizer</span>
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
      <div className="pt-2 pb-1">{renderContent()}</div>
    </Modal>
  );
}
