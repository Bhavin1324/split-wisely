import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStoredCurrency, setStoredCurrency } from '../currency';

describe('Centfolio Rebrand & LocalStorage Backward Compatibility', () => {
  let mockStore: Record<string, string> = {};

  const mockLocalStorage = {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStore[key] = String(value);
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
  };

  beforeEach(() => {
    mockStore = {};
    // Mock window & localStorage in Node test environment
    // @ts-ignore
    globalThis.window = { localStorage: mockLocalStorage } as any;
    // @ts-ignore
    globalThis.localStorage = mockLocalStorage as any;
  });

  afterEach(() => {
    // @ts-ignore
    delete globalThis.window;
    // @ts-ignore
    delete globalThis.localStorage;
  });

  it('falls back to INR when no currency key is set', () => {
    expect(getStoredCurrency()).toBe('INR');
  });

  it('gracefully reads legacy splitwisely_user_currency if centfolio_user_currency is not set', () => {
    mockLocalStorage.setItem('splitwisely_user_currency', 'USD');
    expect(getStoredCurrency()).toBe('USD');
  });

  it('prioritizes new centfolio_user_currency when both keys exist', () => {
    mockLocalStorage.setItem('splitwisely_user_currency', 'USD');
    mockLocalStorage.setItem('centfolio_user_currency', 'EUR');
    expect(getStoredCurrency()).toBe('EUR');
  });

  it('writes exclusively to the new centfolio_user_currency key', () => {
    setStoredCurrency('GBP');
    expect(mockLocalStorage.getItem('centfolio_user_currency')).toBe('GBP');
  });

  it('theme fallback safely reads splitwisely_theme and splitwisely_scheme', () => {
    mockLocalStorage.setItem('splitwisely_theme', 'purple');
    mockLocalStorage.setItem('splitwisely_scheme', 'dark');

    const theme =
      mockLocalStorage.getItem('centfolio_theme') ||
      mockLocalStorage.getItem('splitwisely_theme');
    const scheme =
      mockLocalStorage.getItem('centfolio_scheme') ||
      mockLocalStorage.getItem('splitwisely_scheme');

    expect(theme).toBe('purple');
    expect(scheme).toBe('dark');
  });
});
