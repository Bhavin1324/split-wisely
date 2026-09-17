import { useState, useMemo } from 'react';
import { Card, Button, message } from 'antd';
import { Smartphone } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MOCK_CURRENT_USER, MOCK_EXPENSES, MOCK_SETTLEMENTS } from '../lib/mockData';
import { CurrencyAdapter } from '../adapters/CurrencyAdapter';
import { ExportAdapter } from '../adapters/ExportAdapter';
import { getStoredCurrency, setStoredCurrency } from '../utils/currency';
import { generateReceiveQrUri, downloadQrCode } from '../utils/upi';
import { copyFromInput, shareText } from '../utils/clipboard';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../hooks/supabase/useMutations';
import { useTheme } from '../context/ThemeContext';
import { AvatarPickerModal } from '../components/settings/AvatarPickerModal';
import { PushNotificationsCard } from '../components/settings/PushNotificationsCard';
import { PairCompanionModal } from '../components/settings/PairCompanionModal';
import { SettingsProfileCard } from '../components/settings/SettingsProfileCard';
import { SettingsPreferencesCard } from '../components/settings/SettingsPreferencesCard';
import { SettingsExportCard } from '../components/settings/SettingsExportCard';
import { queryKeys } from '../lib/queryKeys';
import { supabase } from '../lib/supabase';
import type { Expense } from '../types';

export function SettingsPage() {
  const { currentUser: contextUser, refetchData } = useAppData();
  const currentUser = contextUser ?? MOCK_CURRENT_USER;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currency, setCurrency] = useState(getStoredCurrency());
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isPairCompanionOpen, setIsPairCompanionOpen] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSaveAvatar = async (newAvatarUrl: string | null) => {
    if (DEMO_MODE) {
      currentUser.avatar_url = newAvatarUrl;
      messageApi.success('Profile avatar updated in Demo Mode');
      return;
    }
    if (user?.id) {
      await updateProfile(user.id, { avatar_url: newAvatarUrl || '' });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(user.id) });
      if (refetchData) await refetchData();
    }
  };

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
      } catch {
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
      } catch {
        messageApi.error(`Failed to update default currency`);
      }
    }
  };

  // Lazy on-demand expense fetcher for export actions only
  const getExpensesForExport = async (): Promise<Expense[]> => {
    if (DEMO_MODE) return MOCK_EXPENSES;
    if (!user?.id) return [];

    // 1. Return from TanStack Query cache if available
    const cached = queryClient.getQueryData<Expense[]>(queryKeys.expenses.byUser(user.id));
    if (cached && cached.length > 0) {
      return cached;
    }

    // 2. Fetch on-demand only when export is explicitly triggered
    const { data: members, error: memberErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberErr) throw memberErr;
    const groupIds = (members || []).map((m) => m.group_id).filter(Boolean);
    if (groupIds.length === 0) return [];

    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:profiles!payer_id(id, full_name, avatar_url), category:categories(*), splits:expense_splits(*, user:profiles(id, full_name, avatar_url))')
      .in('group_id', groupIds)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Expense[];
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const expenses = await getExpensesForExport();
      const csvData = expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.total_amount / 100,
        currency: exp.currency_code,
        payer: exp.payer?.full_name ?? exp.payer_id,
        category: exp.category?.name ?? 'Uncategorized',
        date: exp.created_at,
      }));
      ExportAdapter.exportToCSV(csvData, 'centfolio-expenses.csv');
      messageApi.success('Expenses exported as CSV');
    } catch {
      messageApi.error('Failed to export expenses as CSV');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const expenses = await getExpensesForExport();
      const mappedExpenses = expenses.map((exp) => ({
        ...exp,
        total_amount: exp.total_amount / 100,
        base_currency_amount: exp.base_currency_amount ? exp.base_currency_amount / 100 : exp.base_currency_amount,
        splits: exp.splits?.map((split) => ({
          ...split,
          amount_owed: split.amount_owed / 100,
        })),
      }));

      const mappedSettlements = (DEMO_MODE ? MOCK_SETTLEMENTS : []).map((settlement) => ({
        ...settlement,
        amount: settlement.amount / 100,
      }));

      const backupData = {
        exportedAt: new Date().toISOString(),
        user: currentUser,
        expenses: mappedExpenses,
        settlements: mappedSettlements,
      };
      ExportAdapter.exportToJSON(backupData, 'centfolio-backup.json');
      messageApi.success('Full backup exported as JSON');
    } catch {
      messageApi.error('Failed to export JSON backup');
    } finally {
      setIsExportingJSON(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="flex flex-col gap-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-text-base">Settings</h1>

        {/* Profile & UPI Section */}
        <SettingsProfileCard
          currentUser={currentUser}
          onEditPhoto={() => setIsAvatarPickerOpen(true)}
          upiId={upiId}
          onChangeUpiId={setUpiId}
          onSaveUpi={handleSaveUpi}
          isSavingUpi={isSavingUpi}
          receiveQrUri={receiveQrUri}
          onCopyUpi={handleCopyUpi}
          copiedUpi={copiedUpi}
          onShareUpi={handleShareUpi}
          onDownloadQr={handleDownloadQr}
        />

        {/* Preferences Section (Currency & Theme) */}
        <SettingsPreferencesCard
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          supportedCurrencies={supportedCurrencies}
          theme={theme}
          onThemeChange={setTheme}
          scheme={scheme}
          onSchemeChange={setScheme}
        />

        {/* Push Notifications Section */}
        <PushNotificationsCard />

        {/* Centfolio SMS Sync Companion Section */}
        <Card className="rounded-2xl border-border-base shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Smartphone className="w-5 h-5 text-primary-500 flex-shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-text-base mb-0">Centfolio SMS Sync (Android)</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Automatically sync banking debit/credit SMS to your ledger with on-device privacy.
                </p>
              </div>
            </div>
            <Button
              type="primary"
              onClick={() => setIsPairCompanionOpen(true)}
              className="rounded-xl font-bold bg-primary-500 hover:bg-primary-600 border-none shadow-xs"
            >
              Pair Companion App
            </Button>
          </div>
        </Card>

        {/* Export Section */}
        <SettingsExportCard
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          isExportingCSV={isExportingCSV}
          isExportingJSON={isExportingJSON}
        />
      </div>

      {isAvatarPickerOpen && (
        <AvatarPickerModal
          open={isAvatarPickerOpen}
          onClose={() => setIsAvatarPickerOpen(false)}
          currentUser={currentUser}
          onSave={handleSaveAvatar}
        />
      )}

      {isPairCompanionOpen && (
        <PairCompanionModal
          open={isPairCompanionOpen}
          onClose={() => setIsPairCompanionOpen(false)}
        />
      )}
    </>
  );
}
