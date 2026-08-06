import { useState } from 'react';
import { Card, Button, Select, Avatar, Divider, message } from 'antd';
import { Download, User, Globe } from 'lucide-react';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS } from '../lib/mockData';
import { CurrencyAdapter } from '../adapters/CurrencyAdapter';
import { ExportAdapter } from '../adapters/ExportAdapter';
import { getStoredCurrency, setStoredCurrency } from '../utils/currency';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function SettingsPage() {
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [messageApi, contextHolder] = message.useMessage();

  const supportedCurrencies = CurrencyAdapter.getSupportedCurrencies();

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    setStoredCurrency(value);
    MOCK_CURRENT_USER.default_currency = value;
    messageApi.success(`Default currency updated to ${value}. All balances will now format in ${value}!`);
  };

  const handleExportCSV = () => {
    const csvData = MOCK_EXPENSES.map((exp) => ({
      id: exp.id,
      description: exp.description,
      amount_cents: exp.total_amount,
      currency: exp.currency_code,
      payer: exp.payer?.full_name ?? exp.payer_id,
      category: exp.category?.name ?? 'Uncategorized',
      date: exp.created_at,
    }));
    ExportAdapter.exportToCSV(csvData, 'splitwisely-expenses.csv');
    messageApi.success('Expenses exported as CSV');
  };

  const handleExportJSON = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      user: MOCK_CURRENT_USER,
      expenses: MOCK_EXPENSES,
      settlements: MOCK_SETTLEMENTS,
    };
    ExportAdapter.exportToJSON(backupData, 'splitwisely-backup.json');
    messageApi.success('Full backup exported as JSON');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {contextHolder}

      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile Section */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <Avatar
            size={64}
            style={{ backgroundColor: '#10b981', fontSize: '1.5rem' }}
          >
            {getInitials(MOCK_CURRENT_USER.full_name)}
          </Avatar>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {MOCK_CURRENT_USER.full_name}
            </p>
            <p className="text-sm text-gray-500">
              Member since {new Date(MOCK_CURRENT_USER.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Currency Section */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <h2 className="text-base font-semibold text-gray-900">Default Currency</h2>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <Select
            value={currency}
            onChange={handleCurrencyChange}
            className="w-48"
            options={supportedCurrencies.map((code) => ({
              value: code,
              label: `${code} (${code === 'INR' ? '₹ Rupees' : code === 'USD' ? '$ Dollars' : code === 'EUR' ? '€ Euros' : '£ Pounds'})`,
            }))}
          />
          <span className="text-sm text-gray-500">
            Changes your active display symbol & new expense defaults
          </span>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Download className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <h2 className="text-base font-semibold text-gray-900">Export Data</h2>
        </div>
        <Divider className="my-4" />
        <p className="text-sm text-gray-500 mb-4">
          Download your expense data for personal records or backup.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button onClick={handleExportJSON} icon={<Download className="w-4 h-4" />}>
            JSON Backup
          </Button>
        </div>
      </Card>
    </div>
  );
}
