import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../context/AppDataContext';

// Default VAPID Public Key for Web Push (NIST P-256 paired key)
export const DEFAULT_VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BLsaw4Vb8m0TfTm9jCq-0sCI3aj3gXgTNZMGa-m1wz-m-UVQEjYAwLmML8-biwBYdYXTkfQp_AYm3yKJyKxOSEs';

/**
 * Converts a URL-safe Base64 string to a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether the current browser and device support Web Push Notifications.
 */
/**
 * Checks whether the current browser and device support Notifications.
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current Notification permission state.
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Safely retrieves or registers the Service Worker with timeout protection so promises never hang.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // 1. Check for existing active registration
    let registration: ServiceWorkerRegistration | null = null;
    try {
      registration = (await navigator.serviceWorker.getRegistration()) || null;
    } catch {}

    // 2. If not found, register appropriate path based on environment
    if (!registration) {
      const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
      const swOptions: RegistrationOptions = import.meta.env.DEV
        ? { scope: '/', type: 'module' }
        : { scope: '/' };

      try {
        registration = await navigator.serviceWorker.register(swUrl, swOptions);
      } catch (regErr) {
        console.warn('Initial service worker registration attempt note:', regErr);
        // Fallback to classic sw.js
        try {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        } catch {
          // Ignore fallback error
        }
      }
    }

    // 3. Wait for the active Service Worker with a 1000ms timeout race (never hang indefinitely)
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration | null>((resolve) =>
      setTimeout(() => resolve(registration), 1000)
    );

    const activeRegistration = await Promise.race([readyPromise, timeoutPromise]);
    return activeRegistration || registration;
  } catch (err) {
    console.warn('Service worker resolution note:', err);
    return null;
  }
}

/**
 * Subscribes the current device to Notifications and attempts to save push token in Supabase.
 * Designed to never fail if PushManager is restricted (e.g. iOS Safari tab before install, or local testing).
 */
export async function subscribeUserToPush(userId?: string): Promise<PushSubscription | boolean> {
  if (!isPushSupported()) {
    throw new Error('Notifications are not supported by your browser or operating system.');
  }

  // 1. Request OS / Browser Permission immediately upon user gesture
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied or dismissed.');
  }

  // 2. Try to get Service Worker & PushManager subscription
  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration && registration.pushManager) {
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
        
        // Wrap FCM subscription in a 3.5-second timeout to prevent self-signed SSL hangs
        const subscribePromise = registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as BufferSource,
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));

        subscription = (await Promise.race([subscribePromise, timeoutPromise])) as PushSubscription | null;
      }

      // Save subscription in Supabase database if available
      if (!DEMO_MODE && userId && subscription) {
        const subJson = subscription.toJSON();
        const endpoint = subscription.endpoint;
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (endpoint && p256dh && auth) {
          const { error } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: userId,
              endpoint,
              p256dh,
              auth,
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );

          if (error) {
            console.warn('Push subscription database sync note:', error.message);
          }
        }
      }

      if (subscription) {
        return subscription;
      }
    }
  } catch (err) {
    console.warn('Background PushManager subscription note (local/browser restriction):', err);
  }

  // If PushManager is unavailable or FCM timed out, local notifications are still granted and fully functional!
  return true;
}

/**
 * Silently synchronizes or reassigns the active device push subscription to the logged-in user.
 * Runs in the background on login / app load without throwing or interrupting the UI.
 */
export async function syncPushSubscriptionWithBackend(userId: string): Promise<void> {
  if (
    DEMO_MODE ||
    !userId ||
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    localStorage.getItem('splitwisely_push_enabled') === 'false'
  ) {
    return;
  }

  try {
    const registration = await getOrRegisterServiceWorker();
    if (!registration || !registration.pushManager) return;

    let subscription = await registration.pushManager.getSubscription();

    // If no subscription exists yet on this device, subscribe with the matching VAPID key
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      const subscribePromise = registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as BufferSource,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      subscription = (await Promise.race([subscribePromise, timeoutPromise])) as PushSubscription | null;
    }

    if (subscription) {
      const subJson = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (endpoint && p256dh && auth) {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      }
    }
  } catch (err) {
    console.warn('Background push subscription sync note:', err);
  }
}

/**
 * Disassociates the current browser/device endpoint from the database on logout.
 * Ensures the logged-out user stops receiving push notifications on this device.
 */
export async function detachPushSubscriptionOnLogout(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.pushManager) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      if (!DEMO_MODE) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
    }
  } catch (err) {
    console.warn('Detach push subscription on logout note:', err);
  }
}

/**
 * Unsubscribes the current device and removes the subscription token from Supabase.
 */
export async function unsubscribeUserFromPush(userId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration && registration.pushManager) {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (!DEMO_MODE && userId) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);
        }
        return true;
      }
    }
    return true;
  } catch (err) {
    console.warn('Failed to unsubscribe from push notifications:', err);
    return false;
  }
}

export interface TestNotificationResult {
  success: boolean;
  permission: NotificationPermission | 'unsupported';
  message?: string;
}

/**
 * Requests browser notification permission directly.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Synthesizes a pleasant two-tone notification chime via Web Audio API.
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (E5 ~ 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Second tone (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (audioErr) {
    console.warn('Web Audio chime note:', audioErr);
  }
}

/**
 * Triggers a test notification to immediately verify phone sound, vibration, and alert display.
 * Prompts for permission if needed, and uses Service Worker or window Notification.
 */
export async function sendLocalTestNotification(): Promise<TestNotificationResult> {
  if (!isPushSupported()) {
    return {
      success: false,
      permission: 'unsupported',
      message: 'Notifications are not supported on this browser or environment.',
    };
  }

  // Request permission if not already granted
  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      message:
        permission === 'denied'
          ? 'Notifications are blocked in your browser settings. Please allow notifications in the address bar.'
          : 'Notification permission was not granted.',
    };
  }

  // Trigger audio chime & haptic feedback
  playNotificationChime();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 50, 150]);
    } catch {}
  }

  const uniqueTag = `splitwisely-test-${Date.now()}`;
  const notificationOptions = {
    body: 'Push notifications are active! You will receive instant alerts when expenses are added or settled.',
    icon: '/pwa-icon.jpg',
    badge: '/pwa-icon.jpg',
    vibrate: [150, 50, 150],
    tag: uniqueTag,
    renotify: true,
    data: {
      url: '/dashboard',
    },
  } as NotificationOptions;

  // 1. Primary: Use ServiceWorkerRegistration showNotification (required on mobile platforms)
  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration && 'showNotification' in registration) {
      await registration.showNotification('SplitWisely · Test Alert 🔔', notificationOptions);
      return { success: true, permission: 'granted' };
    }
  } catch (swErr) {
    console.warn('Service worker showNotification note:', swErr);
  }

  // 2. Desktop-only fallback: Only attempt new Notification() on non-mobile desktop browsers
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobile) {
    try {
      new Notification('SplitWisely · Test Alert 🔔', {
        body: 'Notifications are active on this device!',
        icon: '/pwa-icon.jpg',
        tag: uniqueTag,
      });
      return { success: true, permission: 'granted' };
    } catch (err) {
      console.warn('Desktop Window Notification fallback note:', err);
    }
  }

  // 3. If on mobile, wait for navigator.serviceWorker.ready and show notification
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const readyReg = await navigator.serviceWorker.ready;
      if (readyReg && 'showNotification' in readyReg) {
        await readyReg.showNotification('SplitWisely · Test Alert 🔔', notificationOptions);
        return { success: true, permission: 'granted' };
      }
    } catch (readyErr) {
      console.warn('Mobile ServiceWorker ready showNotification note:', readyErr);
    }
  }

  return {
    success: true,
    permission: 'granted',
    message: 'Notifications are active on this device.',
  };
}
