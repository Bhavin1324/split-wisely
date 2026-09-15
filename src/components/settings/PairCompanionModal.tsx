import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Button, QRCode, Segmented, Spin } from 'antd';
import {
  Smartphone,
  ShieldCheck,
  Download,
  Clock,
  Zap,
  Monitor,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  RefreshCw,
} from 'lucide-react';
import { AppConfig } from '../../config/AppConfig';
import { useAuth } from '../../context/AuthContext';

interface PairCompanionModalProps {
  open: boolean;
  onClose: () => void;
}

export function PairCompanionModal({ open, onClose }: PairCompanionModalProps) {
  const { session } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  // Auto-detect device context: mobile phone vs desktop computer
  const isMobile = useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      /android|iphone|ipad|mobile/i.test(navigator.userAgent)
    );
  }, []);

  const [deviceMode, setDeviceMode] = useState<'phone' | 'pc'>(
    isMobile ? 'phone' : 'pc'
  );

  const [ticket, setTicket] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const apkDownloadUrl = AppConfig.companion.apkUrl;

  const fetchPairingTicket = useCallback(async () => {
    if (!session?.access_token) return;
    setIsLoadingTicket(true);
    setTicketError(null);

    try {
      const endpoint = `${AppConfig.supabase.url.replace(/\/+$/, '')}/functions/v1/pair-companion?action=generate`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': AppConfig.supabase.anonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to generate ticket (${resp.status})`);
      }

      const data = await resp.json();
      setTicket(data.ticket);
      const expMs = new Date(data.expires_at).getTime();
      const diffSecs = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
      setTimeLeft(diffSecs);
    } catch (err: any) {
      console.error('Failed to generate pairing ticket:', err);
      setTicketError(err.message || 'Failed to generate secure pairing ticket.');
    } finally {
      setIsLoadingTicket(false);
    }
  }, [session?.access_token]);

  // Fetch ticket when entering Step 2 or when modal opens on Step 2
  useEffect(() => {
    if (open && step === 2) {
      fetchPairingTicket();
    }
  }, [open, step, fetchPairingTicket]);

  // Expiration countdown timer
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
          /* Step 1: Clean App Download Card */
          <div className="p-4 rounded-2xl bg-bg-subtle/70 border border-border-base space-y-3.5">
            {/* Header App Hero */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-12 min-h-12 rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface shadow-xs flex items-center justify-center shrink-0">
                <img
                  src="/companion-app-icon.png"
                  alt="Centfolio SMS Sync"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Smartphone className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-text-main truncate">
                    Centfolio SMS Sync
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shrink-0">
                    Android • ~2 MB
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  Runs quietly in the background to log bank & UPI SMS.
                </p>
              </div>
            </div>

            {/* 3 Layman Value Props */}
            <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle space-y-2 text-xs">
              <div className="flex items-center gap-2 text-text-main">
                <Zap className="w-4 h-4 text-primary-500 shrink-0" />
                <span>
                  <strong>Full Control:</strong> All bank expenses appear on your Dashboard for 1-tap review.
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-main">
                <Users className="w-4 h-4 text-primary-500 shrink-0" />
                <span>
                  <strong>Easy Splitting:</strong> Confirm as Personal or split in a Group with 1 tap.
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-main">
                <ShieldCheck className="w-4 h-4 text-success-text shrink-0" />
                <span>
                  <strong>100% Private:</strong> OTPs and personal chats are strictly ignored.
                </span>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="space-y-2 pt-1">
              {apkDownloadUrl ? (
                <a
                  href={apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Companion APK (~2 MB)</span>
                </a>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl bg-bg-surface border border-border-subtle text-text-muted text-xs flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span>Download link: Coming soon...</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2 rounded-xl border border-border-base hover:bg-bg-subtle text-text-muted hover:text-text-main font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Already installed? Next: Connect Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Connect Account Card */
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

            {isLoadingTicket ? (
              <div className="p-8 rounded-xl bg-bg-surface border border-border-subtle flex flex-col items-center justify-center space-y-3">
                <Spin size="default" />
                <p className="text-xs text-text-muted">Generating secure pairing code...</p>
              </div>
            ) : ticketError ? (
              <div className="p-4 rounded-xl bg-error-bg border border-error-border text-center space-y-2">
                <p className="text-xs text-error-text font-medium">
                  {ticketError}
                </p>
                <Button
                  size="small"
                  onClick={() => fetchPairingTicket()}
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
                  onClick={() => fetchPairingTicket()}
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
                    onClick={() => fetchPairingTicket()}
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
                    <p className="text-xs text-text-muted italic">Sign in to Centfolio to generate QR code.</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3 text-warning-500" />
                    <span>Expires in: {formatCountdown(timeLeft)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchPairingTicket()}
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
                onClick={() => setStep(1)}
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
        )}
      </div>
    </Modal>
  );
}
