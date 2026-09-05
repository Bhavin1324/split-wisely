import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, Tag, App } from 'antd';
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Calendar,
  Lock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { formatCents } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';
import { UserAvatar } from '../ui/UserAvatar';
import { deleteSettlement } from '../../hooks/supabase/useMutations';
import { useAppData } from '../../context/AppDataContext';

interface PaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  settlement: {
    id: string;
    group_id?: string | null;
    payer_id: string;
    payee_id: string;
    amount: number;
    currency_code?: string;
    created_at: string;
  } | null;
  currentUserId: string;
  getProfile?: (id: string) => any;
  profilesMap?: Record<string, any>;
  groupName?: string;
  onRefresh?: () => Promise<void> | void;
}

export function PaymentDetailsModal({
  open,
  onClose,
  settlement,
  currentUserId,
  getProfile,
  profilesMap,
  groupName,
  onRefresh,
}: PaymentDetailsModalProps) {
  const isMobile = useIsMobile(640);
  const { modal, message } = App.useApp();
  const { refetchData } = useAppData();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose });

  if (!settlement) return null;

  const payer = (getProfile ? getProfile(settlement.payer_id) : undefined) || profilesMap?.[settlement.payer_id];
  const payee = (getProfile ? getProfile(settlement.payee_id) : undefined) || profilesMap?.[settlement.payee_id];
  const isPayer = settlement.payer_id === currentUserId;
  const isPayee = settlement.payee_id === currentUserId;
  const canManage = isPayer || isPayee;

  const payerName = isPayer ? 'You' : payer?.full_name || 'Group Member';
  const payeeName = isPayee ? 'You' : payee?.full_name || 'Group Member';

  const handleDelete = (isDispute: boolean) => {
    modal.confirm({
      title: isDispute ? 'Dispute Payment' : 'Delete Payment Record',
      icon: isDispute ? (
        <ShieldAlert className="w-5 h-5 text-error-text" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-warning-500" />
      ),
      content: isDispute
        ? `Are you sure you want to dispute this payment of ${formatCents(settlement.amount)} from ${payerName}? This will void the payment record and notify the group that you did not receive the money.`
        : `Are you sure you want to delete this payment record? This will adjust group balances for everyone.`,
      okText: isDispute ? 'Confirm Dispute' : 'Delete Record',
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsDeleting(true);
        try {
          await deleteSettlement(settlement.id, {
            group_id: settlement.group_id,
            actor_id: currentUserId,
            payer_id: settlement.payer_id,
            payee_id: settlement.payee_id,
            amount: settlement.amount,
            payer_name: payer?.full_name || payerName,
            payee_name: payee?.full_name || payeeName,
            is_dispute: isDispute,
          });

          message.success(isDispute ? 'Payment disputed and voided' : 'Payment record deleted');
          if (isMobile) {
            triggerDismiss();
          } else {
            onClose();
          }
          await refetchData();
          if (onRefresh) {
            await onRefresh();
          }
        } catch (err: any) {
          message.error(err.message || 'Failed to update payment');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const renderModalContent = () => (
    <div className="space-y-4">
      {/* Top Banner: Amount & Status Badge */}
      <div className="p-4 rounded-2xl bg-bg-subtle border border-border-base text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <Tag color="success" className="m-0 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 inline" />
            <span>Recorded Settlement</span>
          </Tag>
          {groupName && (
            <Tag color="default" className="m-0 text-xs font-medium px-2 py-0.5 rounded-full">
              {groupName}
            </Tag>
          )}
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold font-financial text-success-text">
          {formatCents(settlement.amount)}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <Calendar className="w-3.5 h-3.5 text-text-muted" />
          <span>{formatDate(settlement.created_at)}</span>
        </div>
      </div>

      {/* Transfer Flow Card: Payer -> Payee */}
      <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-base space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
          Transfer Flow
        </span>

        <div className="flex items-center justify-between gap-2">
          {/* Payer */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <UserAvatar
              user={{
                id: settlement.payer_id,
                full_name: payer?.full_name || 'Member',
                avatar_url: payer?.avatar_url,
              }}
              size={36}
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-text-base block truncate">{payerName}</span>
              <span className="text-[10px] text-text-muted block font-medium">Sender (Paid)</span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-text-muted shrink-0" />

          {/* Payee */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end text-right">
            <div className="min-w-0">
              <span className="text-xs font-bold text-text-base block truncate">{payeeName}</span>
              <span className="text-[10px] text-success-text block font-medium">Recipient</span>
            </div>
            <UserAvatar
              user={{
                id: settlement.payee_id,
                full_name: payee?.full_name || 'Member',
                avatar_url: payee?.avatar_url,
              }}
              size={36}
            />
          </div>
        </div>
      </div>

      {/* Security & Action Section */}
      <div className="space-y-2 pt-1">
        {isPayee && (
          <div className="space-y-1.5">
            <Button
              danger
              type="primary"
              block
              icon={<ShieldAlert className="w-4 h-4" />}
              loading={isDeleting}
              onClick={() => handleDelete(true)}
              className="rounded-xl font-semibold h-10 shadow-xs"
            >
              Dispute / Money Not Received
            </Button>
            <p className="text-[11px] text-text-muted text-center leading-relaxed">
              If you did not receive this cash or UPI transfer, tap to dispute and void the record.
            </p>
          </div>
        )}

        {canManage ? (
          <Button
            danger
            type="text"
            block
            icon={<Trash2 className="w-4 h-4" />}
            loading={isDeleting}
            onClick={() => handleDelete(false)}
            className="rounded-xl font-medium text-xs hover:bg-error-bg text-error-text"
          >
            Delete Payment Record
          </Button>
        ) : (
          <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle flex items-center gap-2 text-xs text-text-muted">
            <Lock className="w-4 h-4 text-text-muted shrink-0" />
            <span>Only the sender ({payerName}) or receiver ({payeeName}) can modify or delete this payment.</span>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile Swipeable Bottom Sheet
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
          className="relative z-10 w-full max-h-[85dvh] bg-bg-surface rounded-t-3xl border-t border-border-base shadow-2xl flex flex-col overflow-hidden will-change-transform animate-sheet-slide-up"
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
                <DollarSign className="w-4 h-4 text-success-text" />
                <span className="text-sm font-bold text-text-base">Payment Details</span>
              </div>
            </div>
          </div>

          <div className="p-4 overflow-y-auto">{renderModalContent()}</div>
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
      width={440}
      centered
      title={
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-success-text" />
          <span className="text-base font-bold text-text-base">Payment Details</span>
        </div>
      }
    >
      <div className="pt-3">{renderModalContent()}</div>
    </Modal>
  );
}
