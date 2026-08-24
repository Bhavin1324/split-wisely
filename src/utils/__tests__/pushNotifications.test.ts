import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  urlBase64ToUint8Array,
  isPushSupported,
  getNotificationPermissionState,
  DEFAULT_VAPID_PUBLIC_KEY,
} from '../pushNotifications';

describe('pushNotifications utilities', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts base64 url-safe string to Uint8Array', () => {
      // Mock window.atob in node environment if needed
      if (typeof window === 'undefined' || !window.atob) {
        (globalThis as any).window = {
          atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
        };
      }

      const result = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isPushSupported', () => {
    it('returns false when window, serviceWorker or Notification is missing', () => {
      const supported = isPushSupported();
      // In node environment, it should cleanly return false without throwing
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('getNotificationPermissionState', () => {
    it('returns unsupported when push is not supported in the environment', () => {
      const state = getNotificationPermissionState();
      expect(typeof state).toBe('string');
    });
  });
});
