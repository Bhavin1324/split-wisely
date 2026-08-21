import { useState, useMemo, useRef } from 'react';
import { Modal, Button, QRCode, message, Tooltip } from 'antd';
import { Copy, Check, Download, QrCode, ShieldCheck, Share2 } from 'lucide-react';
import { generateReceiveQrUri, downloadQrCode } from '../utils/upi';
import { copyFromInput, canShare, shareText } from '../utils/clipboard';
import { UserAvatar } from './ui/UserAvatar';

interface MyQrModalProps {
  open: boolean;
  onClose: () => void;
  vpa: string;
  userName: string;
}

export function MyQrModal({ open, onClose, vpa, userName }: MyQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const vpaInputRef = useRef<HTMLInputElement>(null);

  const receiveUri = useMemo(() => {
    if (!vpa) return null;
    return generateReceiveQrUri(vpa, userName);
  }, [vpa, userName]);

  const handleCopyVpa = () => {
    if (!vpa) return;
    const success = copyFromInput(vpaInputRef.current, vpa);
    if (success) {
      setCopied(true);
      messageApi.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      messageApi.error('Failed to copy UPI ID. Please copy it manually.');
    }
  };

  const handleShare = async () => {
    if (!vpa) return;
    const shared = await shareText(vpa, `Pay ${userName} via UPI`);
    if (shared) {
      messageApi.success('UPI ID shared!');
    }
  };

  const handleDownload = () => {
    const success = downloadQrCode('my-personal-qr-code', `${userName.toLowerCase().replace(/\s+/g, '-')}-upi-qr.png`);
    if (success) {
      messageApi.success('QR Code image downloaded!');
    } else {
      messageApi.error('Failed to download QR image.');
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div className="flex items-center gap-2 text-text-main">
            <QrCode className="w-5 h-5 text-primary-500" />
            <span>My Payment QR Code</span>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={380}
        destroyOnClose
        centered
        footer={null}
        className="my-qr-modal"
      >
        <div className="flex flex-col items-center text-center pt-2 pb-1">
          {/* User Profile Header */}
          <UserAvatar
            user={{ full_name: userName }}
            size={56}
            className="mb-2 shadow-sm"
          />
          <div className="text-base font-bold text-text-main mb-0.5">
            {userName || 'Your Name'}
          </div>
          <div className="text-xs text-text-muted mb-4">
            Scan to pay me via any UPI app
          </div>

          {/* High-Contrast QR Code Card */}
          <div
            id="my-personal-qr-code"
            className="bg-bg-surface p-4 rounded-2xl shadow-sm border border-border-subtle inline-flex flex-col items-center justify-center mb-4 transition-transform hover:scale-[1.01]"
          >
            {receiveUri ? (
              <QRCode
                value={receiveUri}
                size={180}
                bordered={false}
                errorLevel="M"
              />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-sm text-text-muted">
                Please set a UPI ID in Settings
              </div>
            )}
          </div>

          {/* VPA Pill */}
          {vpa ? (
            <div className="flex items-center justify-between gap-2 bg-bg-subtle border border-border-subtle rounded-xl px-3 py-2 w-full max-w-[320px] mb-4">
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-[10px] text-text-muted font-medium leading-none mb-0.5">
                  YOUR UPI ID (Tap to select)
                </span>
                <input
                  ref={vpaInputRef}
                  type="text"
                  readOnly
                  value={vpa}
                  onClick={(e) => e.currentTarget.select()}
                  className="text-sm font-mono text-text-main font-semibold bg-transparent border-none outline-none p-0 w-full select-all cursor-pointer"
                  title="Tap to select all"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
                {canShare() && (
                  <Tooltip title="Share UPI ID">
                    <Button
                      type="text"
                      size="small"
                      onClick={handleShare}
                      className="shrink-0 flex items-center gap-1 text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg px-2"
                      icon={<Share2 className="w-4 h-4" />}
                    >
                      <span className="text-xs font-medium">Share</span>
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-muted mb-4 p-2 bg-bg-subtle rounded-xl border border-border-subtle w-full">
              No UPI ID configured yet. Set your UPI ID in Settings to generate your personal QR.
            </div>
          )}

          {/* Trust Notice */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mb-4">
            <ShieldCheck className="w-4 h-4 text-success-500" />
            <span>Works with Google Pay, PhonePe, Paytm & BHIM</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full">
            {receiveUri && (
              <Button
                type="default"
                size="large"
                onClick={handleDownload}
                className="flex-1 rounded-xl flex items-center justify-center gap-1.5 border-border-subtle hover:border-primary-500 font-medium"
                icon={<Download className="w-4 h-4 text-primary-500" />}
              >
                Save QR
              </Button>
            )}
            <Button
              type="primary"
              size="large"
              onClick={onClose}
              className="flex-1 bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-white border-none shadow-md"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
