import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Segmented } from 'antd';
import { Users, Receipt } from 'lucide-react';
import type { FriendInteraction } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';
import { UserAvatar } from '../ui/UserAvatar';
import { FriendCoverageItemRow, type CoverageItemData } from './FriendCoverageItemRow';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onClose: () => void;
  interactions: FriendInteraction[];
  initialFriendId?: string | null;
  periodLabel: string;
}

export function FriendCoverageDetailModal({
  open,
  onClose,
  interactions,
  initialFriendId,
  periodLabel,
}: Props) {
  const isMobile = useIsMobile(640);
  const [selectedFriendId, setSelectedFriendId] = useState<string | 'ALL'>(
    initialFriendId || 'ALL'
  );
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'YOU_COVERED' | 'FRIEND_COVERED'>('ALL');

  // Keep selectedFriendId in sync when initialFriendId changes upon modal open
  useMemo(() => {
    if (open) {
      setSelectedFriendId(initialFriendId || 'ALL');
      setDirectionFilter('ALL');
    }
  }, [open, initialFriendId]);

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose });

  const activeFriend = useMemo(() => {
    if (selectedFriendId === 'ALL') return null;
    return interactions.find((f) => f.friendId === selectedFriendId) || null;
  }, [selectedFriendId, interactions]);

  // Aggregate items and KPIs based on friend selection
  const { filteredItems, totalYouCovered, totalFriendCovered } = useMemo(() => {
    const targetInteractions = activeFriend ? [activeFriend] : interactions;

    let youCoveredSum = 0;
    let friendCoveredSum = 0;
    const allItems: CoverageItemData[] = [];

    targetInteractions.forEach((friend) => {
      youCoveredSum += friend.totalPaidForFriend;
      friendCoveredSum += friend.totalPaidByFriend;

      (friend.items || []).forEach((item) => {
        allItems.push({
          friendId: friend.friendId,
          friendName: friend.friendName,
          friendAvatar: friend.friendAvatar,
          ...item,
        });
      });
    });

    allItems.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

    const result = allItems.filter((item) => {
      if (directionFilter === 'YOU_COVERED') return item.direction === 'YOU_COVERED';
      if (directionFilter === 'FRIEND_COVERED') return item.direction === 'FRIEND_COVERED';
      return true;
    });

    return {
      filteredItems: result,
      totalYouCovered: youCoveredSum,
      totalFriendCovered: friendCoveredSum,
    };
  }, [activeFriend, interactions, directionFilter]);

  const netDelta = totalYouCovered - totalFriendCovered;

  const renderContent = () => (
    <div className="space-y-4">
      {/* ── Friend Selector Pills ── */}
      {interactions.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedFriendId('ALL')}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors ${
              selectedFriendId === 'ALL'
                ? 'bg-primary-600 text-text-inverse shadow-xs'
                : 'bg-bg-subtle text-text-muted hover:text-text-base border border-border-base'
            }`}
          >
            All Friends ({interactions.length})
          </button>
          {interactions.map((friend) => {
            const isSelected = selectedFriendId === friend.friendId;
            return (
              <button
                key={friend.friendId}
                type="button"
                onClick={() => setSelectedFriendId(friend.friendId)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-semibold shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-primary-600 text-text-inverse shadow-xs'
                    : 'bg-bg-subtle text-text-muted hover:text-text-base border border-border-base'
                }`}
              >
                <UserAvatar
                  user={{
                    id: friend.friendId,
                    full_name: friend.friendName,
                    avatar_url: friend.friendAvatar,
                  }}
                  size={18}
                />
                <span className="truncate max-w-[120px]">{friend.friendName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-bg-subtle border border-border-base text-center">
        <div>
          <span className="text-[10px] font-semibold text-text-muted block uppercase tracking-wider">
            You Covered
          </span>
          <span className="text-sm sm:text-base font-extrabold font-financial text-success-text block mt-0.5">
            +{formatCents(totalYouCovered)}
          </span>
          <span className="text-[9px] text-text-muted">Friends owe share</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-text-muted block uppercase tracking-wider">
            Covered You
          </span>
          <span className="text-sm sm:text-base font-extrabold font-financial text-warning-500 block mt-0.5">
            -{formatCents(totalFriendCovered)}
          </span>
          <span className="text-[9px] text-text-muted">You owe share</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-text-muted block uppercase tracking-wider">
            Net Flow
          </span>
          <span
            className={`text-sm sm:text-base font-extrabold font-financial block mt-0.5 ${
              netDelta > 0
                ? 'text-success-text'
                : netDelta < 0
                  ? 'text-warning-500'
                  : 'text-text-muted'
            }`}
          >
            {netDelta > 0 ? `+${formatCents(netDelta)}` : netDelta < 0 ? `-${formatCents(Math.abs(netDelta))}` : formatCents(0)}
          </span>
          <span className="text-[9px] text-text-muted">
            {netDelta > 0 ? 'Net Expecting' : netDelta < 0 ? 'Net Covered' : 'Even'}
          </span>
        </div>
      </div>

      {/* ── Direction Filter ── */}
      <Segmented
        value={directionFilter}
        onChange={(v) => setDirectionFilter(v as typeof directionFilter)}
        options={[
          { label: 'All Items', value: 'ALL' },
          { label: 'You Covered', value: 'YOU_COVERED' },
          { label: 'Covered You', value: 'FRIEND_COVERED' },
        ]}
        size="small"
        className="w-full bg-bg-subtle border border-border-base p-1 rounded-xl"
        block
      />

      {/* ── Itemized Transactions List ── */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">
            <Receipt className="w-8 h-8 mx-auto text-border-base mb-2" />
            No expenses found for this selection.
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <FriendCoverageItemRow
              key={`${item.expenseId}-${item.friendId}-${idx}`}
              item={item}
              showFriendName={selectedFriendId === 'ALL'}
            />
          ))
        )}
      </div>
    </div>
  );

  const headerTitle = (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600">
        <Users className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-bold text-base text-text-base m-0 leading-tight">
          Friend Coverage Breakdown
        </h3>
        <span className="text-xs text-text-muted font-normal block">
          Period: {periodLabel}
        </span>
      </div>
    </div>
  );

  // Mobile Bottom Sheet
  if (isMobile) {
    if (!isRendered) return null;
    return createPortal(
      <div
        ref={backdropRef}
        onClick={() => triggerDismiss()}
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          ref={sheetRef}
          onClick={(e) => e.stopPropagation()}
          className={`bg-bg-surface w-full max-h-[85vh] rounded-t-3xl border-t border-border-base shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
          >
            <div className="w-12 h-1.5 bg-border-base rounded-full" />
          </div>
          <div className="px-5 pb-3 border-b border-border-base shrink-0 flex items-center justify-between">
            {headerTitle}
          </div>
          <div className="p-5 overflow-y-auto flex-1">{renderContent()}</div>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop Centered Modal
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={headerTitle}
      centered
      width={560}
      className="rounded-3xl overflow-hidden"
    >
      <div className="pt-2">{renderContent()}</div>
    </Modal>
  );
}
