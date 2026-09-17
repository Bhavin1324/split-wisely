/**
 * Centralized Application Asset Dictionary.
 * Single source of truth for public branding, PWA icons, and notification badges.
 */
export const APP_ASSETS = {
  brand: {
    logo: '/brand-logo.png',
    favicon: '/favicon.jpg',
    faviconPng: '/favicon.png',
  },
  pwa: {
    icon192: '/pwa-192x192.png',
    icon512: '/pwa-512x512.png',
    iconLegacyJpg: '/pwa-icon.jpg',
  },
  notifications: {
    badge: '/badge-96x96.png',
    badgeHighDpi: '/badge-192x192.png',
    icon: '/pwa-512x512.png',
  },
} as const;

export type AppAssets = typeof APP_ASSETS;
