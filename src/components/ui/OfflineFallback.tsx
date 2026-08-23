import { useState } from 'react';
import { Button } from 'antd';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineFallbackProps {
  title?: string;
  subTitle?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export function OfflineFallback({
  title = "No Internet Connection",
  subTitle = "SplitWisely requires an active internet connection to securely load your balances and sync group expenses.",
  onRetry,
  showHomeButton = true,
}: OfflineFallbackProps) {
  const { checkConnectivity } = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    const online = await checkConnectivity();
    if (online) {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    }
    setRetrying(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-bg-base">
      <div className="max-w-md w-full text-center p-8 rounded-3xl bg-bg-surface border border-border-base shadow-xl space-y-6">
        {/* Visual Icon Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner">
          <WifiOff className="w-10 h-10 animate-bounce" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-base mb-0 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-0">
            {subTitle}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {showHomeButton && (
            <Button
              icon={<Home className="w-4 h-4" />}
              href="/"
              className="w-full sm:w-auto rounded-xl h-10 text-text-muted border-border-base"
            >
              Back to Home
            </Button>
          )}

          <Button
            type="primary"
            loading={retrying}
            icon={!retrying ? <RefreshCw className="w-4 h-4" /> : undefined}
            onClick={handleRetry}
            className="w-full sm:w-auto rounded-xl h-10 font-semibold bg-primary-500 hover:bg-primary-600 shadow-md shadow-primary-500/20"
          >
            Check Connection & Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
