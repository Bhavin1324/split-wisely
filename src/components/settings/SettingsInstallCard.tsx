import { useState } from 'react';
import { Button, Modal } from 'antd';
import { Download, Share, PlusSquare, Sparkles, MoreVertical, Zap, Bell } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { APP_ASSETS } from '../../constants/assets';

export function SettingsInstallCard() {
  const { isInstalled, isIOS, isInstallable, promptInstall } = usePwaInstall();
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // When running as standalone installed PWA, do not show install card
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setIsGuideModalOpen(true);
      return;
    }

    const hasPrompt = isInstallable || (typeof window !== 'undefined' && Boolean((window as any).__deferredPrompt));
    if (hasPrompt) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } catch (err) {
        console.warn('Install error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setIsGuideModalOpen(true);
    }
  };

  return (
    <>
      <div className="rounded-3xl p-5 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/30 dark:border-primary-500/20 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <img
            src={APP_ASSETS.pwa.icon192}
            alt="Centfolio"
            className="w-12 h-12 rounded-2xl object-cover shadow-sm shrink-0 border border-primary-500/20"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-base mb-0">Install Centfolio App</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-500/20 text-primary-600 dark:text-primary-400">
                PWA
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 mb-2 leading-relaxed">
              Add to your home screen for instant alerts, fast loading, and offline access.
            </p>

            {/* Feature Badges */}
            <div className="flex items-center gap-3 text-[11px] text-text-muted mb-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Fast & lightweight (0.5MB)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3 text-primary-500" /> Push alerts
              </span>
            </div>

            {/* Action */}
            <Button
              type="primary"
              size="small"
              icon={isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              loading={isInstalling}
              onClick={handleInstallClick}
              className="bg-primary-500 hover:bg-primary-600 font-bold text-xs rounded-xl shadow-xs"
            >
              {isIOS ? 'How to Install' : 'Install App'}
            </Button>
          </div>
        </div>
      </div>

      {/* Guide Modal for iOS Safari / Unsupported Browsers */}
      <Modal
        open={isGuideModalOpen}
        onCancel={() => setIsGuideModalOpen(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setIsGuideModalOpen(false)}
            className="bg-primary-500 font-semibold rounded-lg w-full"
          >
            Got it
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <span className="font-bold text-base">
              {isIOS ? 'Install on iPhone / iPad' : 'Install Centfolio App'}
            </span>
          </div>
        }
        centered
        className="rounded-2xl"
      >
        <div className="space-y-4 py-2 text-sm text-text-base">
          <p className="text-text-muted text-xs">
            {isIOS
              ? 'To install Centfolio on iOS, follow these quick steps in Safari:'
              : 'To install Centfolio on your device, follow these quick steps in your browser:'}
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 shrink-0 font-bold text-xs">
                1
              </div>
              <div className="text-xs">
                <span className="font-semibold text-text-base">
                  {isIOS ? 'Tap the Share button' : 'Tap the browser menu'}
                </span>
                <p className="text-text-muted mt-0.5 mb-0">
                  {isIOS ? (
                    <>
                      Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> Share icon at the bottom of Safari's toolbar.
                    </>
                  ) : (
                    <>
                      Tap the <MoreVertical className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> 3-dots menu in Chrome's top right toolbar.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 shrink-0 font-bold text-xs">
                2
              </div>
              <div className="text-xs">
                <span className="font-semibold text-text-base">
                  {isIOS ? 'Select "Add to Home Screen"' : 'Select "Install app"'}
                </span>
                <p className="text-text-muted mt-0.5 mb-0">
                  {isIOS ? (
                    <>
                      Scroll down the share sheet and tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                    </>
                  ) : (
                    <>
                      Tap <Download className="w-3.5 h-3.5 inline mx-0.5 text-primary-500" /> <strong>Install Centfolio</strong> (or <strong>Add to Home screen</strong>) to add the app to your device.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
