/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { APP_ASSETS } from './constants/assets';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Web Push Event Listener ──────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Centfolio';
    const uniqueTag = `${payload.tag || 'centfolio'}-${Date.now()}`;
    const options = {
      body: payload.body || payload.message || 'You have a new update in Centfolio.',
      icon: payload.icon || APP_ASSETS.notifications.icon,
      badge: payload.badge || APP_ASSETS.notifications.badge,
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
        icon: APP_ASSETS.notifications.icon,
        badge: APP_ASSETS.notifications.badge,
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
