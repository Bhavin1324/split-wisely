import { useState, useMemo, useEffect } from 'react';
import { Button, QRCode, Segmented, Spin } from 'antd';
import {
  Smartphone,
  ShieldCheck,
  Clock,
  Zap,
  Monitor,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface PairCompanionStep2ConnectProps {
  ticket: string | null;
  isLoading: boolean;
  error: string | null;
  initialTimeLeft: number;
  isMobile: boolean;
  onRefreshTicket: () => void;
  onBackToStep1: () => void;
}

export function PairCompanionStep2Connect({
  ticket,
  isLoading,
  error,
  initialTimeLeft,
  isMobile,
  onRefreshTicket,
  onBackToStep1,
}: PairCompanionStep2ConnectProps) {
  const [deviceMode, setDeviceMode] = useState<'phone' | 'pc'>(
    isMobile ? 'phone' : 'pc'
  );
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLeft);

  // Sync initialTimeLeft from parent when a new ticket is generated
  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);

  // Localized countdown timer: only re-renders this component, not the parent modal
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const pairDeepLink = useMemo(() => {
    if (!ticket || timeLeft <= 0) return null;
    return `centfolio://pair?ticket=${encodeURIComponent(ticket)}`;
  }, [ticket, timeLeft]);

  return (
    <div className="p-4 rounded-2xl bg-bg-subtle/70 border border-border-base space-y-3.5">
      <div className="text-center">
        <h3 className="font-bold text-sm text-text-main">Connect Your Account</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Link your Centfolio account securely in 1 tap
        </p>
      </div>

      {/* Device Switcher */}
      <Segmented
        options={[
          {
            label: (
              <span className="flex items-center justify-center gap-1.5 font-medium">
                <Smartphone className="w-3.5 h-3.5" />
                On This Phone
              </span>
            ),
            value: 'phone',
          },
          {
            label: (
              <span className="flex items-center justify-center gap-1.5 font-medium">
                <Monitor className="w-3.5 h-3.5" />
                On Computer
              </span>
            ),
            value: 'pc',
          },
        ]}
        value={deviceMode}
        onChange={(val) => setDeviceMode(val as 'phone' | 'pc')}
        className="bg-bg-surface p-0.5 rounded-xl border border-border-subtle text-xs w-full !mb-2"
        block
      />

      {isLoading ? (
        <div className="p-8 rounded-xl bg-bg-surface border border-border-subtle flex flex-col items-center justify-center space-y-3">
          <Spin size="default" />
          <p className="text-xs text-text-muted">Generating secure pairing code...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-bg border border-error-border text-center space-y-2">
          <p className="text-xs text-error-text font-medium">{error}</p>
          <Button
            size="small"
            onClick={onRefreshTicket}
            className="rounded-lg text-xs border-error-border text-error-text hover:bg-error-bg"
          >
            Try Again
          </Button>
        </div>
      ) : timeLeft <= 0 ? (
        <div className="p-6 rounded-xl bg-bg-surface border border-border-subtle text-center space-y-2.5">
          <Clock className="w-6 h-6 text-warning-500 mx-auto" />
          <p className="text-xs text-text-muted">
            Pairing code expired for security. Tap below to generate a new code:
          </p>
          <Button
            type="primary"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRefreshTicket}
            className="rounded-xl text-xs bg-primary-500 hover:bg-primary-600 border-none text-white shadow-xs"
          >
            Generate New Code
          </Button>
        </div>
      ) : deviceMode === 'phone' ? (
        <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle space-y-2.5 text-center">
          <p className="text-xs text-text-muted">
            Tap below to open the companion app on this phone. It will connect automatically:
          </p>
          {pairDeepLink ? (
            <Button
              type="dashed"
              href={pairDeepLink}
              block
              icon={<Zap className="w-4 h-4 text-primary-500" />}
              className="h-11 rounded-xl font-bold text-xs border-dashed border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-500/5 hover:bg-primary-500/10 hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Open & Connect Companion App
            </Button>
          ) : (
            <p className="text-xs text-text-muted italic">
              Sign in to Centfolio to generate pairing link.
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-warning-500" />
              <span>Expires in: {formatCountdown(timeLeft)}</span>
            </span>
            <button
              type="button"
              onClick={onRefreshTicket}
              className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer ml-2"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-subtle flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-white rounded-2xl shadow-xs border border-border-subtle inline-block">
            {pairDeepLink ? (
              <QRCode
                value={pairDeepLink}
                size={150}
                color="#0f172a"
                bgColor="#ffffff"
                bordered={false}
              />
            ) : (
              <p className="text-xs text-text-muted italic">
                Sign in to Centfolio to generate QR code.
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-warning-500" />
              <span>Expires in: {formatCountdown(timeLeft)}</span>
            </span>
            <button
              type="button"
              onClick={onRefreshTicket}
              className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer ml-2"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Refresh</span>
            </button>
          </div>
          <span className="text-[11px] text-text-muted">
            Open Centfolio Sync on phone & point camera at this QR code
          </span>
        </div>
      )}

      {/* Sub-footer in Step 2 */}
      <div className="pt-1 flex items-center justify-between text-xs text-text-muted">
        <button
          type="button"
          onClick={onBackToStep1}
          className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 cursor-pointer font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App Download</span>
        </button>
        <span className="text-[11px] text-success-text font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Single-Use Token Isolation
        </span>
      </div>
    </div>
  );
}
