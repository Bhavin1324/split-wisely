import { useState, useMemo } from 'react';
import { Modal, Button, QRCode, message, Tooltip } from 'antd';
import { Copy, Check, ExternalLink, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { formatCents } from '../utils/currency';
import { getAppSpecificUpiUri, generateUpiUri } from '../utils/upi';

interface PaymentQrModalProps {
  open: boolean;
  onClose: () => void;
  upiUri: string | null;
  vpa: string;
  payeeName: string;
  amountCents: number;
}

export function PaymentQrModal({
  open,
  onClose,
  upiUri,
  vpa,
  payeeName,
  amountCents,
}: PaymentQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const upiOptions = useMemo(() => ({
    vpa,
    payeeName,
    amountCents,
    note: 'Settlement',
  }), [vpa, payeeName, amountCents]);

  const gpayUri = useMemo(() => getAppSpecificUpiUri('gpay', upiOptions), [upiOptions]);
  const phonepeUri = useMemo(() => getAppSpecificUpiUri('phonepe', upiOptions), [upiOptions]);
  const paytmUri = useMemo(() => getAppSpecificUpiUri('paytm', upiOptions), [upiOptions]);
  const genericUri = useMemo(() => upiUri || generateUpiUri(upiOptions), [upiUri, upiOptions]);

  const handleCopyVpa = async () => {
    if (!vpa) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(vpa);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = vpa;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      messageApi.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      messageApi.error('Failed to copy UPI ID.');
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div className="flex items-center gap-2 text-text-main">
            <QrCode className="w-5 h-5 text-primary-500" />
            <span>UPI Payment Hub</span>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={420}
        destroyOnClose
        centered
        footer={null}
        className="payment-qr-modal"
      >
        <div className="flex flex-col items-center text-center pt-1 pb-1">
          {/* Amount Header */}
          <div className="text-xs uppercase tracking-wider text-text-muted font-medium mb-0.5">
            Settlement Amount
          </div>
          <div className="text-3xl font-bold font-financial text-text-main mb-1">
            {formatCents(amountCents)}
          </div>

          {/* Payee Info */}
          <div className="text-sm text-text-muted mb-3">
            Paying <span className="font-semibold text-text-main">{payeeName}</span>
          </div>

          {/* 1-Click App Quick Launchers */}
          <div className="w-full mb-3">
            <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span>1-Click Direct Pay</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gpayUri && (
                <a
                  href={gpayUri}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-bg-subtle hover:bg-bg-surface-hover border border-border-subtle transition-all active:scale-[0.97] text-text-main group"
                >
                  <span className="text-xs font-semibold group-hover:text-primary-500">GPay</span>
                  <span className="text-[10px] text-text-muted">1-Tap Launch</span>
                </a>
              )}
              {phonepeUri && (
                <a
                  href={phonepeUri}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-bg-subtle hover:bg-bg-surface-hover border border-border-subtle transition-all active:scale-[0.97] text-text-main group"
                >
                  <span className="text-xs font-semibold group-hover:text-primary-500">PhonePe</span>
                  <span className="text-[10px] text-text-muted">1-Tap Launch</span>
                </a>
              )}
              {paytmUri && (
                <a
                  href={paytmUri}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-bg-subtle hover:bg-bg-surface-hover border border-border-subtle transition-all active:scale-[0.97] text-text-main group"
                >
                  <span className="text-xs font-semibold group-hover:text-primary-500">Paytm</span>
                  <span className="text-[10px] text-text-muted">1-Tap Launch</span>
                </a>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-bg-surface p-3.5 rounded-2xl shadow-sm border border-border-subtle inline-flex flex-col items-center justify-center mb-3 transition-transform hover:scale-[1.01]">
            {genericUri ? (
              <QRCode
                value={genericUri}
                size={175}
                bordered={false}
                errorLevel="M"
              />
            ) : (
              <div className="w-[175px] h-[175px] flex items-center justify-center text-sm text-text-muted">
                Generating QR...
              </div>
            )}
          </div>

          {/* VPA Copy Pill */}
          <div className="flex items-center justify-between gap-2 bg-bg-subtle border border-border-subtle rounded-xl px-3 py-1.5 w-full max-w-[340px] mb-3">
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="text-[10px] text-text-muted font-medium leading-none mb-0.5">
                UPI ID / VPA
              </span>
              <span className="text-sm font-mono text-text-main font-semibold truncate">
                {vpa}
              </span>
            </div>
            <Tooltip title={copied ? 'Copied!' : 'Copy UPI ID'}>
              <Button
                type="text"
                size="small"
                onClick={handleCopyVpa}
                className="shrink-0 flex items-center gap-1 text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg px-2"
                icon={copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
              >
                <span className="text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </Tooltip>
          </div>

          {/* Trust Notice */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mb-4">
            <ShieldCheck className="w-4 h-4 text-success-500" />
            <span>Scan with any UPI camera or copy ID if web links are restricted</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full">
            {genericUri && (
              <a href={genericUri} className="w-full">
                <Button
                  type="primary"
                  size="large"
                  className="w-full bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-white border-none shadow-md flex items-center justify-center gap-2"
                  icon={<ExternalLink className="w-4 h-4" />}
                >
                  Pay via Default UPI App
                </Button>
              </a>
            )}
            <Button
              size="large"
              onClick={onClose}
              className="w-full rounded-xl"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
