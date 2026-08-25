import { useState, useEffect, useCallback } from 'react';

const DISMISS_STORAGE_KEY = 'centfolio_pwa_install_dismissed';
const DISMISS_DURATION_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface UsePwaInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showPrompt: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  openInstallGuide: () => void;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
  });
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  // Check if previously dismissed within DISMISS_DURATION_DAYS
  const isDismissed = useCallback(() => {
    if (typeof window === 'undefined') return true;
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!dismissedAt) return false;
    const timestamp = parseInt(dismissedAt, 10);
    if (isNaN(timestamp)) return false;
    const elapsedDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return elapsedDays < DISMISS_DURATION_DAYS;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone matchMedia changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setShowPrompt(false);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Capture beforeinstallprompt on Chromium (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);

      if (!isInstalled && !isDismissed()) {
        setShowPrompt(true);
      }
    };

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS Safari (which doesn't fire beforeinstallprompt), show prompt on first visit if not installed
    if (isIOS && !isInstalled && !isDismissed()) {
      setShowPrompt(true);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed, isIOS, isInstalled]);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA Install prompt error:', err);
      return false;
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
  };

  const openInstallGuide = () => {
    setShowPrompt(true);
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showPrompt,
    promptInstall,
    dismissPrompt,
    openInstallGuide,
  };
}
