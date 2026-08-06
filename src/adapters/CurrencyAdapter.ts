const MOCK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.75,
  INR: 83.0,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.0,
};

/**
 * Currency conversion adapter.
 * Uses mock rates for now; swap in Open Exchange Rates API for production.
 */
export class CurrencyAdapter {
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const fromRate = MOCK_RATES[fromCurrency] ?? 1.0;
    const toRate = MOCK_RATES[toCurrency] ?? 1.0;
    return (1 / fromRate) * toRate;
  }

  static getSupportedCurrencies(): string[] {
    return Object.keys(MOCK_RATES);
  }
}
