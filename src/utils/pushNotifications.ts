import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../context/AppDataContext';

// Default VAPID Public Key for Web Push (can be overridden via .env VITE_VAPID_PUBLIC_KEY)
export const DEFAULT_VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

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
    let registration = await navigator.serviceWorker.getRegistration();

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

    if (!registration) {
      return null;
    }

    // 3. Wait for ready with a strict 1500ms timeout race (never hang indefinitely)
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration>((resolve) =>
      setTimeout(() => resolve(registration!), 1500)
    );

    return await Promise.race([readyPromise, timeoutPromise]);
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

  // Try Service Worker registration showNotification first
  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration && 'showNotification' in registration) {
      await registration.showNotification('SplitWisely · Test Alert 🔔', {
        body: 'Push notifications are active! You will receive instant alerts when expenses are added or settled.',
        icon: '/pwa-icon.jpg',
        badge: '/pwa-icon.jpg',
        vibrate: [150, 50, 150],
        tag: 'splitwisely-test',
        data: {
          url: '/dashboard',
        },
      } as NotificationOptions);
      return { success: true, permission: 'granted' };
    }
  } catch (swErr) {
    console.warn('Service worker showNotification fallback note:', swErr);
  }

  // Fallback to standard window Notification constructor
  try {
    new Notification('SplitWisely · Test Alert 🔔', {
      body: 'Notifications are active on this device!',
      icon: '/pwa-icon.jpg',
    });
    return { success: true, permission: 'granted' };
  } catch (err) {
    console.warn('Window Notification fallback error:', err);
    return {
      success: false,
      permission: 'granted',
      message: 'Browser restricted notification display.',
    };
  }
}
