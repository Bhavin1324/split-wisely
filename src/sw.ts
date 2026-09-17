/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { APP_ASSETS } from './constants/assets';

declare let self: ServiceWorkerGlobalScope;

// Immediately take control of clients and skip waiting to prevent stuck old workers
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/**
 * Resolves a safe, transparent badge for Android notifications.
 * Strictly prevents any JPEG or opaque icon from being used as a status bar badge,
 * and ensures an absolute URL is passed to the Android NotificationManager.
 */
function getSafeNotificationBadge(candidateBadge?: unknown): string {
  if (
    typeof candidateBadge === 'string' &&
    candidateBadge.trim().length > 0 &&
    !candidateBadge.endsWith('.jpg') &&
    !candidateBadge.endsWith('.jpeg') &&
    !candidateBadge.includes('pwa-icon')
  ) {
    return new URL(candidateBadge, self.location.origin).href;
  }
  return new URL(APP_ASSETS.notifications.badge, self.location.origin).href;
}

/**
 * Resolves a safe notification icon for Android/Desktop notification banners.
 */
function getSafeNotificationIcon(candidateIcon?: unknown): string {
  if (
    typeof candidateIcon === 'string' &&
    candidateIcon.trim().length > 0 &&
    !candidateIcon.endsWith('.jpg') &&
    !candidateIcon.endsWith('.jpeg') &&
    !candidateIcon.includes('pwa-icon')
  ) {
    return new URL(candidateIcon, self.location.origin).href;
  }
  return new URL(APP_ASSETS.notifications.icon, self.location.origin).href;
}

// ── Web Push Event Listener ──────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Centfolio';
    const uniqueTag = `${payload.tag || 'centfolio'}-${Date.now()}`;
    const options = {
      body: payload.body || payload.message || 'You have a new update in Centfolio.',
      icon: getSafeNotificationIcon(payload.icon),
      badge: getSafeNotificationBadge(payload.badge),
      vibrate: [300, 100, 300, 100, 300],
      tag: uniqueTag,
      renotify: true,
      silent: false,
      timestamp: Date.now(),
      data: {
        url: payload.url || payload.link || '/dashboard',
        ...payload,
      },
    } as NotificationOptions;

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Centfolio', {
        body: text || 'You have a new update in Centfolio.',
        icon: getSafeNotificationIcon(),
        badge: getSafeNotificationBadge(),
        vibrate: [300, 100, 300, 100, 300],
        silent: false,
        timestamp: Date.now(),
      } as NotificationOptions)
    );
  }
});

// ── Notification Click & Navigation Handler ──────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is currently open, open a new window with the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
