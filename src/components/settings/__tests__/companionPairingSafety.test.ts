import { describe, it, expect } from 'vitest';

describe('Companion Pairing Safety & Helper Logic', () => {
  it('formats pair deep link correctly with encoded ticket', () => {
    const ticket = 'test-token-xyz-123==';
    const pairDeepLink = `centfolio://pair?ticket=${encodeURIComponent(ticket)}`;
    expect(pairDeepLink).toBe('centfolio://pair?ticket=test-token-xyz-123%3D%3D');
  });

  it('calculates remaining seconds correctly from expiration ISO timestamp', () => {
    const now = Date.now();
    const expiresAt = new Date(now + 120 * 1000).toISOString(); // 120 seconds in future
    const expMs = new Date(expiresAt).getTime();
    const diffSecs = Math.max(0, Math.floor((expMs - now) / 1000));
    expect(diffSecs).toBeGreaterThanOrEqual(119);
    expect(diffSecs).toBeLessThanOrEqual(121);
  });

  it('clamps expired tickets to zero seconds remaining', () => {
    const now = Date.now();
    const expiredAt = new Date(now - 10 * 1000).toISOString(); // 10 seconds in the past
    const expMs = new Date(expiredAt).getTime();
    const diffSecs = Math.max(0, Math.floor((expMs - now) / 1000));
    expect(diffSecs).toBe(0);
  });

  it('formats countdown MM:SS string correctly', () => {
    const formatCountdown = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    expect(formatCountdown(300)).toBe('5:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('accurately identifies mobile user agents vs desktop computers', () => {
    const isMobileUserAgent = (ua: string) => /android|iphone|ipad|mobile/i.test(ua);

    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile')).toBe(true);
    expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe(true);
    expect(isMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36')).toBe(false);
    expect(isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')).toBe(false);
  });
});
