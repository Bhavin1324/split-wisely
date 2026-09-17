import { Card, Divider, Input, Button, QRCode } from 'antd';
import { User, Camera, QrCode, Copy, Check, Share2, Download, ShieldCheck } from 'lucide-react';
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
  return (
    <Card className="rounded-2xl border-border-base shadow-sm">
      <div className="flex items-center gap-4">
        <User className="w-5 h-5 text-text-muted flex-shrink-0" />
        <h2 className="text-base font-semibold text-text-base">Profile</h2>
      </div>
      <Divider className="my-4" />
      <div className="flex items-center gap-4">
        <div 
          className="relative group cursor-pointer" 
          onClick={onEditPhoto}
          title="Click to change profile photo"
        >
          <UserAvatar
            user={currentUser}
            size={68}
            className="border-2 border-border-subtle group-hover:border-primary-500 transition-colors shadow-sm"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Camera className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-text-base mb-0">
              {currentUser.full_name}
            </p>
            <button
              type="button"
              onClick={onEditPhoto}
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 bg-primary-500/10 hover:bg-primary-500/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              Edit Photo
            </button>
          </div>
          <p className="text-sm text-text-muted mt-0.5 mb-0">
            Member since {new Date(currentUser.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
      
      <Divider className="my-4" />
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-text-base">UPI ID for receiving payments</label>
          <div className="flex items-center gap-3 mt-1.5">
            <Input 
              value={upiId} 
              onChange={(e) => onChangeUpiId(e.target.value)} 
              placeholder="e.g. username@okaxis" 
              className="max-w-xs"
            />
            <Button type="primary" onClick={onSaveUpi} loading={isSavingUpi} className="bg-primary-500 rounded-lg border-none hover:bg-primary-600 font-medium">
              Save
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-1">Friends can pay you directly via any UPI app using this ID.</p>
        </div>

        {currentUser.upi_id && receiveQrUri && (
          <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle flex flex-col sm:flex-row items-center gap-5">
            <div
              id="settings-personal-qr-container"
              className="bg-bg-surface p-3 rounded-xl border border-border-subtle shadow-sm shrink-0 inline-flex flex-col items-center justify-center"
            >
              <QRCode
                value={receiveQrUri}
                size={140}
                bordered={false}
                errorLevel="M"
              />
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 mb-1">
                <QrCode className="w-4 h-4" />
                <span>My Receive QR Code</span>
              </div>
              <div className="text-sm font-bold text-text-main mb-0.5">
                {currentUser.full_name}
              </div>
              <div className="text-xs font-mono text-text-muted truncate max-w-full mb-3">
                {currentUser.upi_id}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full">
                <Button
                  size="small"
                  onClick={onCopyUpi}
                  className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                  icon={copiedUpi ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5 text-primary-500" />}
                >
                  {copiedUpi ? 'Copied' : 'Copy ID'}
                </Button>
                {canShare() && (
                  <Button
                    size="small"
                    onClick={onShareUpi}
                    className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                    icon={<Share2 className="w-3.5 h-3.5 text-primary-500" />}
                  >
                    Share
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={onDownloadQr}
                  className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                  icon={<Download className="w-3.5 h-3.5 text-primary-500" />}
                >
                  Download QR
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success-500 shrink-0" />
                <span>Friends can scan this QR code with any UPI app to pay you</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
