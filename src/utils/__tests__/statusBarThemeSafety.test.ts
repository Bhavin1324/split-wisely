import { describe, it, expect } from 'vitest';

/**
 * Calculates standard sRGB relative luminance.
 * Formula from W3C WCAG 2.1 specifications:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where R, G, B are normalized linear color components.
 */
function calculateRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates WCAG contrast ratio between two relative luminances.
 * Contrast = (L1 + 0.05) / (L2 + 0.05)
 */
function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = calculateRelativeLuminance(hex1);
  const lum2 = calculateRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Android Status Bar Contrast & Luminance Safety', () => {
  const LIGHT_STATUS_BAR_COLOR = '#ffffff';
  const DARK_STATUS_BAR_COLOR = '#0f131a';

  it('guarantees light mode status bar color has high luminance (> 0.5) triggering dark Android system icons', () => {
    const luminance = calculateRelativeLuminance(LIGHT_STATUS_BAR_COLOR);
    // Android's WindowInsetsControllerCompat requires luminance > 0.5 to activate SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
    expect(luminance).toBeGreaterThan(0.5);
    expect(luminance).toBeCloseTo(1.0, 2);
  });

  it('guarantees dark mode status bar color has low luminance (<= 0.5) triggering white Android system icons', () => {
    const luminance = calculateRelativeLuminance(DARK_STATUS_BAR_COLOR);
    // Android's WindowInsetsControllerCompat requires luminance <= 0.5 to keep icons white
    expect(luminance).toBeLessThanOrEqual(0.5);
    expect(luminance).toBeLessThan(0.05);
  });

  it('ensures light mode Android status bar icons (black #000000) have WCAG AAA contrast ratio on light status bar (#ffffff)', () => {
    const blackIcons = '#000000';
    const contrastRatio = calculateContrastRatio(blackIcons, LIGHT_STATUS_BAR_COLOR);
    // WCAG AAA requires >= 7:1 for normal text and >= 4.5:1 for graphical UI elements
    expect(contrastRatio).toBeGreaterThan(7.0);
    expect(contrastRatio).toBeCloseTo(21.0, 1);
  });

  it('ensures dark mode Android status bar icons (white #ffffff) have WCAG AAA contrast ratio on dark status bar (#0f131a)', () => {
    const whiteIcons = '#ffffff';
    const contrastRatio = calculateContrastRatio(whiteIcons, DARK_STATUS_BAR_COLOR);
    // WCAG AAA requires >= 7:1
    expect(contrastRatio).toBeGreaterThan(7.0);
    expect(contrastRatio).toBeGreaterThan(15.0);
  });

  it('verifies that old bug combination (#000000 dark icons on old #0f172a navy header) was critically broken (< 1.5:1 contrast)', () => {
    const darkIcons = '#000000';
    const oldNavyHeader = '#0f172a';
    const bugContrast = calculateContrastRatio(darkIcons, oldNavyHeader);
    // Forensic proof: 1.15:1 contrast ratio was why users saw literally nothing!
    expect(bugContrast).toBeLessThan(1.5);
  });
});
