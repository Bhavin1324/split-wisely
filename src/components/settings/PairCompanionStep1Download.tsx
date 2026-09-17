import { Smartphone, Zap, Users, ShieldCheck, Download, Clock, ArrowRight } from 'lucide-react';
import { AppConfig } from '../../config/AppConfig';

interface PairCompanionStep1DownloadProps {
  onNextStep: () => void;
}

export function PairCompanionStep1Download({ onNextStep }: PairCompanionStep1DownloadProps) {
  const apkDownloadUrl = AppConfig.companion.apkUrl;

  return (
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
          onClick={onNextStep}
          className="w-full py-2 rounded-xl border border-border-base hover:bg-bg-subtle text-text-muted hover:text-text-main font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Already installed? Next: Connect Account</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
