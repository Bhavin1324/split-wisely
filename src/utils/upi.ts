/**
 * Utility functions for NPCI P2P compliant UPI payment URI generation and parameter sanitization.
 */

export interface UpiPaymentOptions {
  vpa: string;
  payeeName: string;
  amountCents: number;
  note?: string;
  currency?: string;
}

export type UpiAppTarget = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | 'generic';

export const UPI_APP_PACKAGES: Record<Exclude<UpiAppTarget, 'generic'>, string> = {
  gpay: 'com.google.android.apps.nbu.paisa.user',
  phonepe: 'com.phonepe.app',
  paytm: 'net.one97.paytm',
  bhim: 'in.org.npci.upiapp',
  cred: 'com.dreamplug.androidapp',
};

/**
 * Strips all non-alphanumeric characters from a string and limits length.
 * Required by strict UPI parsers (e.g. BHIM, PhonePe) which fail on spaces, +, or %20.
 */
export function encodeUpiParam(value: string, maxLength = 50): string {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, maxLength);
}

/**
 * Sanitizes and cleans a Payee UPI VPA (Virtual Payment Address).
 * Lowercases, trims, and strips illegal whitespace.
 */
export function sanitizeVpa(vpa: string): string {
  if (!vpa) return '';
  return vpa.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Formats integer cents/paise into 2-decimal fractional INR string (e.g. 5000 -> "50.00").
 */
export function formatUpiAmount(amountCents: number): string {
  if (!amountCents || amountCents <= 0) return '0.00';
  return (amountCents / 100).toFixed(2);
}

/**
 * Generates an NPCI P2P compliant UPI deep link URI (`upi://pay`).
 *
 * Strict P2P Rules:
 * - Only includes mandatory and permitted P2P keys: `pa`, `pn`, `am`, `cu`, `tn`.
 * - Strictly prohibits merchant/tracking parameters: `mc`, `tid`, `tr`, `mode`, `sign`, `url`.
 * - Amounts must be fractional rupees with 2 decimal places.
 * - Payee name and transaction note must be alphanumeric with no special characters.
 */
export function generateUpiUri(options: UpiPaymentOptions): string | null {
  const cleanVpa = sanitizeVpa(options.vpa);
  if (!cleanVpa || !options.amountCents || options.amountCents <= 0) {
    return null;
  }

  const cleanName = encodeUpiParam(options.payeeName) || 'Friend';
  const amountStr = formatUpiAmount(options.amountCents);
  const cleanNote = encodeUpiParam(options.note || 'Settlement') || 'Settlement';
  const currency = (options.currency || 'INR').toUpperCase();

  const params = new URLSearchParams();
  params.set('pa', cleanVpa);
  params.set('pn', cleanName);
  params.set('am', amountStr);
  params.set('cu', currency);
  params.set('tn', cleanNote);

  // Preserve raw '@' in VPA for maximum compatibility with legacy Android UPI parsers
  const queryString = params.toString().replace(/%40/g, '@');

  return `upi://pay?${queryString}`;
}

/**
 * Generates an app-specific Chrome Android Intent URI or custom deep link.
 * Targets specific installed UPI apps to bypass browser interceptors and provide 1-click execution.
 */
export function getAppSpecificUpiUri(app: UpiAppTarget, options: UpiPaymentOptions): string | null {
  const genericUri = generateUpiUri(options);
  if (!genericUri) return null;

  if (app === 'generic') {
    return genericUri;
  }

  const queryString = genericUri.replace(/^upi:\/\/pay\?/, '');
  const pkg = UPI_APP_PACKAGES[app];

  if (pkg) {
    return `intent://pay?${queryString}#Intent;scheme=upi;package=${pkg};end`;
  }

  return genericUri;
}
