import { useState, useMemo, useEffect, useRef } from 'react';
import { message, Modal } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { MOCK_CURRENT_USER } from '../lib/mockData';
import { CurrencyAdapter } from '../adapters/CurrencyAdapter';
import { getStoredCurrency, setStoredCurrency } from '../utils/currency';
import { generateReceiveQrUri, downloadQrCode, sanitizeVpa } from '../utils/upi';
import { copyFromInput, shareText } from '../utils/clipboard';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../hooks/supabase/useMutations';
import { useTheme } from '../context/ThemeContext';
import { useSettingsExport } from '../hooks/useSettingsExport';
import { AvatarPickerModal } from '../components/settings/AvatarPickerModal';
import { PushNotificationsCard } from '../components/settings/PushNotificationsCard';
import { PairCompanionModal } from '../components/settings/PairCompanionModal';
import { SettingsProfileCard } from '../components/settings/SettingsProfileCard';
import { SettingsInstallCard } from '../components/settings/SettingsInstallCard';
import { SettingsPreferencesCard } from '../components/settings/SettingsPreferencesCard';
import { SettingsCompanionCard } from '../components/settings/SettingsCompanionCard';
import { SettingsExportCard } from '../components/settings/SettingsExportCard';
import { queryKeys } from '../lib/queryKeys';

export function SettingsPage() {
  const { currentUser: contextUser, refetchData } = useAppData();
  const currentUser = contextUser ?? MOCK_CURRENT_USER;
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [currency, setCurrency] = useState(getStoredCurrency());
  const [upiId, setUpiId] = useState(currentUser.upi_id || '');
  const isDirtyUpiRef = useRef(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isPairCompanionOpen, setIsPairCompanionOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const {
    isExportingCSV,
    isExportingJSON,
    handleExportCSV,
    handleExportJSON,
  } = useSettingsExport({ user, queryClient, messageApi });

  // Preload and synchronize upiId from profile when loaded or updated
  useEffect(() => {
    if (!isDirtyUpiRef.current && currentUser?.upi_id !== undefined) {
      setUpiId(currentUser.upi_id || '');
    }
  }, [currentUser?.id, currentUser?.upi_id]);

  const handleUpiChange = (value: string) => {
    isDirtyUpiRef.current = true;
    setUpiId(value);
  };

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

  const effectiveUpiId = upiId || currentUser.upi_id || '';
  const receiveQrUri = useMemo(() => {
    if (!effectiveUpiId) return null;
    return generateReceiveQrUri(effectiveUpiId, currentUser.full_name);
  }, [effectiveUpiId, currentUser.full_name]);

  const handleCopyUpi = () => {
    if (!effectiveUpiId) return;
    const success = copyFromInput(null, effectiveUpiId);
    if (success) {
      setCopiedUpi(true);
      messageApi.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      messageApi.error('Failed to copy UPI ID. Please copy it manually.');
    }
  };

  const handleShareUpi = async () => {
    if (!effectiveUpiId) return;
    const shared = await shareText(effectiveUpiId, `Pay ${currentUser.full_name} via UPI`);
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
    const cleanUpi = sanitizeVpa(upiId);
    if (DEMO_MODE) {
      currentUser.upi_id = cleanUpi;
      setUpiId(cleanUpi);
      isDirtyUpiRef.current = false;
      messageApi.success('UPI ID updated in Demo Mode');
      return;
    }
    if (user?.id) {
      setIsSavingUpi(true);
      try {
        await updateProfile(user.id, { upi_id: cleanUpi });
        setUpiId(cleanUpi);
        isDirtyUpiRef.current = false;
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail(user.id) });
        if (refetchData) await refetchData();
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

  return (
    <>
      {contextHolder}
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full pb-10">
        {/* Header with Active Indicator */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-base mb-0">Settings</h1>
            <p className="text-xs text-text-muted mt-0.5 mb-0">Preferences, account & payment terminal</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        {/* 1. Profile & UPI Inset Card */}
        <SettingsProfileCard
          currentUser={currentUser}
          onEditPhoto={() => setIsAvatarPickerOpen(true)}
          upiId={upiId}
          onChangeUpiId={handleUpiChange}
          onSaveUpi={handleSaveUpi}
          isSavingUpi={isSavingUpi}
          receiveQrUri={receiveQrUri}
          onCopyUpi={handleCopyUpi}
          copiedUpi={copiedUpi}
          onShareUpi={handleShareUpi}
          onDownloadQr={handleDownloadQr}
        />

        {/* 2. Web-Only Install Centfolio App Card */}
        <SettingsInstallCard />

        {/* 3. Appearance & Preferences Card */}
        <SettingsPreferencesCard
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          supportedCurrencies={supportedCurrencies}
          theme={theme}
          onThemeChange={setTheme}
          scheme={scheme}
          onSchemeChange={setScheme}
        />

        {/* 4. Push Notifications Card */}
        <PushNotificationsCard />

        {/* 5. Centfolio SMS Sync Companion Inset Section */}
        <SettingsCompanionCard onPairClick={() => setIsPairCompanionOpen(true)} />

        {/* 6. Export Section */}
        <SettingsExportCard
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          isExportingCSV={isExportingCSV}
          isExportingJSON={isExportingJSON}
        />

        {/* 7. Footer & System Status */}
        <div className="pt-3 pb-6 text-center space-y-1.5">
          <p className="text-xs font-semibold text-text-muted mb-0">Centfolio • Smart Expense Splitting</p>
          <p className="text-[11px] text-text-muted opacity-80 mb-0">v1.2.0 • Offline First PWA • End-to-End SSL</p>
          {user && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  Modal.confirm({
                    title: 'Sign Out',
                    content: 'Are you sure you want to sign out of Centfolio on this device?',
                    okText: 'Sign Out',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: async () => {
                      if (signOut) await signOut();
                    },
                  });
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Sign Out of Account
              </button>
            </div>
          )}
        </div>
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
