import { Button } from 'antd';
import { Smartphone } from 'lucide-react';

interface SettingsCompanionCardProps {
  onPairClick: () => void;
}

export function SettingsCompanionCard({ onPairClick }: SettingsCompanionCardProps) {
  return (
    <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-primary-500" />
          Centfolio SMS Sync (Android)
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-bg-subtle text-text-muted border border-border-subtle">
          Android 10+
        </span>
      </div>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-text-base">Local SMS Ingestion</div>
          <p className="text-xs text-text-muted mt-0.5 mb-0 leading-relaxed">
            Automatically parse banking debit/credit SMS to your ledger with complete on-device privacy.
          </p>
        </div>
        <Button
          type="primary"
          onClick={onPairClick}
          className="rounded-xl font-bold text-xs bg-primary-500 hover:bg-primary-600 shadow-xs shrink-0 self-start sm:self-center"
        >
          Pair Companion App
        </Button>
      </div>
    </div>
  );
}
