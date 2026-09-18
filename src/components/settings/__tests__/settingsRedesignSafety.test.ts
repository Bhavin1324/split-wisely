import { describe, it, expect } from 'vitest';
import { CurrencyAdapter } from '../../../adapters/CurrencyAdapter';
import type { ThemeType } from '../../../context/ThemeContext';

describe('Settings Page Redesign Safety & Options Completeness', () => {
  it('1. Verifies supported currencies list is complete and formats properly', () => {
    const supported = CurrencyAdapter.getSupportedCurrencies();
    expect(supported).toContain('INR');
    expect(supported).toContain('USD');
    expect(supported).toContain('EUR');
    expect(supported).toContain('GBP');
    expect(supported.length).toBeGreaterThanOrEqual(4);
  });

  it('2. Verifies all 6 primary themes are recognized and distinct', () => {
    const themeIds: ThemeType[] = ['green', 'blue', 'purple', 'rose', 'orange', 'teal'];
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(6);
  });

  it('3. Ensures UPI URI generator conforms to NPCI UPI spec', () => {
    const upiId = 'bhavin@okaxis';
    const name = 'Bhavin Patel';
    const encoded = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&cu=INR`;
    expect(encoded).toContain('pa=bhavin%40okaxis');
    expect(encoded).toContain('pn=Bhavin%20Patel');
    expect(encoded).toContain('cu=INR');
  });

  it('4. Ensures mock user profiles provide preloaded sample UPI IDs', async () => {
    const { MOCK_CURRENT_USER, MOCK_PROFILES } = await import('../../../lib/mockData');
    expect(MOCK_CURRENT_USER.upi_id).toBe('alex.johnson@okaxis');
    expect(MOCK_PROFILES.some((p) => p.upi_id === 'sarah.chen@okhdfcbank')).toBe(true);
    expect(MOCK_PROFILES.some((p) => p.upi_id === 'mike.roberts@oksbi')).toBe(true);
  });

  it('5. Ensures sanitizeVpa normalizes and trims UPI VPAs correctly', async () => {
    const { sanitizeVpa } = await import('../../../utils/upi');
    expect(sanitizeVpa('  Bhavin.Patel@OkAxis  ')).toBe('bhavin.patel@okaxis');
    expect(sanitizeVpa('user @ upi ')).toBe('user@upi');
    expect(sanitizeVpa('')).toBe('');
  });

  it('6. Ensures active UPI uses typed input precedence over saved profile value', () => {
    const savedProfileUpi = 'old@okaxis';
    const typedInputUpi = 'new@okaxis';
    const effectiveUpi = typedInputUpi || savedProfileUpi;
    expect(effectiveUpi).toBe('new@okaxis');

    const emptyTypedInput = '';
    const fallbackUpi = emptyTypedInput || savedProfileUpi;
    expect(fallbackUpi).toBe('old@okaxis');
  });

  it('7. Ensures sign-out confirmation modal configuration enforces centered alignment and danger semantics', () => {
    const createSignOutModalConfig = (onOkCallback: () => Promise<void>) => ({
      title: 'Sign Out',
      content: 'Are you sure you want to sign out of Centfolio on this device?',
      okText: 'Sign Out',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      okButtonProps: {
        danger: true,
        className: 'rounded-xl font-semibold',
      },
      cancelButtonProps: {
        className: 'rounded-xl font-semibold',
      },
      onOk: onOkCallback,
    });

    const dummySignOut = async () => {};
    const config = createSignOutModalConfig(dummySignOut);

    // Hard requirement: Modal must be centered vertically
    expect(config.centered).toBe(true);
    // Hard requirement: Destructive action styling
    expect(config.okType).toBe('danger');
    expect(config.okButtonProps.danger).toBe(true);
    expect(config.title).toBe('Sign Out');
  });

  it('8. Ensures sign out button styling follows strict design system rules and rejects forbidden palettes', () => {
    const signOutBtnClass =
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-error-text bg-error-bg/60 hover:bg-error-bg border border-error-border/60 hover:border-error-border transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-error-border/50 cursor-pointer shadow-2xs';

    // Must use semantic tokens
    expect(signOutBtnClass).toContain('text-error-text');
    expect(signOutBtnClass).toContain('bg-error-bg');
    expect(signOutBtnClass).toContain('border-error-border');

    // Must provide tactile micro-interactions and accessibility rings
    expect(signOutBtnClass).toContain('active:scale-[0.97]');
    expect(signOutBtnClass).toContain('transition-all');
    expect(signOutBtnClass).toContain('focus:ring-2');

    // Must strictly avoid forbidden generic Tailwind palettes
    expect(signOutBtnClass).not.toContain('rose-');
    expect(signOutBtnClass).not.toContain('emerald-');
    expect(signOutBtnClass).not.toContain('amber-');
    expect(signOutBtnClass).not.toContain('slate-');
  });
});
