import { FileSpreadsheet, Database, Download, Shield } from 'lucide-react';

interface SettingsExportCardProps {
  onExportCSV: () => void;
  onExportJSON: () => void;
  isExportingCSV: boolean;
  isExportingJSON: boolean;
}

export function SettingsExportCard({
  onExportCSV,
  onExportJSON,
  isExportingCSV,
  isExportingJSON,
}: SettingsExportCardProps) {
  return (
    <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary-500" />
          Data & Privacy Vault
        </span>
        <span className="text-[11px] text-text-muted">On-demand export</span>
      </div>

      <div className="p-5">
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Export your complete financial records, personal ledgers, and group splits anytime for personal backup or tax filing.
        </p>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CSV Export Card */}
          <button
            type="button"
            onClick={onExportCSV}
            disabled={isExportingCSV}
            className="p-4 rounded-2xl border border-border-base hover:border-emerald-500/50 bg-bg-subtle/40 hover:bg-emerald-500/5 text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <Download className="w-4 h-4 text-text-muted group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="text-xs font-bold text-text-base mb-0.5">
              {isExportingCSV ? 'Preparing CSV...' : 'Export CSV'}
            </div>
            <div className="text-[11px] text-text-muted">
              Excel & Google Sheets compatible
            </div>
          </button>

          {/* JSON Backup Card */}
          <button
            type="button"
            onClick={onExportJSON}
            disabled={isExportingJSON}
            className="p-4 rounded-2xl border border-border-base hover:border-primary-500/50 bg-bg-subtle/40 hover:bg-primary-500/5 text-left transition-all group cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <Download className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" />
            </div>
            <div className="text-xs font-bold text-text-base mb-0.5">
              {isExportingJSON ? 'Compiling JSON...' : 'JSON Backup'}
            </div>
            <div className="text-[11px] text-text-muted">
              Full lossless ledger dump
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
