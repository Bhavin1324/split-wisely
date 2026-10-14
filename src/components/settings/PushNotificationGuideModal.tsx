import { useState, useMemo } from 'react';
import { Modal, Button, Segmented } from 'antd';
import {
  RotateCcw,
  Smartphone,
  Apple,
  Laptop,
  CheckCircle2,
  BellRing,
  Info,
} from 'lucide-react';

interface PushNotificationGuideModalProps {
  open: boolean;
  onClose: () => void;
  checkingPermission: boolean;
  onCheckAndRetry: () => void;
}

type BrandKey = 'xiaomi' | 'samsung' | 'vivo' | 'oppo' | 'ios' | 'browser';

export function PushNotificationGuideModal({
  open,
  onClose,
  checkingPermission,
  onCheckAndRetry,
}: PushNotificationGuideModalProps) {
  // Detect phone brand from userAgent to automatically highlight the right instructions
  const detectedBrand = useMemo<BrandKey>(() => {
    if (typeof navigator === 'undefined') return 'xiaomi';
    const ua = navigator.userAgent.toLowerCase();
    if (
      ua.includes('xiaomi') ||
      ua.includes('redmi') ||
      ua.includes('poco') ||
      ua.includes('miui') ||
      ua.includes('hyperos')
    ) {
      return 'xiaomi';
    }
    if (ua.includes('samsung') || ua.includes('sm-')) {
      return 'samsung';
    }
    if (
      ua.includes('vivo') ||
      ua.includes('iqoo') ||
      ua.includes('v20') ||
      ua.includes('v21') ||
      ua.includes('v22') ||
      ua.includes('v23') ||
      ua.includes('v24')
    ) {
      return 'vivo';
    }
    if (
      ua.includes('oppo') ||
      ua.includes('realme') ||
      ua.includes('oneplus') ||
      ua.includes('cph') ||
      ua.includes('rmx')
    ) {
      return 'oppo';
    }
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return 'ios';
    }
    return 'xiaomi';
  }, []);

  const [activeBrand, setActiveBrand] = useState<BrandKey>(detectedBrand);

  const brandOptions = [
    { label: 'Xiaomi / Redmi', value: 'xiaomi' },
    { label: 'Samsung', value: 'samsung' },
    { label: 'Vivo / iQOO', value: 'vivo' },
    { label: 'Oppo / Realme', value: 'oppo' },
    { label: 'iPhone', value: 'ios' },
    { label: 'Browser', value: 'browser' },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2.5 text-text-base">
          <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight">Phone & Notification Setup</div>
            <div className="text-[11px] font-normal text-text-muted mt-0.5">
              Make sure notifications arrive instantly on your device
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} className="rounded-xl text-xs font-semibold">
          Close
        </Button>,
        <Button
          key="retry"
          type="primary"
          loading={checkingPermission}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onCheckAndRetry}
          className="bg-primary-500 hover:bg-primary-600 rounded-xl text-xs font-semibold"
        >
          Check & Enable
        </Button>,
      ]}
      centered
      destroyOnClose
      width={560}
      className="rounded-3xl overflow-hidden"
    >
      <div className="py-2 space-y-3.5 text-sm text-text-base max-h-[72vh] overflow-y-auto pr-1">
        {/* Device Brand Switcher */}
        <div>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-primary-500" />
            <span>Select Your Phone or Device</span>
          </div>
          <div className="overflow-x-auto no-scrollbar pb-1">
            <Segmented
              options={brandOptions}
              value={activeBrand}
              onChange={(val) => setActiveBrand(val as BrandKey)}
              className="bg-bg-subtle border border-border-subtle p-1 rounded-2xl w-full"
              block
            />
          </div>
        </div>

        {/* ── Brand Specific Content ────────────────────────────────────────── */}

        {/* 1. Xiaomi / Redmi / POCO */}
        {activeBrand === 'xiaomi' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Xiaomi phones stop background apps to save battery.</strong> To receive instant expense and payment alerts, follow these 3 quick steps:
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Turn ON Autostart
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Long-press the <strong>Centfolio</strong> (or Chrome) icon on your home screen &rarr; tap <strong>App info (ℹ️)</strong>.</p>
                  <p>Toggle <strong className="text-emerald-500">Autostart ON</strong>. This allows alerts to wake up the app when friends add expenses.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Set Battery Saver to "No restrictions"
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>In the same <strong>App info</strong> screen, tap <strong>Battery saver</strong>.</p>
                  <p>Select <strong className="text-emerald-500">No restrictions</strong> so Xiaomi does not freeze the app when your screen is locked.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow Floating Notifications & Sound
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>In App info, tap <strong>Notifications</strong>.</p>
                  <p>Turn ON <strong>Show notifications</strong>, <strong>Floating notifications</strong> (pop-ups), and <strong>Sound</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Samsung (Galaxy / One UI) */}
        {activeBrand === 'samsung' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong>Samsung puts apps into "Deep sleep" if not opened daily.</strong> This stops alerts from reaching your phone until you open the app again:
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Remove from "Deep sleeping apps"
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open phone <strong>Settings &rarr; Battery &rarr; Background usage limits</strong>.</p>
                  <p>Check <strong>Deep sleeping apps</strong>. If Centfolio or Chrome is there, remove it.</p>
                  <p className="text-[11px] text-primary-500 font-medium">Tip: Tap <strong>Never sleeping apps</strong> and add Centfolio to guarantee alerts.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Set Battery to "Unrestricted"
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Long-press the <strong>Centfolio</strong> icon &rarr; tap <strong>App info (ℹ️)</strong>.</p>
                  <p>Tap <strong>Battery</strong> &rarr; select <strong className="text-emerald-500">Unrestricted</strong>.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow Sound and Vibration
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>In App info, tap <strong>Notifications</strong>.</p>
                  <p>Ensure <strong>Allow notifications</strong> is ON and set to <strong className="text-emerald-500">Allow sound and vibration</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Vivo & iQOO */}
        {activeBrand === 'vivo' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Vivo blocks background internet access unless authorized.</strong> Follow these 3 steps to unblock background alerts:
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow High Background Power
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open phone <strong>Settings &rarr; Battery &rarr; Background power consumption management</strong>.</p>
                  <p>Tap <strong>Centfolio</strong> (or Chrome) &rarr; choose <strong className="text-emerald-500">Allow high background power usage</strong>.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Turn ON Autostart in iManager
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open your phone's built-in <strong>iManager</strong> app.</p>
                  <p>Tap <strong>App manager &rarr; Permission management &rarr; Autostart</strong> &rarr; turn <strong>Centfolio ON</strong>.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow Notifications
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open <strong>Settings &rarr; Apps &rarr; Centfolio &rarr; Notifications</strong>.</p>
                  <p>Make sure <strong className="text-emerald-500">Allow notifications is ON</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Oppo & Realme (ColorOS / Realme UI) */}
        {activeBrand === 'oppo' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <strong>Oppo & Realme freeze apps when the screen is locked.</strong> Follow these steps to allow alerts to pop up:
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow Background Activity & Auto-launch
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Long-press the <strong>Centfolio</strong> icon on your home screen &rarr; tap <strong>App info (ℹ️)</strong>.</p>
                  <p>Tap <strong>Battery usage</strong> &rarr; turn ON <strong className="text-emerald-500">Allow background activity</strong> and <strong className="text-emerald-500">Allow auto-launch</strong>.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Enable Banners & Lock Screen Alerts
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>In App info, tap <strong>Manage notifications</strong>.</p>
                  <p>Make sure <strong className="text-emerald-500">Banner</strong> and <strong className="text-emerald-500">Lock screen</strong> are checked.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Pause App Activity (Turn OFF)
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>In App info, find <strong>"Pause app activity if unused"</strong>.</p>
                  <p>Turn this option <strong className="text-emerald-500">OFF</strong> so Oppo never sleeps Centfolio.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. iPhone / iPad */}
        {activeBrand === 'ios' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-neutral-500/10 border border-neutral-500/20 text-xs text-text-base flex items-start gap-2.5">
              <Apple className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <strong>Apple requires installing Centfolio to your Home Screen</strong> before it can send notifications:
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Add Centfolio to Home Screen
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open Centfolio in <strong>Safari</strong>.</p>
                  <p>Tap the <strong>Share button ⎋</strong> (bottom toolbar) &rarr; scroll down &rarr; tap <strong className="text-primary-500">"Add to Home Screen"</strong> &rarr; tap <strong>Add</strong>.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Open the App from Home Screen
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Go to your phone screen and tap the new <strong>Centfolio</strong> app icon.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-semibold text-xs text-text-base">
                    Allow Notifications in Settings
                  </span>
                </div>
                <div className="text-xs text-text-muted pl-7 space-y-1">
                  <p>Open iPhone <strong>Settings &rarr; Centfolio &rarr; Notifications</strong>.</p>
                  <p>Toggle <strong className="text-emerald-500">Allow Notifications ON</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Desktop / Browser */}
        {activeBrand === 'browser' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-bg-subtle border border-border-base space-y-2">
              <div className="font-semibold text-xs text-text-base flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-blue-500" />
                <span>Web Browser (Chrome / Edge / Firefox)</span>
              </div>
              <ol className="list-decimal list-inside text-xs text-text-muted space-y-1.5 pl-1">
                <li>Look at the address bar at the top of your screen.</li>
                <li>Click the <strong>view site information (padlock 🔒)</strong> icon next to the website address.</li>
                <li>Set <strong>Notifications</strong> to <strong className="text-emerald-500">Allow</strong>.</li>
                <li>Reload the page and tap <strong>"Check & Enable"</strong> below.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Action Callout */}
        <div className="pt-1 text-center bg-bg-subtle/40 rounded-xl p-2.5 border border-border-subtle">
          <div className="text-xs text-text-muted flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>After updating your phone settings, tap <strong>"Check & Enable"</strong> below to confirm!</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
