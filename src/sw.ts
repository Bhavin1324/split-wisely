/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

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
      icon: payload.icon || '/pwa-icon.jpg',
      badge: payload.badge || '/pwa-icon.jpg',
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
        icon: '/pwa-icon.jpg',
        badge: '/pwa-icon.jpg',
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
