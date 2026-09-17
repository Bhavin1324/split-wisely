import { Modal, Button } from 'antd';
import { HelpCircle, RotateCcw, Smartphone, Apple, Laptop } from 'lucide-react';

interface PushNotificationGuideModalProps {
  open: boolean;
  onClose: () => void;
  checkingPermission: boolean;
  onCheckAndRetry: () => void;
}

export function PushNotificationGuideModal({
  open,
  onClose,
  checkingPermission,
  onCheckAndRetry,
}: PushNotificationGuideModalProps) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-text-base">
          <HelpCircle className="w-5 h-5 text-primary-500" />
          <span>How to Enable Notifications</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="retry"
          type="primary"
          loading={checkingPermission}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onCheckAndRetry}
          className="bg-primary-500 hover:bg-primary-600 font-semibold"
        >
          Check & Enable
        </Button>,
      ]}
      centered
      destroyOnClose
      className="rounded-2xl overflow-hidden"
    >
      <div className="py-2 space-y-3.5 text-sm text-text-base max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-text-muted mb-2">
          Because notification permission was previously dismissed or blocked, your device requires you to allow it in settings:
        </p>

        {/* Android Section */}
        <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-base space-y-2.5">
          <div className="font-semibold text-xs text-text-base flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Android (App Info & Browser)</span>
          </div>

          <div className="space-y-1.5 pl-1 text-xs text-text-muted">
            <div className="font-medium text-[11px] text-primary-500">
              Option A: Fast App Info Shortcut (Recommended)
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Long-press the <strong>Centfolio</strong> (or <strong>Chrome</strong>) app icon on your Home screen.</li>
              <li>Tap <strong>App info (ℹ️)</strong>.</li>
              <li>Tap <strong>Notifications</strong> and toggle <strong className="text-emerald-500">Allow notifications ON</strong>.</li>
            </ol>
          </div>

          <div className="space-y-1.5 pl-1 text-xs text-text-muted pt-1 border-t border-border-subtle/60">
            <div className="font-medium text-[11px] text-text-muted">
              Option B: In-Browser Address Bar
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Tap the <strong>tune / lock icon 🔒</strong> at the left of the address bar.</li>
              <li>Tap <strong>Permissions</strong> &rarr; Set <strong>Notifications</strong> to <strong className="text-emerald-500">Allow</strong>.</li>
            </ol>
          </div>
        </div>

        {/* iOS Section */}
        <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-base space-y-2.5">
          <div className="font-semibold text-xs text-text-base flex items-center gap-1.5">
            <Apple className="w-4 h-4 text-neutral-400" />
            <span>iPhone / iPad (iOS Settings)</span>
          </div>

          <div className="space-y-1.5 pl-1 text-xs text-text-muted">
            <div className="font-medium text-[11px] text-primary-500">
              Option A: For Installed PWA App
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Open your iPhone <strong>Settings</strong> app.</li>
              <li>Scroll down and tap <strong>Centfolio</strong>.</li>
              <li>Tap <strong>Notifications</strong> and turn <strong className="text-emerald-500">Allow Notifications ON</strong>.</li>
            </ol>
          </div>

          <div className="space-y-1.5 pl-1 text-xs text-text-muted pt-1 border-t border-border-subtle/60">
            <div className="font-medium text-[11px] text-text-muted">
              Option B: For Safari Web Browser
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Open iPhone <strong>Settings &rarr; Notifications &rarr; Safari</strong>.</li>
              <li>Ensure <strong>Allow Notifications</strong> is toggled <strong className="text-emerald-500">ON</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Desktop Section */}
        <div className="p-3.5 rounded-xl bg-bg-subtle border border-border-base space-y-2">
          <div className="font-semibold text-xs text-text-base flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-blue-500" />
            <span>Desktop (Chrome / Edge / Firefox)</span>
          </div>
          <ol className="list-decimal list-inside text-xs text-text-muted space-y-1 pl-1">
            <li>Click the <strong>view site information (padlock 🔒)</strong> icon next to the URL.</li>
            <li>Toggle <strong>Notifications</strong> to <strong className="text-emerald-500">ON / Allow</strong> and reload the page.</li>
          </ol>
        </div>

        <div className="pt-1 text-center">
          <span className="text-xs text-text-muted">
            After updating your settings, tap <strong>"Check & Enable"</strong> below to activate!
          </span>
        </div>
      </div>
    </Modal>
  );
}
