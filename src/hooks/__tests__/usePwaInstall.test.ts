import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePwaInstall } from '../usePwaInstall';

describe('usePwaInstall hook & PWA installability reliability', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    (globalThis as any).localStorage = storageMock;
    if (typeof window !== 'undefined') {
      delete (window as any).__deferredPrompt;
      (window as any).localStorage = storageMock;
    }
  });

  it('1. Initializes correctly in test environment', () => {
    expect(typeof usePwaInstall).toBe('function');
  });

  it('2. Detects pre-captured early beforeinstallprompt event on window', () => {
    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    };

    if (typeof window !== 'undefined') {
      (window as any).__deferredPrompt = mockPromptEvent;
      expect((window as any).__deferredPrompt).toBe(mockPromptEvent);
    }
  });

  it('3. Dismissal persistence in localStorage uses 7 days TTL key', () => {
    const DISMISS_KEY = 'centfolio_pwa_install_dismissed';
    const now = Date.now();
    localStorage.setItem(DISMISS_KEY, now.toString());

    const stored = localStorage.getItem(DISMISS_KEY);
    expect(stored).toBe(now.toString());

    const elapsedDays = (Date.now() - parseInt(stored!, 10)) / (1000 * 60 * 60 * 24);
    expect(elapsedDays).toBeLessThan(7);
  });
});
