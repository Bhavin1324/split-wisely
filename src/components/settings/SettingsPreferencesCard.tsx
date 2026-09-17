import { Select, Switch } from 'antd';
import { Palette, Sun, Moon, Check, Coins } from 'lucide-react';
import type { ThemeType } from '../../context/ThemeContext';

interface SettingsPreferencesCardProps {
  currency: string;
  onCurrencyChange: (val: string) => void;
  supportedCurrencies: string[];
  theme: ThemeType;
  onThemeChange: (val: ThemeType) => void;
  scheme: 'light' | 'dark';
  onSchemeChange: (val: 'light' | 'dark') => void;
}

interface ThemeOption {
  id: ThemeType;
  name: string;
  colorClass: string;
  ringClass: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'green', name: 'Emerald Green', colorClass: 'bg-emerald-500', ringClass: 'ring-emerald-500' },
  { id: 'blue', name: 'Ocean Blue', colorClass: 'bg-blue-500', ringClass: 'ring-blue-500' },
  { id: 'purple', name: 'Amethyst Purple', colorClass: 'bg-purple-500', ringClass: 'ring-purple-500' },
  { id: 'rose', name: 'Ruby Rose', colorClass: 'bg-rose-500', ringClass: 'ring-rose-500' },
  { id: 'orange', name: 'Sunset Orange', colorClass: 'bg-orange-500', ringClass: 'ring-orange-500' },
  { id: 'teal', name: 'Modern Teal', colorClass: 'bg-teal-500', ringClass: 'ring-teal-500' },
];

export function SettingsPreferencesCard({
  currency,
  onCurrencyChange,
  supportedCurrencies,
  theme,
  onThemeChange,
  scheme,
  onSchemeChange,
}: SettingsPreferencesCardProps) {
  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <div className="rounded-3xl bg-bg-surface border border-border-base shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-3.5 bg-bg-subtle/60 border-b border-border-subtle text-xs font-bold text-text-muted uppercase tracking-wider">
        Appearance & Defaults
      </div>

      <div className="divide-y divide-border-subtle">
        {/* Default Currency */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
              <Coins className="w-4 h-4 text-primary-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-base">Default Currency</div>
              <div className="text-xs text-text-muted">Applies to active display & new expenses</div>
            </div>
          </div>
          <Select
            value={currency}
            onChange={onCurrencyChange}
            className="w-44 rounded-xl"
            options={supportedCurrencies.map((code) => ({
              value: code,
              label: `${code} (${code === 'INR' ? '₹ Rupees' : code === 'USD' ? '$ Dollars' : code === 'EUR' ? '€ Euros' : '£ Pounds'})`,
            }))}
          />
        </div>

        {/* Accent Theme Swatches */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
                <Palette className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-base">Accent Theme</div>
                <div className="text-xs text-text-muted">Personalize the primary color palette</div>
              </div>
            </div>
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
              {currentThemeObj.name}
            </span>
          </div>

          {/* Interactive Swatches Grid */}
          <div className="grid grid-cols-6 gap-2.5 pt-1">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onThemeChange(opt.id)}
                  className={`h-9 rounded-xl ${opt.colorClass} flex items-center justify-center text-white transition-all shadow-xs cursor-pointer ${
                    isSelected
                      ? `ring-2 ${opt.ringClass} ring-offset-2 ring-offset-bg-surface scale-105`
                      : 'hover:opacity-90 hover:scale-102'
                  }`}
                  title={opt.name}
                  aria-label={`Select ${opt.name} theme`}
                >
                  {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dark Mode Scheme */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-bg-subtle border border-border-subtle flex items-center justify-center text-text-muted shrink-0">
              {scheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-text-base">Dark Mode</div>
              <div className="text-xs text-text-muted">High contrast dark scheme</div>
            </div>
          </div>
          <Switch
            checked={scheme === 'dark'}
            onChange={(checked: boolean) => onSchemeChange(checked ? 'dark' : 'light')}
            checkedChildren={<Moon className="w-3 h-3 text-white inline" />}
            unCheckedChildren={<Sun className="w-3 h-3 text-amber-400 inline" />}
            className="bg-border-base"
          />
        </div>
      </div>
    </div>
  );
}
