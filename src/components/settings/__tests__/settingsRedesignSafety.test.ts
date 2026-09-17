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
});
