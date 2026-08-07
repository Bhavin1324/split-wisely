/**
 * Gets the active user currency code from localStorage or defaults to 'USD'.
 */
export function getStoredCurrency(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('splitwisely_user_currency') || 'USD';
  }
  return 'USD';
}

/**
 * Sets the active user currency code in localStorage.
 */
export function setStoredCurrency(currencyCode: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('splitwisely_user_currency', currencyCode);
  }
}

/**
 * Returns the currency symbol for a given or active currency code.
 * e.g., USD -> $, INR -> ₹
 */
export function getCurrencySymbol(currencyCode?: string): string {
  const activeCurrency = currencyCode || getStoredCurrency();
  const parts = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: activeCurrency,
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value || '$';
}

/**
 * Formats an integer cents value to a localized currency display string.
 * Uses the active stored currency unless an explicit currencyCode is provided.
 * e.g., 1050 -> "$10.50" (USD) or "₹10.50" (INR)
 */
export function formatCents(cents: number, currencyCode?: string): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = absCents / 100;
  const activeCurrency = currencyCode || getStoredCurrency();

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: activeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses a dollar/rupee string input to integer cents.
 * e.g., "10.50" -> 1050, "10" -> 1000
 */
export function parseToCents(dollarString: string): number {
  const cleaned = dollarString.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Converts cents to a decimal number for display in input fields.
 * e.g., 1050 -> 10.50
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/**
 * Returns the sign class for balance display.
 */
export function getBalanceColorClass(cents: number): string {
  if (cents > 0) return 'text-emerald-500';
  if (cents < 0) return 'text-rose-500';
  return 'text-gray-400';
}
