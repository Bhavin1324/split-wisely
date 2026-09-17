import { useState } from 'react';
import { Input, Button, QRCode } from 'antd';
import { Camera, QrCode, Copy, Check, Share2, Download, ShieldCheck, CreditCard } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { canShare } from '../../utils/clipboard';
import type { Profile } from '../../types';

interface SettingsProfileCardProps {
  currentUser: Profile;
  onEditPhoto: () => void;
  upiId: string;
  onChangeUpiId: (value: string) => void;
  onSaveUpi: () => void;
  isSavingUpi: boolean;
  receiveQrUri: string | null;
  onCopyUpi: () => void;
  copiedUpi: boolean;
  onShareUpi: () => void;
  onDownloadQr: () => void;
}

export function SettingsProfileCard({
  currentUser,
  onEditPhoto,
  upiId,
  onChangeUpiId,
  onSaveUpi,
  isSavingUpi,
  receiveQrUri,
  onCopyUpi,
  copiedUpi,
  onShareUpi,
  onDownloadQr,
}: SettingsProfileCardProps) {
  const [isQrOpen, setIsQrOpen] = useState(true);
  const activeUpi = upiId || currentUser.upi_id;

  return (
    <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Profile Header Row */}
        <div className="flex items-start gap-4">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={onEditPhoto}
            title="Click to change profile photo"
          >
            <UserAvatar
              user={currentUser}
              size={64}
              className="border-2 border-border-subtle group-hover:border-primary-500 transition-colors shadow-sm rounded-2xl"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-base truncate mb-0">
                {currentUser.full_name}
              </h3>
              <button
                type="button"
                onClick={onEditPhoto}
                className="text-sm font-semibold text-primary-500 hover:text-primary-600 cursor-pointer"
              >
                Edit
              </button>
            </div>
            <p className="text-xs text-text-muted mt-0.5 mb-0">
              Member since {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-subtle text-[11px] font-mono text-text-muted border border-border-subtle">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Verified Account</span>
            </div>
          </div>
        </div>

        {/* UPI Terminal Section */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary-500" />
              UPI Payment ID
            </label>
            {activeUpi && receiveQrUri && (
              <button
                type="button"
                onClick={() => setIsQrOpen(!isQrOpen)}
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{isQrOpen ? 'Hide QR' : 'Show QR'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={upiId}
                onChange={(e) => onChangeUpiId(e.target.value)}
                placeholder="e.g. username@okaxis"
                className="rounded-xl font-mono text-xs"
              />
            </div>
            <Button
              type="primary"
              onClick={onSaveUpi}
              loading={isSavingUpi}
              className="bg-primary-500 hover:bg-primary-600 rounded-xl font-bold text-xs shadow-xs"
            >
              Save
            </Button>
            {activeUpi && (
              <Button
                onClick={onCopyUpi}
                className="rounded-xl flex items-center justify-center p-2 text-text-muted hover:text-text-base border-border-subtle"
                title="Copy UPI ID"
                icon={copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary-500" />}
              />
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1 mb-0">
            Friends can pay you directly via GPay, PhonePe, or Paytm using this ID.
          </p>

          {/* QR Code Display when Active */}
          {activeUpi && receiveQrUri && isQrOpen && (
            <div className="mt-4 p-4 rounded-2xl bg-bg-subtle border border-border-subtle flex flex-col items-center text-center animate-in fade-in duration-200">
              <div
                id="settings-personal-qr-container"
                className="p-3 bg-white rounded-2xl shadow-sm border border-border-subtle inline-flex flex-col items-center justify-center"
              >
                <QRCode
                  value={receiveQrUri}
                  size={140}
                  bordered={false}
                  color="#0f172a"
                  bgColor="#ffffff"
                  errorLevel="M"
                />
              </div>
              <p className="text-xs font-bold text-text-base mt-3 mb-0.5">
                Scan to Pay {currentUser.full_name} via UPI
              </p>
              <p className="text-[11px] font-mono text-text-muted mb-3">
                {activeUpi}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  onClick={onDownloadQr}
                  className="rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs border-border-subtle"
                  icon={<Download className="w-3.5 h-3.5 text-primary-500" />}
                >
                  Download QR
                </Button>
                {canShare() && (
                  <Button
                    size="small"
                    onClick={onShareUpi}
                    className="rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs border-border-subtle"
                    icon={<Share2 className="w-3.5 h-3.5 text-primary-500" />}
                  >
                    Share
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Placeholder state when no UPI ID is configured */}
          {!activeUpi && (
            <div className="mt-3 p-4 rounded-2xl bg-bg-subtle/50 border border-dashed border-border-base text-center">
              <QrCode className="w-6 h-6 text-text-muted mx-auto mb-1.5 opacity-60" />
              <p className="text-xs font-semibold text-text-base mb-0.5">No UPI ID Configured</p>
              <p className="text-[11px] text-text-muted mb-0">Enter your UPI VPA above and tap Save to generate your instant QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
