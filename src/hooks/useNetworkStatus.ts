import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  isChecking: boolean;
  checkConnectivity: () => Promise<boolean>;
}

/**
 * Hook to monitor internet connectivity in real-time.
 * Tracks browser online/offline events and provides a lightweight verification ping.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    setIsChecking(true);
    try {
      // Fast cache-busted head request to verify true internet throughput
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      await fetch(`/favicon.ico?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsOnline(true);
      return true;
    } catch {
      // Fallback: If local fetch fails, check browser navigator
      const onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : false;
      setIsOnline(onlineStatus);
      return onlineStatus;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    isChecking,
    checkConnectivity,
  };
}
