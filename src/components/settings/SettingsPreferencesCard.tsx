import { Card, Divider, Select, Switch } from 'antd';
import { Globe, Palette } from 'lucide-react';
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

export function SettingsPreferencesCard({
  currency,
  onCurrencyChange,
  supportedCurrencies,
  theme,
  onThemeChange,
  scheme,
  onSchemeChange,
}: SettingsPreferencesCardProps) {
  return (
    <>
      {/* Currency Section */}
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="flex items-center gap-4">
          <Globe className="w-5 h-5 text-text-muted flex-shrink-0" />
          <h2 className="text-base font-semibold text-text-base">Default Currency</h2>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <Select
            value={currency}
            onChange={onCurrencyChange}
            className="w-48"
            options={supportedCurrencies.map((code) => ({
              value: code,
              label: `${code} (${code === 'INR' ? '₹ Rupees' : code === 'USD' ? '$ Dollars' : code === 'EUR' ? '€ Euros' : '£ Pounds'})`,
            }))}
          />
          <span className="text-sm text-text-muted">
            Changes your active display symbol & new expense defaults
          </span>
        </div>
      </Card>

      {/* Theme Section */}
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="flex items-center gap-4">
          <Palette className="w-5 h-5 text-text-muted flex-shrink-0" />
          <h2 className="text-base font-semibold text-text-base">Application Theme</h2>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <Select
            value={theme}
            onChange={(value) => onThemeChange(value as ThemeType)}
            className="w-48"
            options={[
              { value: 'green', label: 'Emerald Green (Default)' },
              { value: 'blue', label: 'Ocean Blue' },
              { value: 'purple', label: 'Amethyst Purple' },
              { value: 'rose', label: 'Ruby Rose' },
              { value: 'orange', label: 'Sunset Orange' },
              { value: 'teal', label: 'Modern Teal' },
            ]}
          />
          <span className="text-sm text-text-muted hidden sm:inline">
            Customize the primary color
          </span>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-text-base">Dark Mode</span>
          <Switch 
            checked={scheme === 'dark'} 
            onChange={(checked: boolean) => onSchemeChange(checked ? 'dark' : 'light')} 
          />
          <span className="text-sm text-text-muted hidden sm:inline">
            Customize the look and feel of the application.
          </span>
        </div>
      </Card>
    </>
  );
}
