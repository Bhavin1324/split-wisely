import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  urlBase64ToUint8Array,
  isPushSupported,
  getNotificationPermissionState,
  DEFAULT_VAPID_PUBLIC_KEY,
  obtainPushSubscription,
} from '../pushNotifications';

describe('pushNotifications utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts base64 url-safe string to Uint8Array', () => {
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
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('getNotificationPermissionState', () => {
    it('returns unsupported when push is not supported in the environment', () => {
      const state = getNotificationPermissionState();
      expect(typeof state).toBe('string');
    });
  });

  describe('obtainPushSubscription (OEM Throttling & Retry Logic)', () => {
    const fakeKey = new Uint8Array([1, 2, 3, 4]);

    it('returns existing subscription immediately without triggering network subscribe', async () => {
      const fakeSubscription = { endpoint: 'https://fcm.googleapis.com/existing' } as unknown as PushSubscription;
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(fakeSubscription),
        subscribe: vi.fn(),
      } as unknown as PushManager;

      const sub = await obtainPushSubscription(mockPushManager, fakeKey, 500);
      expect(sub).toBe(fakeSubscription);
      expect(mockPushManager.getSubscription).toHaveBeenCalledTimes(1);
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
    });

    it('subscribes with VAPID key and returns subscription on first attempt', async () => {
      const fakeSubscription = { endpoint: 'https://fcm.googleapis.com/new' } as unknown as PushSubscription;
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(fakeSubscription),
      } as unknown as PushManager;

      const sub = await obtainPushSubscription(mockPushManager, fakeKey, 500);
      expect(sub).toBe(fakeSubscription);
      expect(mockPushManager.subscribe).toHaveBeenCalledTimes(1);
    });

    it('retries once if first attempt rejects and succeeds on second attempt', async () => {
      const fakeSubscription = { endpoint: 'https://fcm.googleapis.com/retried' } as unknown as PushSubscription;
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi
          .fn()
          .mockRejectedValueOnce(new Error('GMS socket timeout'))
          .mockResolvedValueOnce(fakeSubscription),
      } as unknown as PushManager;

      const sub = await obtainPushSubscription(mockPushManager, fakeKey, 100);
      expect(sub).toBe(fakeSubscription);
      expect(mockPushManager.subscribe).toHaveBeenCalledTimes(2);
    });

    it('returns null cleanly if all attempts fail without crashing', async () => {
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockRejectedValue(new Error('FCM unreachable')),
      } as unknown as PushManager;

      const sub = await obtainPushSubscription(mockPushManager, fakeKey, 100);
      expect(sub).toBeNull();
      expect(mockPushManager.subscribe).toHaveBeenCalledTimes(2);
    });
  });
});
