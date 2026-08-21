import { useState, useMemo } from 'react';
import { Card, Button, Select, Avatar, Divider, message, Input, Switch, QRCode } from 'antd';
import { Download, User, Globe, Palette, QrCode, Copy, Check, ShieldCheck, Share2 } from 'lucide-react';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS } from '../lib/mockData';
import { CurrencyAdapter } from '../adapters/CurrencyAdapter';
import { ExportAdapter } from '../adapters/ExportAdapter';
import { getStoredCurrency, setStoredCurrency } from '../utils/currency';
import { generateReceiveQrUri, downloadQrCode } from '../utils/upi';
import { copyFromInput, canShare, shareText } from '../utils/clipboard';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { updateProfile } from '../hooks/supabase/useMutations';
import { useTheme } from '../context/ThemeContext';
import type { ThemeType } from '../context/ThemeContext';

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
  const { currentUser: contextUser } = useAppData();
  const currentUser = contextUser ?? MOCK_CURRENT_USER;
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const receiveQrUri = useMemo(() => {
    if (!currentUser.upi_id) return null;
    return generateReceiveQrUri(currentUser.upi_id, currentUser.full_name);
  }, [currentUser.upi_id, currentUser.full_name]);

  const handleCopyUpi = () => {
    if (!currentUser.upi_id) return;
    const success = copyFromInput(null, currentUser.upi_id);
    if (success) {
      setCopiedUpi(true);
      messageApi.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      messageApi.error('Failed to copy UPI ID. Please copy it manually.');
    }
  };

  const handleShareUpi = async () => {
    if (!currentUser.upi_id) return;
    const shared = await shareText(currentUser.upi_id, `Pay ${currentUser.full_name} via UPI`);
    if (shared) {
      messageApi.success('UPI ID shared!');
    }
  };

  const handleDownloadQr = () => {
    const success = downloadQrCode('settings-personal-qr-container', `${currentUser.full_name.toLowerCase().replace(/\s+/g, '-')}-upi-qr.png`);
    if (success) {
      messageApi.success('QR Code image downloaded!');
    } else {
      messageApi.error('Failed to download QR code image.');
    }
  };

  const { theme, setTheme, scheme, setScheme } = useTheme();

  const { user } = useAuth();
  const { data: liveExpenses } = useAllExpenses(user?.id);

  const expenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? []);

  const supportedCurrencies = CurrencyAdapter.getSupportedCurrencies();

  const handleSaveUpi = async () => {
    if (DEMO_MODE) {
      currentUser.upi_id = upiId;
      messageApi.success('UPI ID updated in Demo Mode');
      return;
    }
    if (user?.id) {
      setIsSavingUpi(true);
      try {
        await updateProfile(user.id, { upi_id: upiId });
        messageApi.success('UPI ID updated successfully');
      } catch (e) {
        messageApi.error('Failed to update UPI ID');
      } finally {
        setIsSavingUpi(false);
      }
    }
  };

  const handleCurrencyChange = async (value: string) => {
    setCurrency(value);
    setStoredCurrency(value);
    
    if (DEMO_MODE) {
      MOCK_CURRENT_USER.default_currency = value;
      messageApi.success(`Default currency updated to ${value}. All balances will now format in ${value}!`);
    } else if (user?.id) {
      try {
        await updateProfile(user.id, { default_currency: value });
        messageApi.success(`Default currency updated to ${value}. All balances will now format in ${value}!`);
      } catch (e) {
        messageApi.error(`Failed to update default currency`);
      }
    }
  };

  const handleExportCSV = () => {
    const csvData = expenses.map((exp) => ({
      id: exp.id,
      description: exp.description,
      amount: exp.total_amount / 100,
      currency: exp.currency_code,
      payer: exp.payer?.full_name ?? exp.payer_id,
      category: exp.category?.name ?? 'Uncategorized',
      date: exp.created_at,
    }));
    ExportAdapter.exportToCSV(csvData, 'splitwisely-expenses.csv');
    messageApi.success('Expenses exported as CSV');
  };

  const handleExportJSON = () => {
    const mappedExpenses = expenses.map(exp => ({
      ...exp,
      total_amount: exp.total_amount / 100,
      base_currency_amount: exp.base_currency_amount ? exp.base_currency_amount / 100 : exp.base_currency_amount,
      splits: exp.splits?.map(split => ({
        ...split,
        amount_owed: split.amount_owed / 100
      }))
    }));

    const mappedSettlements = (DEMO_MODE ? MOCK_SETTLEMENTS : []).map(settlement => ({
      ...settlement,
      amount: settlement.amount / 100
    }));

    const backupData = {
      exportedAt: new Date().toISOString(),
      user: currentUser,
      expenses: mappedExpenses,
      settlements: mappedSettlements,
    };
    ExportAdapter.exportToJSON(backupData, 'splitwisely-backup.json');
    messageApi.success('Full backup exported as JSON');
  };

  return (
    <>
      {contextHolder}
      <div className="flex flex-col gap-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-text-base">Settings</h1>

      {/* Profile Section */}
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="flex items-center gap-4">
          <User className="w-5 h-5 text-text-muted flex-shrink-0" />
          <h2 className="text-base font-semibold text-text-base">Profile</h2>
        </div>
        <Divider className="my-4" />
        <div className="flex items-center gap-4">
          <Avatar
            size={64}
            style={{ backgroundColor: 'var(--color-primary-500)', fontSize: '1.5rem' }}
          >
            {getInitials(currentUser.full_name)}
          </Avatar>
          <div>
            <p className="text-lg font-medium text-text-base">
              {currentUser.full_name}
            </p>
            <p className="text-sm text-text-muted">
              Member since {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        
        <Divider className="my-4" />
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-semibold text-text-base">UPI ID for receiving payments</label>
            <div className="flex items-center gap-3 mt-1.5">
              <Input 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
                placeholder="e.g. username@okaxis" 
                className="max-w-xs"
              />
              <Button type="primary" onClick={handleSaveUpi} loading={isSavingUpi} className="bg-primary-500 rounded-lg border-none hover:bg-primary-600 font-medium">
                Save
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1">Friends can pay you directly via any UPI app using this ID.</p>
          </div>

          {currentUser.upi_id && receiveQrUri && (
            <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle flex flex-col sm:flex-row items-center gap-5">
              <div
                id="settings-personal-qr-container"
                className="bg-bg-surface p-3 rounded-xl border border-border-subtle shadow-sm shrink-0 inline-flex flex-col items-center justify-center"
              >
                <QRCode
                  value={receiveQrUri}
                  size={140}
                  bordered={false}
                  errorLevel="M"
                />
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 mb-1">
                  <QrCode className="w-4 h-4" />
                  <span>My Receive QR Code</span>
                </div>
                <div className="text-sm font-bold text-text-main mb-0.5">
                  {currentUser.full_name}
                </div>
                <div className="text-xs font-mono text-text-muted truncate max-w-full mb-3">
                  {currentUser.upi_id}
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full">
                  <Button
                    size="small"
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                    icon={copiedUpi ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5 text-primary-500" />}
                  >
                    {copiedUpi ? 'Copied' : 'Copy ID'}
                  </Button>
                  {canShare() && (
                    <Button
                      size="small"
                      onClick={handleShareUpi}
                      className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                      icon={<Share2 className="w-3.5 h-3.5 text-primary-500" />}
                    >
                      Share
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={handleDownloadQr}
                    className="flex items-center gap-1 text-xs rounded-lg border-border-subtle"
                    icon={<Download className="w-3.5 h-3.5 text-primary-500" />}
                  >
                    Download QR
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-2.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-success-500 shrink-0" />
                  <span>Friends can scan this QR code with any UPI app to pay you</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

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
            onChange={handleCurrencyChange}
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
            onChange={(value) => setTheme(value as ThemeType)}
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
            onChange={(checked: boolean) => setScheme(checked ? 'dark' : 'light')} 
          />
          <span className="text-sm text-text-muted hidden sm:inline">
            Customize the look and feel of the application.
          </span>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="flex items-center gap-4">
          <Download className="w-5 h-5 text-text-muted flex-shrink-0" />
          <h2 className="text-base font-semibold text-text-base">Export Data</h2>
        </div>
        <Divider className="my-4" />
        <p className="text-sm text-text-muted mb-4">
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
    </>
  );
}
