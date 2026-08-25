import { useState } from 'react';
import { Card, Switch, Button, message, Tag, Modal } from 'antd';
import { BellRing, BellOff, Send, Sparkles, CheckCircle2, Info, HelpCircle, RotateCcw, Smartphone, Apple, Laptop } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export function PushNotificationsCard() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
    refreshStatus,
  } = usePushNotifications();

  const [messageApi, contextHolder] = message.useMessage();
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      try {
        const success = await subscribe();
        if (success) {
          messageApi.success('Push notifications enabled for this device!');
        } else {
          // If permission is blocked/denied, open the guide modal
          if (Notification.permission === 'denied') {
            setGuideModalOpen(true);
          } else {
            messageApi.warning('Could not subscribe. Please allow notification permission in your browser.');
          }
        }
      } catch (err: unknown) {
        if (Notification.permission === 'denied') {
          setGuideModalOpen(true);
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to enable push notifications';
          messageApi.error(msg);
        }
      }
    } else {
      try {
        await unsubscribe();
        messageApi.success('Push notifications turned off for this device.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to disable push notifications';
        messageApi.error(msg);
      }
    }
  };

  const handleCheckPermissionAndRetry = async () => {
    setCheckingPermission(true);
    await refreshStatus();
    if (Notification.permission === 'granted') {
      const success = await subscribe();
      setCheckingPermission(false);
      if (success) {
        setGuideModalOpen(false);
        messageApi.success('Notifications successfully enabled!');
      }
    } else if (Notification.permission === 'default') {
      // If user reset to default, requesting permission will now trigger the native OS prompt
      try {
        const success = await subscribe();
        setCheckingPermission(false);
        if (success) {
          setGuideModalOpen(false);
          messageApi.success('Notifications successfully enabled!');
        }
      } catch {
        setCheckingPermission(false);
      }
    } else {
      setCheckingPermission(false);
      messageApi.warning('Notifications are still blocked in browser settings. Please follow the steps below.');
    }
  };

  const handleSendTest = async () => {
    try {
      const result = await sendTest();
      if (result.success) {
        messageApi.success('Test notification sent! Check your notification bar or lock screen.');
      } else if (result.permission === 'denied') {
        setGuideModalOpen(true);
      } else {
        messageApi.warning(result.message || 'Please allow notification permission when prompted.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test notification';
      messageApi.error(msg);
    }
  };

  if (!isSupported) {
    return (
      <Card className="rounded-2xl border-border-base shadow-sm bg-bg-surface">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <BellOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-text-base mb-1">Push Notifications</h4>
            <p className="text-xs text-text-muted mb-2">
              Web push notifications are not supported on this browser or environment.
            </p>
            <Tag color="default" className="rounded-md text-[11px]">
              Not Supported
            </Tag>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {contextHolder}
      <Card className="rounded-2xl border-border-base shadow-sm bg-bg-surface overflow-hidden">
        <div className="space-y-4">
          {/* Header & Main Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-500 shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-text-base mb-0">Push Notifications</h4>
                  {isSubscribed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Active on Device
                    </span>
                  ) : permission === 'denied' ? (
                    <button
                      onClick={() => setGuideModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                      <Info className="w-3 h-3" /> Blocked · Tap for guide
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-border-subtle text-text-muted">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1 mb-0">
                  Receive instant alerts on your phone lock screen when friends add expenses or settle up.
                </p>
              </div>
            </div>

            <Switch
              checked={isSubscribed}
              loading={loading || checkingPermission}
              onChange={handleToggle}
              className="shrink-0"
            />
          </div>

          {/* Action Row - Only shown when active on device */}
          {isSubscribed && (
            <div className="pt-2 border-t border-border-subtle space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  Notifications active on this device
                </span>
                <Button
                  size="small"
                  icon={<Send className="w-3.5 h-3.5" />}
                  onClick={handleSendTest}
                  className="text-xs font-semibold rounded-lg text-primary-600 dark:text-primary-400 bg-primary-500/10 border-0 hover:bg-primary-500/20"
                >
                  Send Test Alert
                </Button>
              </div>
              <p className="text-[11px] text-text-muted mb-0 opacity-80">
                💡 <strong>Tip for mobile:</strong> If your phone does not vibrate, check <em>Android Settings &rarr; Apps &rarr; Chrome &rarr; Notifications &rarr; Sites</em> and ensure <strong>Vibrate</strong> is turned ON.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Guide Modal for Unblocking Notifications */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-text-base">
            <HelpCircle className="w-5 h-5 text-primary-500" />
            <span>How to Enable Notifications</span>
          </div>
        }
        open={guideModalOpen}
        onCancel={() => setGuideModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setGuideModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="retry"
            type="primary"
            loading={checkingPermission}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleCheckPermissionAndRetry}
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
                <li>Tap <strong>Notifications</strong> and toggle <strong className="text-success-text">Allow notifications ON</strong>.</li>
              </ol>
            </div>

            <div className="space-y-1.5 pl-1 text-xs text-text-muted pt-1 border-t border-border-subtle/60">
              <div className="font-medium text-[11px] text-text-muted">
                Option B: In-Browser Address Bar
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Tap the <strong>tune / lock icon 🔒</strong> at the left of the address bar.</li>
                <li>Tap <strong>Permissions</strong> &rarr; Set <strong>Notifications</strong> to <strong className="text-success-text">Allow</strong>.</li>
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
                <li>Tap <strong>Notifications</strong> and turn <strong className="text-success-text">Allow Notifications ON</strong>.</li>
              </ol>
            </div>

            <div className="space-y-1.5 pl-1 text-xs text-text-muted pt-1 border-t border-border-subtle/60">
              <div className="font-medium text-[11px] text-text-muted">
                Option B: For Safari Web Browser
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open iPhone <strong>Settings &rarr; Notifications &rarr; Safari</strong>.</li>
                <li>Ensure <strong>Allow Notifications</strong> is toggled <strong className="text-success-text">ON</strong>.</li>
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
              <li>Toggle <strong>Notifications</strong> to <strong className="text-success-text">ON / Allow</strong> and reload the page.</li>
            </ol>
          </div>

          <div className="pt-1 text-center">
            <span className="text-xs text-text-muted">
              After updating your settings, tap <strong>"Check & Enable"</strong> below to activate!
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
