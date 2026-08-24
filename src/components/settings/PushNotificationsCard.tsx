import { Card, Switch, Button, message, Tag } from 'antd';
import { BellRing, BellOff, Send, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
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
  } = usePushNotifications();

  const [messageApi, contextHolder] = message.useMessage();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      try {
        const success = await subscribe();
        if (success) {
          messageApi.success('Push notifications enabled for this device!');
        } else {
          messageApi.warning('Could not subscribe. Please allow notification permission in your browser.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to enable push notifications';
        messageApi.error(msg);
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

  const handleSendTest = async () => {
    try {
      const result = await sendTest();
      if (result.success) {
        messageApi.success('Test notification sent! Check your notification bar or lock screen.');
      } else if (result.permission === 'denied') {
        messageApi.error(result.message || 'Notifications are blocked in your browser settings.');
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <ShieldAlert className="w-3 h-3" /> Blocked in Browser
                    </span>
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
              loading={loading}
              onChange={handleToggle}
              disabled={permission === 'denied'}
              className="shrink-0"
            />
          </div>

          {/* Browser Permission Blocked Warning */}
          {permission === 'denied' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Notifications are blocked in browser settings
              </div>
              <p className="mb-0 text-[11px] opacity-90">
                To receive alerts, tap the lock/tune icon in your browser address bar and change Notifications to "Allow".
              </p>
            </div>
          )}

          {/* Action Row */}
          {isSubscribed ? (
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
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
          ) : permission !== 'denied' ? (
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-text-muted">
                Permission not yet enabled on this browser
              </span>
              <Button
                size="small"
                type="primary"
                loading={loading}
                onClick={() => handleToggle(true)}
                className="text-xs font-semibold rounded-lg bg-primary-500 hover:bg-primary-600"
              >
                Enable Notifications
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
