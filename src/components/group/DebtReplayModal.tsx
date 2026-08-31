import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, Switch } from 'antd';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { formatCents } from '../../utils/currency';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';
import {
  calculateGroupReplayData,
  type DebtReplayData,
} from '../../utils/debtReplayCalculations';
import { UserAvatar } from '../ui/UserAvatar';

interface DebtReplayModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupMembers: string[];
  expenses: any[];
  settlements: any[];
  profilesMap: Record<string, any>;
  userId: string;
}

export function DebtReplayModal({
  open,
  onClose,
  groupId,
  groupName,
  groupMembers,
  expenses,
  settlements,
  profilesMap,
  userId,
}: DebtReplayModalProps) {
  const isMobile = useIsMobile(640);
  const [phase, setPhase] = useState<'EXPENSES' | 'TALLIES' | 'SETTLEMENTS'>('EXPENSES');
  const [expenseIdx, setExpenseIdx] = useState(0);
  const [settlementIdx, setSettlementIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [onlyMyBills, setOnlyMyBills] = useState(false);

  const autoPlayRef = useRef<any>(null);

  const replayData: DebtReplayData = useMemo(() => {
    return calculateGroupReplayData({
      userId,
      groupId,
      groupName,
      groupMembers,
      expenses,
      settlements,
      profilesMap,
    });
  }, [userId, groupId, groupName, groupMembers, expenses, settlements, profilesMap]);

  // Filtered expenses if user toggled "Only My Bills"
  const activeExpenseSteps = useMemo(() => {
    if (onlyMyBills) {
      return replayData.expenseSteps.filter((s) => s.isUserInvolved);
    }
    return replayData.expenseSteps;
  }, [replayData.expenseSteps, onlyMyBills]);

  // Reset indices on modal open
  useEffect(() => {
    if (open) {
      setPhase('EXPENSES');
      setExpenseIdx(0);
      setSettlementIdx(0);
      setIsPlaying(false);
    }
  }, [open]);

  // Auto-play timer loop
  useEffect(() => {
    if (!isPlaying || !open) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      if (phase === 'EXPENSES') {
        setExpenseIdx((prev) => {
          if (prev < activeExpenseSteps.length - 1) {
            return prev + 1;
          } else {
            setPhase('TALLIES');
            return prev;
          }
        });
      } else if (phase === 'TALLIES') {
        setPhase('SETTLEMENTS');
        setSettlementIdx(0);
      } else if (phase === 'SETTLEMENTS') {
        setSettlementIdx((prev) => {
          if (prev < replayData.settlementSteps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }
    }, 2500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, open, phase, activeExpenseSteps.length, replayData.settlementSteps.length]);

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose });

  const handleNext = () => {
    if (phase === 'EXPENSES') {
      if (expenseIdx < activeExpenseSteps.length - 1) {
        setExpenseIdx(expenseIdx + 1);
      } else {
        setPhase('TALLIES');
      }
    } else if (phase === 'TALLIES') {
      setPhase('SETTLEMENTS');
      setSettlementIdx(0);
    } else if (phase === 'SETTLEMENTS') {
      if (settlementIdx < replayData.settlementSteps.length - 1) {
        setSettlementIdx(settlementIdx + 1);
      }
    }
  };

  const handlePrev = () => {
    if (phase === 'SETTLEMENTS') {
      if (settlementIdx > 0) {
        setSettlementIdx(settlementIdx - 1);
      } else {
        setPhase('TALLIES');
      }
    } else if (phase === 'TALLIES') {
      setPhase('EXPENSES');
      setExpenseIdx(Math.max(0, activeExpenseSteps.length - 1));
    } else if (phase === 'EXPENSES') {
      if (expenseIdx > 0) {
        setExpenseIdx(expenseIdx - 1);
      }
    }
  };

  const handleReset = () => {
    setPhase('EXPENSES');
    setExpenseIdx(0);
    setSettlementIdx(0);
    setIsPlaying(false);
  };

  const currentExpenseStep = activeExpenseSteps[expenseIdx];
  const currentSettlementStep = replayData.settlementSteps[settlementIdx];

  // ══════════════════════════════════════════════════════════════
  //  Modal Body Content
  // ══════════════════════════════════════════════════════════════
  const renderContent = () => (
    <div className="space-y-4">
      {/* ── Top Phase & Progress Bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 bg-primary-500/10 px-2 py-0.5 rounded-md">
              {phase === 'EXPENSES' && `Receipt ${expenseIdx + 1} of ${activeExpenseSteps.length}`}
              {phase === 'TALLIES' && 'Group Tallies Summary'}
              {phase === 'SETTLEMENTS' && `Resolution Step ${settlementIdx + 1} of ${replayData.settlementSteps.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'EXPENSES' && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <span>Only Mine</span>
                <Switch
                  size="default"
                  checked={onlyMyBills}
                  onChange={(v) => {
                    setOnlyMyBills(v);
                    setExpenseIdx(0);
                  }}
                />
              </div>
            )}
            <Button
              type="text"
              onClick={handleReset}
              icon={<RotateCcw className="w-3.5 h-3.5 text-text-muted" />}
              className="rounded-lg text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-1.5"
              title="Restart Replay"
            >
              <span className="text-[11px] hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>

        {/* Multi-Segment Story Progress Bar */}
        <div className="flex items-center gap-1 w-full overflow-hidden">
          {phase === 'EXPENSES' &&
            activeExpenseSteps.map((_, i) => (
              <div
                key={i}
                onClick={() => setExpenseIdx(i)}
                className={`h-1.5 flex-1 min-w-[6px] rounded-full cursor-pointer transition-all duration-300 ${
                  i === expenseIdx
                    ? 'bg-primary-500 scale-y-125'
                    : i < expenseIdx
                    ? 'bg-primary-500/60'
                    : 'bg-bg-subtle border border-border-subtle'
                }`}
              />
            ))}

          {phase === 'SETTLEMENTS' &&
            replayData.settlementSteps.map((_, i) => (
              <div
                key={i}
                onClick={() => setSettlementIdx(i)}
                className={`h-1.5 flex-1 min-w-[12px] rounded-full cursor-pointer transition-all duration-300 ${
                  i === settlementIdx
                    ? 'bg-primary-500 scale-y-125'
                    : i < settlementIdx
                    ? 'bg-primary-500/60'
                    : 'bg-bg-subtle border border-border-subtle'
                }`}
              />
            ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  PHASE 1: Chronological Expense Receipt Walkthrough       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === 'EXPENSES' && currentExpenseStep && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Receipt Info Card */}
          <div className="p-3 sm:p-4 rounded-2xl bg-bg-surface border border-border-base flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-bold text-text-base truncate block">
                  {currentExpenseStep.description}
                </span>
                <span className="text-[11px] text-text-muted truncate block">
                  Paid by <strong className="text-text-base">{currentExpenseStep.payerName}</strong>
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-bold font-financial text-text-base block">
                {formatCents(currentExpenseStep.totalAmountCents)}
              </span>
              <span className="text-[10px] text-text-muted font-medium">
                Total Receipt
              </span>
            </div>
          </div>

          {/* Hero Live Odometer / Running Balance Ticker */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle border border-border-base space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                <span>Your Running Balance</span>
              </span>
              <span className="text-[11px] font-semibold text-text-muted">
                After this receipt
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center p-3 rounded-xl bg-bg-surface border border-border-base text-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase font-medium">Previous</span>
                <span className="text-xs sm:text-sm font-bold font-financial text-text-base truncate">
                  {currentExpenseStep.previousBalanceCents > 0 ? '+' : ''}
                  {formatCents(currentExpenseStep.previousBalanceCents)}
                </span>
              </div>

              <div className="flex flex-col border-x border-border-subtle px-1">
                <span className="text-[10px] text-text-muted uppercase font-medium">Impact</span>
                <span
                  className={`text-xs sm:text-sm font-bold font-financial truncate ${
                    currentExpenseStep.deltaCents > 0
                      ? 'text-success-text'
                      : currentExpenseStep.deltaCents < 0
                      ? 'text-error-text'
                      : 'text-text-muted'
                  }`}
                >
                  {currentExpenseStep.deltaCents > 0 ? '+' : ''}
                  {formatCents(currentExpenseStep.deltaCents)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase font-medium">New Balance</span>
                <span
                  className={`text-xs sm:text-base font-extrabold font-financial truncate ${
                    currentExpenseStep.newBalanceCents > 0
                      ? 'text-success-text'
                      : currentExpenseStep.newBalanceCents < 0
                      ? 'text-error-text'
                      : 'text-text-base'
                  }`}
                >
                  {currentExpenseStep.newBalanceCents > 0 ? '+' : ''}
                  {formatCents(currentExpenseStep.newBalanceCents)}
                </span>
              </div>
            </div>

            {/* Plain-English Explanation */}
            <p className="text-xs text-text-muted mb-0 leading-relaxed pt-0.5">
              {currentExpenseStep.explanation}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  PHASE 2: Final Group Net Tallies Overview                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === 'TALLIES' && (
        <div className="space-y-3.5 animate-fade-in">
          <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-base text-center space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-text-base mb-0">
              All {replayData.totalExpensesCount} Group Receipts Tallied!
            </h3>
            <p className="text-xs text-text-muted mb-0">
              Here is the net balance of every member before settlement shortcuts are applied.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {replayData.finalTallies.map((m) => (
              <div
                key={m.userId}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  m.userId === userId
                    ? 'bg-primary-500/10 border-primary-500/40'
                    : 'bg-bg-surface border-border-base'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar user={{ id: m.userId, full_name: m.userName, avatar_url: m.avatarUrl }} size={32} />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-text-base truncate block">
                      {m.userName} {m.userId === userId ? '(You)' : ''}
                    </span>
                    <span className="text-[10px] text-text-muted block">
                      {m.status === 'OWED' ? 'Owed by group' : m.status === 'OWES' ? 'Owes the group' : 'Settled'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs sm:text-sm font-bold font-financial shrink-0 ${
                    m.netBalanceCents > 0
                      ? 'text-success-text'
                      : m.netBalanceCents < 0
                      ? 'text-error-text'
                      : 'text-text-base'
                  }`}
                >
                  {m.netBalanceCents > 0 ? '+' : ''}
                  {formatCents(m.netBalanceCents)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-bg-subtle border border-border-base flex items-center justify-between text-xs">
            <span className="text-text-muted">Without simplification:</span>
            <span className="font-semibold text-text-base font-financial">
              Requires {replayData.totalDirectTransfersCount} individual bank transfers
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  PHASE 3: Step-by-Step Settlement Resolution Sequence     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase === 'SETTLEMENTS' && currentSettlementStep && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Transfer Route Visual Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-bg-surface border border-primary-500/40 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-bold uppercase tracking-wider text-primary-600">
                Resolution Transfer {settlementIdx + 1} of {replayData.settlementSteps.length}
              </span>
              <span className="font-financial font-semibold">
                Amount: <strong className="text-text-base text-sm">{formatCents(currentSettlementStep.amountCents)}</strong>
              </span>
            </div>

            {/* Direct Payer to Payee Node Rail */}
            <div className="p-3 rounded-2xl bg-bg-subtle border border-border-base flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <UserAvatar
                  user={{
                    id: currentSettlementStep.fromId,
                    full_name: currentSettlementStep.fromName,
                    avatar_url: currentSettlementStep.fromAvatar,
                  }}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-text-base truncate block">
                    {currentSettlementStep.fromName}
                  </span>
                  <span className="text-[10px] text-error-text font-semibold">PAYS</span>
                </div>
              </div>

              <div className="flex flex-col items-center px-2 shrink-0">
                <span className="text-xs sm:text-sm font-extrabold font-financial text-primary-600">
                  {formatCents(currentSettlementStep.amountCents)}
                </span>
                <ArrowRight className="w-4 h-4 text-primary-500" />
              </div>

              <div className="flex items-center gap-2 min-w-0 flex-1 text-right justify-end">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-text-base truncate block">
                    {currentSettlementStep.toName}
                  </span>
                  <span className="text-[10px] text-success-text font-semibold">RECEIVES</span>
                </div>
                <UserAvatar
                  user={{
                    id: currentSettlementStep.toId,
                    full_name: currentSettlementStep.toName,
                    avatar_url: currentSettlementStep.toAvatar,
                  }}
                  size={36}
                />
              </div>
            </div>

            {/* Plain-English Explanation */}
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs text-text-base leading-relaxed">
              <p className="mb-0">{currentSettlementStep.explanation}</p>
            </div>

            {/* If Final Step */}
            {settlementIdx === replayData.settlementSteps.length - 1 && (
              <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-500)]/30 flex items-center gap-2.5 text-xs text-success-text font-semibold">
                <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
                <span>
                  🎉 All members in this group are now 100% settled up with 0 remaining debt!
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Tactile Bottom Player Dock (Balanced 3-Button Grid) ── */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-bg-surface border border-border-base grid grid-cols-3 gap-2 shadow-xs items-center">
        <Button
          type="default"
          onClick={handlePrev}
          disabled={phase === 'EXPENSES' && expenseIdx === 0}
          icon={<ChevronLeft className="w-4 h-4" />}
          className="h-10 sm:h-9 w-full rounded-xl font-semibold text-xs border-border-base hover:border-primary-500 flex items-center justify-center gap-1"
        >
          <span>Prev</span>
        </Button>

        <Button
          type="primary"
          onClick={() => setIsPlaying(!isPlaying)}
          icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          className="h-10 sm:h-9 w-full rounded-xl font-semibold text-xs bg-primary-500 hover:bg-primary-600 border-none shadow-xs text-white flex items-center justify-center gap-1"
        >
          <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
        </Button>

        <Button
          type="default"
          onClick={handleNext}
          disabled={phase === 'SETTLEMENTS' && settlementIdx === replayData.settlementSteps.length - 1}
          className="h-10 sm:h-9 w-full rounded-xl font-semibold text-xs border-border-base hover:border-primary-500 flex items-center justify-center gap-1"
        >
          <span className="truncate">
            {phase === 'EXPENSES' && expenseIdx === activeExpenseSteps.length - 1
              ? 'Summary'
              : phase === 'TALLIES'
              ? 'Settle'
              : 'Next'}
          </span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Button>
      </div>

      {/* Efficiency Footer */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
        <span className="flex items-center gap-1 truncate max-w-[180px]">
          <Users className="w-3.5 h-3.5 text-primary-500 shrink-0" />
          <span className="truncate">{replayData.groupName}</span>
        </span>
        <span className="font-financial font-medium text-success-text shrink-0">
          ⚡ Settle in {replayData.totalSettlementsCount} transfers instead of {replayData.totalDirectTransfersCount}
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
                <span className="text-sm font-bold text-text-base">Step-by-Step Debt Replay</span>
              </div>
              <span className="text-xs text-text-muted font-medium truncate max-w-[120px]">{groupName}</span>
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
      width={620}
      centered
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-base font-bold text-text-base">Step-by-Step Debt Replay</span>
          </div>
          <span className="text-xs font-normal text-text-muted bg-bg-subtle border border-border-base px-2.5 py-1 rounded-lg truncate max-w-[180px]">
            {groupName}
          </span>
        </div>
      }
    >
      <div className="pt-2 pb-1">{renderContent()}</div>
    </Modal>
  );
}
