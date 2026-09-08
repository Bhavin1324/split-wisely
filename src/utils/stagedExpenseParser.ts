import type { StagedExpense } from '../types/stagedExpense';

export type PaymentInstrument = 'UPI' | 'CARD' | 'BANK' | 'CASH';

export const EXPENSE_CATEGORIES = [
  { name: 'Food', label: 'Food' },
  { name: 'Transport', label: 'Transport' },
  { name: 'Bills', label: 'Bills' },
  { name: 'Shopping', label: 'Shopping' },
  { name: 'Entertainment', label: 'Entertainment' },
  { name: 'Health', label: 'Health' },
  { name: 'Other', label: 'Other' },
] as const;

export const INCOME_CATEGORIES = [
  { name: 'Salary', label: 'Salary' },
  { name: 'Freelance', label: 'Freelance' },
  { name: 'Investments', label: 'Investments' },
  { name: 'Gifts', label: 'Gifts' },
  { name: 'Refund', label: 'Refund' },
  { name: 'Other', label: 'Other' },
] as const;

export const PAYMENT_INSTRUMENTS: { id: PaymentInstrument; label: string }[] = [
  { id: 'UPI', label: 'UPI' },
  { id: 'CARD', label: 'Card' },
  { id: 'BANK', label: 'Bank' },
  { id: 'CASH', label: 'Cash' },
];

/**
 * Regex patterns to detect expense category from merchant name / transaction text.
 */
const EXPENSE_CATEGORY_PATTERNS: { category: string; regex: RegExp }[] = [
  {
    category: 'Food',
    regex:
      /swiggy|zomato|starbucks|mcdonald|subway|cafe|coffee|restaurant|food|burger|pizza|diner|kitchen|bakery|chai|tea|eatclub|domino|kfc|biryani|barbeque|baskin|haldiram|faasos|behrouz/i,
  },
  {
    category: 'Transport',
    regex:
      /uber|ola|rapido|metro|fuel|petrol|shell|indianoil|hpcl|bpcl|auto|taxi|irctc|railway|train|flight|indigo|airindia|air\s*india|vistara|spicejet|makemytrip|redbus|fastag|toll|parking/i,
  },
  {
    category: 'Bills',
    regex:
      /electricity|water|gas|bescom|tneb|airtel|jio|vi|broadband|recharge|bill|utility|insurance|lic|dth|tata\s*play|sun\s*direct|wifi|cylinder|postpaid/i,
  },
  {
    category: 'Shopping',
    regex:
      /amazon|flipkart|zara|myntra|h&m|blinkit|zepto|instamart|grocery|mart|store|retail|supermarket|dmart|d-mart|ajio|meesho|nykaa|reliancedigital|croma|lenskart|ikea|decathlon|lifestyle|westside/i,
  },
  {
    category: 'Entertainment',
    regex:
      /netflix|spotify|prime|hotstar|pvr|inox|cinema|movie|bookmyshow|theatre|theater|youtube|gaming|steam|playstation|disney|apple\s*music|amusement/i,
  },
  {
    category: 'Health',
    regex:
      /pharmacy|apollo|medplus|pharmeasy|hospital|clinic|doctor|diagnostic|1mg|practo|dentist|healthcare|lab|medical|netmeds|cult\.fit|gym/i,
  },
];

/**
 * Regex patterns to detect income category from credit transaction text.
 */
const INCOME_CATEGORY_PATTERNS: { category: string; regex: RegExp }[] = [
  {
    category: 'Salary',
    regex: /salary|payroll|wages|ctc|remuneration/i,
  },
  {
    category: 'Refund',
    regex: /refund|reversal|cashback|returned|reversed/i,
  },
  {
    category: 'Investments',
    regex: /dividend|interest|zerodha|groww|mutual\s*fund|stock|kuvera|upstox|uti|cdsl|nsdl/i,
  },
  {
    category: 'Freelance',
    regex: /upwork|fiverr|client|consulting|invoice|retainer/i,
  },
  {
    category: 'Gifts',
    regex: /gift|present|shagun/i,
  },
];

export interface DetectedExpenseDetails {
  description: string;
  category: string;
  paymentMethod: PaymentInstrument;
  type: 'EXPENSE' | 'INCOME';
}

/**
 * Automatically inspects a staged SMS expense and identifies the most appropriate
 * category and payment instrument. If not identifiable, falls back to "Other".
 */
export function detectExpenseDetails(staged: StagedExpense): DetectedExpenseDetails {
  const isCredit = staged.transaction_type === 'CREDIT';
  const txType: 'EXPENSE' | 'INCOME' = isCredit ? 'INCOME' : 'EXPENSE';
  const searchCorpus = (staged.merchant_name || '').toLowerCase();

  // 1. Identify Category
  let category = 'Other';
  const patterns = isCredit ? INCOME_CATEGORY_PATTERNS : EXPENSE_CATEGORY_PATTERNS;
  for (const { category: cat, regex } of patterns) {
    if (regex.test(searchCorpus)) {
      category = cat;
      break;
    }
  }

  // 2. Identify Payment Instrument
  let paymentMethod: PaymentInstrument = 'UPI';

  if (staged.upi_ref) {
    paymentMethod = 'UPI';
  } else if (/card|credit\s*card|debit\s*card|visa|mastercard|rupay|amex|\bcc\b|\bdc\b/i.test(searchCorpus)) {
    paymentMethod = 'CARD';
  } else if (/cash|atm|withdrawal/i.test(searchCorpus)) {
    paymentMethod = 'CASH';
  } else if (/neft|imps|rtgs|netbanking|bank\s*transfer|a\/c|account/i.test(searchCorpus)) {
    paymentMethod = 'BANK';
  } else if (staged.bank_short_code) {
    paymentMethod = 'BANK';
  }

  return {
    description: staged.merchant_name || 'Expense',
    category,
    paymentMethod,
    type: txType,
  };
}
