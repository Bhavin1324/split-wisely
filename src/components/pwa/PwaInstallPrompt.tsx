import { useState } from 'react';
import { Button, Modal } from 'antd';
import { Download, X, Share, PlusSquare, Sparkles, Zap, Bell, WifiOff } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export function PwaInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, showPrompt, promptInstall, dismissPrompt } =
    usePwaInstall();
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed in standalone mode, never render prompt
  if (isInstalled || !showPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setIsIosModalOpen(true);
      return;
    }

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Fallback for browsers that don't support programmatic install
      dismissPrompt();
    }
  };

  return (
    <>
      {/* Floating Bottom Banner */}
      <aside aria-label="Install Centfolio App" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-bg-surface/95 backdrop-blur-md border border-primary-500/30 dark:border-primary-500/20 shadow-2xl rounded-2xl p-4 text-text-base relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={dismissPrompt}
            aria-label="Dismiss install banner"
            className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-border-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <img
              src="/pwa-icon.jpg"
              alt="Centfolio"
              className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 border border-border-subtle"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-text-base mb-0">Install Centfolio</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-500/15 text-primary-600 dark:text-primary-400">
                  PWA
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 mb-2 leading-relaxed">
                Add to your home screen for instant alerts, fast loading, and offline access.
              </p>

              {/* Benefit Pills */}
              <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Fast
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Bell className="w-3 h-3 text-primary-500" /> Push Alerts
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-blue-500" /> Offline
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  size="small"
                  icon={isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  loading={isInstalling}
                  onClick={handleInstallClick}
                  className="bg-primary-500 hover:bg-primary-600 font-semibold text-xs rounded-lg shadow-sm"
                >
                  {isIOS ? 'How to Install' : 'Install App'}
                </Button>
                <Button
                  size="small"
                  type="text"
                  onClick={dismissPrompt}
                  className="text-xs text-text-muted hover:text-text-base rounded-lg"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* iOS Safari Install Guide Modal */}
      <Modal
        open={isIosModalOpen}
        onCancel={() => setIsIosModalOpen(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              setIsIosModalOpen(false);
              dismissPrompt();
            }}
            className="bg-primary-500 font-semibold rounded-lg w-full"
          >
            Got it
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <span className="font-bold text-base">Install on iPhone / iPad</span>
          </div>
        }
        centered
        className="rounded-2xl"
      >
        <div className="space-y-4 py-2 text-sm text-text-base">
          <p className="text-text-muted text-xs">
            To install Centfolio on iOS, follow these quick steps in Safari:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 shrink-0 font-bold text-xs">
                1
              </div>
              <div className="text-xs">
                <span className="font-semibold text-text-base">Tap the Share button</span>
                <p className="text-text-muted mt-0.5 mb-0">
                  Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> Share icon at the bottom of Safari's toolbar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 shrink-0 font-bold text-xs">
                2
              </div>
              <div className="text-xs">
                <span className="font-semibold text-text-base">Select "Add to Home Screen"</span>
                <p className="text-text-muted mt-0.5 mb-0">
                  Scroll down the share sheet and tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> in the top right.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
