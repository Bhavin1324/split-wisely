import { BookOpen, Users, Archive, Download, Shield, Loader2 } from 'lucide-react';

interface SettingsExportCardProps {
  onExportPersonalCSV: () => void;
  onExportGroupSplitsCSV: () => void;
  onExportArchiveJSON: () => void;
  isExportingPersonal: boolean;
  isExportingGroupSplits: boolean;
  isExportingArchive: boolean;
}

interface ExportButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  isLoading: boolean;
  loadingLabel: string;
  onClick: () => void;
  accentClass: string;
  iconBgClass: string;
}

function ExportButton({
  icon,
  label,
  description,
  isLoading,
  loadingLabel,
  onClick,
  accentClass,
  iconBgClass,
}: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`
        p-4 rounded-2xl border border-border-base text-left transition-all duration-150 group
        cursor-pointer shadow-xs bg-bg-subtle/40
        hover:border-[color:var(--hover-border)] hover:bg-[color:var(--hover-bg)]
        active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-[color:var(--hover-border)]/50
        disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
        ${accentClass}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBgClass}`}>
          {icon}
        </div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
        ) : (
          <Download className="w-4 h-4 text-text-muted group-hover:text-[color:var(--hover-icon)] transition-colors duration-150" />
        )}
      </div>
      <div className="text-xs font-bold text-text-base mb-0.5">
        {isLoading ? loadingLabel : label}
      </div>
      <div className="text-[11px] text-text-muted leading-relaxed">{description}</div>
    </button>
  );
}

export function SettingsExportCard({
  onExportPersonalCSV,
  onExportGroupSplitsCSV,
  onExportArchiveJSON,
  isExportingPersonal,
  isExportingGroupSplits,
  isExportingArchive,
}: SettingsExportCardProps) {
  return (
    <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary-500" />
          Data Exports
        </span>
        <span className="text-[11px] text-text-muted">On-demand export</span>
      </div>

      <div className="p-5">
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Export your financial records for budgeting, tax filing, or personal backup. Each format
          is purpose-built so you get exactly what you need.
        </p>

        {/* 2-Column Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Personal Ledger CSV */}
          <ExportButton
            icon={
              <BookOpen
                className="w-4 h-4"
                style={{ color: 'var(--color-success-500)' }}
              />
            }
            label="Personal Ledger CSV"
            description="Income & expenses by date, category & flow — ideal for tax filing & budgeting"
            isLoading={isExportingPersonal}
            loadingLabel="Preparing Ledger..."
            onClick={onExportPersonalCSV}
            accentClass="[--hover-border:var(--color-success-500)] [--hover-bg:color-mix(in_srgb,var(--color-success-500)_6%,transparent)] [--hover-icon:var(--color-success-500)]"
            iconBgClass="bg-success-500/10"
          />

          {/* Group Splits & Settlements CSV */}
          <ExportButton
            icon={
              <Users
                className="w-4 h-4"
                style={{ color: 'var(--color-primary-500)' }}
              />
            }
            label="Group Splits CSV"
            description="Shared expenses with your share, group name & all UPI settlements in two labeled sections"
            isLoading={isExportingGroupSplits}
            loadingLabel="Compiling Splits..."
            onClick={onExportGroupSplitsCSV}
            accentClass="[--hover-border:var(--color-primary-500)] [--hover-bg:color-mix(in_srgb,var(--color-primary-500)_6%,transparent)] [--hover-icon:var(--color-primary-500)]"
            iconBgClass="bg-primary-500/10"
          />
        </div>

        {/* Full-Width Archive Row */}
        <button
          type="button"
          onClick={onExportArchiveJSON}
          disabled={isExportingArchive}
          className="
            w-full p-4 rounded-2xl border border-border-base text-left transition-all duration-150 group
            cursor-pointer shadow-xs bg-bg-subtle/40
            hover:border-warning-500/60 hover:bg-warning-500/5
            active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-warning-500/40
            disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
          "
        >
          <div className="flex items-start justify-between gap-3">
            <div className="md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-warning-500/10 flex items-center justify-center flex-shrink-0 mb-2 md:mb-0">
                <Archive
                  className="w-4 h-4"
                  style={{ color: 'var(--color-warning-500)' }}
                />
              </div>
              <div>
                <div className="text-xs font-bold text-text-base mb-0.5">
                  {isExportingArchive ? 'Building Archive...' : 'Complete Archive JSON'}
                </div>
                <div className="text-[11px] text-text-muted leading-relaxed">
                  Full backup: groups, shared expenses with splits, all settlements & personal
                  ledger — amounts in currency units, not raw paise
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {isExportingArchive ? (
                <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-text-muted group-hover:text-warning-500 transition-colors duration-150" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
