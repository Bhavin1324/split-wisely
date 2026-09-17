import { useState } from 'react';
import { Switch, Button, message } from 'antd';
import { BellRing, BellOff, Send, Info } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { PushNotificationGuideModal } from './PushNotificationGuideModal';

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
        } else if (Notification.permission === 'denied') {
          setGuideModalOpen(true);
        } else {
          messageApi.warning('Could not subscribe. Please allow notification permission in your browser.');
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
      <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <BellOff className="w-3.5 h-3.5 text-text-muted" />
            Push Notifications
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Not Supported
          </span>
        </div>
        <div className="p-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
            <BellOff className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xs text-text-muted">
            Web push notifications are not supported on this browser or webview environment.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
        {/* Sibling Matching Header Strip */}
        <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-primary-500" />
            Push Notifications
          </span>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active on Device
            </span>
          ) : permission === 'denied' ? (
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 transition-colors cursor-pointer"
            >
              <Info className="w-3 h-3" /> Blocked · Tap for Guide
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-subtle text-text-muted border border-border-subtle">
              Disabled
            </span>
          )}
        </div>

        <div className="divide-y divide-border-subtle">
          {/* Master Control Row */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-primary-500 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-text-base">Real-Time Alerts</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Instant alerts when friends add expenses or settle up
                </div>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              loading={loading || checkingPermission}
              onChange={handleToggle}
              className="shrink-0"
            />
          </div>

          {/* Dedicated Action Sub-Row (Only shown when active on device) */}
          {isSubscribed && (
            <div className="p-5 flex items-center justify-between gap-4 bg-bg-subtle/30">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
                  <Send className="w-4 h-4 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text-base">Test Notification</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Verify sound, banner & vibration on this device
                  </div>
                </div>
              </div>
              <Button
                size="small"
                icon={<Send className="w-3.5 h-3.5 text-primary-500" />}
                onClick={handleSendTest}
                className="rounded-xl font-bold text-xs shadow-xs border-border-subtle shrink-0"
              >
                Send Test
              </Button>
            </div>
          )}
        </div>
      </div>

      <PushNotificationGuideModal
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        checkingPermission={checkingPermission}
        onCheckAndRetry={handleCheckPermissionAndRetry}
      />
    </>
  );
}
