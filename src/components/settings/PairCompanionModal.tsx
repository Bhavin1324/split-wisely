import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Button } from 'antd';
import { Smartphone, ShieldCheck, Check } from 'lucide-react';
import { useGeneratePairingTicket } from '../../hooks/useCompanionPairing';
import { PairCompanionStep1Download } from './PairCompanionStep1Download';
import { PairCompanionStep2Connect } from './PairCompanionStep2Connect';

interface PairCompanionModalProps {
  open: boolean;
  onClose: () => void;
}

export function PairCompanionModal({ open, onClose }: PairCompanionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Auto-detect device context: mobile phone vs desktop computer
  const isMobile = useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      /android|iphone|ipad|mobile/i.test(navigator.userAgent)
    );
  }, []);

  const {
    mutate: generateTicket,
    isPending: isLoadingTicket,
    error: ticketMutationError,
    data: ticketData,
  } = useGeneratePairingTicket();

  const handleFetchTicket = useCallback(() => {
    generateTicket();
  }, [generateTicket]);

  // Fetch ticket when entering Step 2 or when modal opens on Step 2
  useEffect(() => {
    if (open && step === 2 && !ticketData && !isLoadingTicket) {
      handleFetchTicket();
    }
  }, [open, step, ticketData, isLoadingTicket, handleFetchTicket]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-text-main font-bold">
          <Smartphone className="w-5 h-5 text-primary-500" />
          <span>Centfolio SMS Companion Setup</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between w-full pt-1">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success-text" />
            <span>Bank SMS only • 100% Private</span>
          </span>
          <Button
            type="primary"
            onClick={onClose}
            className="rounded-xl font-bold bg-primary-500 hover:bg-primary-600 border-none text-xs h-8 px-4"
          >
            Got It
          </Button>
        </div>
      }
      width={480}
      destroyOnClose
    >
      <div className="space-y-4 py-2 text-sm">
        {/* Interactive 2-Step Progress Stepper */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-bg-subtle border border-border-base">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 1
                ? 'bg-bg-surface text-text-main shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step === 2
                  ? 'bg-success-text text-white'
                  : 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
              }`}
            >
              {step === 2 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '1'}
            </span>
            <span>1. Get the App</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 2
                ? 'bg-bg-surface text-text-main shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                step === 2
                  ? 'bg-primary-500 text-white'
                  : 'bg-bg-subtle text-text-muted border border-border-subtle'
              }`}
            >
              2
            </span>
            <span>2. Connect Account</span>
          </button>
        </div>

        {step === 1 ? (
          <PairCompanionStep1Download onNextStep={() => setStep(2)} />
        ) : (
          <PairCompanionStep2Connect
            ticket={ticketData?.ticket ?? null}
            isLoading={isLoadingTicket}
            error={ticketMutationError?.message ?? null}
            initialTimeLeft={ticketData?.expiresInSeconds ?? 0}
            isMobile={isMobile}
            onRefreshTicket={handleFetchTicket}
            onBackToStep1={() => setStep(1)}
          />
        )}
      </div>
    </Modal>
  );
}
