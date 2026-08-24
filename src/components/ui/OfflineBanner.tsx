import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineBannerProps {
  onReconnect?: () => void;
}

export function OfflineBanner({ onReconnect }: OfflineBannerProps) {
  const { isOnline, wasOffline, isChecking, checkConnectivity } = useNetworkStatus();
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnectedToast(true);
      onReconnect?.();
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, onReconnect]);

  if (isOnline && !showReconnectedToast) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 transform translate-y-0"
    >
      {!isOnline ? (
        <div className="bg-amber-600/95 dark:bg-amber-900/95 text-white backdrop-blur-md px-4 py-2.5 shadow-lg border-b border-amber-500/30 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-white/20 shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold mr-1.5">You're offline.</span>
              <span className="hidden sm:inline text-amber-100 text-xs">
                Please check your internet connection to sync expenses and balances.
              </span>
              <span className="sm:hidden text-amber-100 text-xs">
                Check connection to sync data.
              </span>
            </div>
          </div>

          <Button
            size="small"
            type="text"
            loading={isChecking}
            icon={!isChecking ? <RefreshCw className="w-3.5 h-3.5" /> : undefined}
            onClick={() => checkConnectivity()}
            className="text-white hover:text-white bg-white/20 hover:bg-white/30 border-0 rounded-lg text-xs font-semibold px-2.5 shrink-0"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="bg-emerald-600/95 dark:bg-emerald-800/95 text-white backdrop-blur-md px-4 py-2 shadow-lg border-b border-emerald-500/30 flex items-center justify-center gap-2 text-xs font-semibold animate-fadeIn">
          <Wifi className="w-4 h-4" />
          <span>Back online! Syncing latest data...</span>
        </div>
      )}
    </div>
  );
}
