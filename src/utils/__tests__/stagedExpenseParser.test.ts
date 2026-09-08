import { describe, it, expect } from 'vitest';
import {
  detectExpenseDetails,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_INSTRUMENTS,
} from '../stagedExpenseParser';
import type { StagedExpense } from '../../types/stagedExpense';

describe('stagedExpenseParser', () => {
  const createMockStaged = (overrides: Partial<StagedExpense> = {}): StagedExpense => ({
    id: 'stg_test',
    user_id: 'user_1',
    amount_cents: 25000,
    transaction_type: 'DEBIT',
    merchant_name: 'Swiggy',
    bank_short_code: 'HDFC',
    account_last4: '1234',
    upi_ref: '421098765432',
    raw_sms_hash: 'hash123',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    transaction_date: new Date().toISOString(),
    ...overrides,
  });

  describe('Category Auto-Detection (Expense)', () => {
    it('detects Food category for Swiggy, Zomato, Starbucks, etc.', () => {
      const swiggy = detectExpenseDetails(createMockStaged({ merchant_name: 'Swiggy' }));
      expect(swiggy.category).toBe('Food');

      const zomato = detectExpenseDetails(createMockStaged({ merchant_name: 'Zomato Limited' }));
      expect(zomato.category).toBe('Food');

      const cafe = detectExpenseDetails(createMockStaged({ merchant_name: 'Blue Tokai Coffee' }));
      expect(cafe.category).toBe('Food');
    });

    it('detects Transport category for Uber, Ola, Petrol, etc.', () => {
      const uber = detectExpenseDetails(createMockStaged({ merchant_name: 'Uber Rides India' }));
      expect(uber.category).toBe('Transport');

      const fuel = detectExpenseDetails(createMockStaged({ merchant_name: 'IndianOil Petrol Pump' }));
      expect(fuel.category).toBe('Transport');

      const irctc = detectExpenseDetails(createMockStaged({ merchant_name: 'IRCTC Railway Ticketing' }));
      expect(irctc.category).toBe('Transport');
    });

    it('detects Bills category for utilities, broadband, recharge', () => {
      const airtel = detectExpenseDetails(createMockStaged({ merchant_name: 'Airtel Broadband Recharge' }));
      expect(airtel.category).toBe('Bills');

      const bescom = detectExpenseDetails(createMockStaged({ merchant_name: 'Bescom Electricity Bill' }));
      expect(bescom.category).toBe('Bills');
    });

    it('detects Shopping category for retail, e-commerce, supermarkets', () => {
      const amazon = detectExpenseDetails(createMockStaged({ merchant_name: 'Amazon India' }));
      expect(amazon.category).toBe('Shopping');

      const zara = detectExpenseDetails(createMockStaged({ merchant_name: 'Zara Retail Store' }));
      expect(zara.category).toBe('Shopping');

      const blinkit = detectExpenseDetails(createMockStaged({ merchant_name: 'Blinkit Groceries' }));
      expect(blinkit.category).toBe('Shopping');
    });

    it('detects Entertainment category for streaming, cinema, events', () => {
      const netflix = detectExpenseDetails(createMockStaged({ merchant_name: 'Netflix Entertainment' }));
      expect(netflix.category).toBe('Entertainment');

      const pvr = detectExpenseDetails(createMockStaged({ merchant_name: 'PVR Cinemas' }));
      expect(pvr.category).toBe('Entertainment');
    });

    it('detects Health category for pharmacy, hospitals, clinics', () => {
      const apollo = detectExpenseDetails(createMockStaged({ merchant_name: 'Apollo Pharmacy' }));
      expect(apollo.category).toBe('Health');
    });

    it('falls back to "Other" when merchant is unidentifiable', () => {
      const random1 = detectExpenseDetails(createMockStaged({ merchant_name: 'ACME Enterprise 9901' }));
      expect(random1.category).toBe('Other');

      const random2 = detectExpenseDetails(createMockStaged({ merchant_name: 'ABC XYZ Corp' }));
      expect(random2.category).toBe('Other');
    });
  });

  describe('Category Auto-Detection (Income / Credit)', () => {
    it('detects Salary, Refund, Investments, Freelance for CREDIT transactions', () => {
      const salary = detectExpenseDetails(
        createMockStaged({ transaction_type: 'CREDIT', merchant_name: 'Infosys Monthly Salary' })
      );
      expect(salary.category).toBe('Salary');
      expect(salary.type).toBe('INCOME');

      const refund = detectExpenseDetails(
        createMockStaged({ transaction_type: 'CREDIT', merchant_name: 'Amazon Refund Reversal' })
      );
      expect(refund.category).toBe('Refund');
      expect(refund.type).toBe('INCOME');

      const dividend = detectExpenseDetails(
        createMockStaged({ transaction_type: 'CREDIT', merchant_name: 'TCS Dividend Payment' })
      );
      expect(dividend.category).toBe('Investments');

      const unidentifiableCredit = detectExpenseDetails(
        createMockStaged({ transaction_type: 'CREDIT', merchant_name: 'Direct Deposit Ref 99182' })
      );
      expect(unidentifiableCredit.category).toBe('Other');
    });
  });

  describe('Payment Instrument Auto-Detection', () => {
    it('detects UPI when upi_ref is present', () => {
      const item = detectExpenseDetails(createMockStaged({ upi_ref: '421000111222' }));
      expect(item.paymentMethod).toBe('UPI');
    });

    it('detects CARD when card keywords are in merchant or SMS text without UPI', () => {
      const item = detectExpenseDetails(
        createMockStaged({
          upi_ref: null,
          merchant_name: 'Zara Retail on SBI Credit Card',
        })
      );
      expect(item.paymentMethod).toBe('CARD');
    });

    it('detects CASH when cash or ATM is mentioned', () => {
      const item = detectExpenseDetails(
        createMockStaged({
          upi_ref: null,
          merchant_name: 'HDFC ATM Cash Withdrawal',
        })
      );
      expect(item.paymentMethod).toBe('CASH');
    });

    it('detects BANK when bank transfer or account is mentioned without UPI', () => {
      const item = detectExpenseDetails(
        createMockStaged({
          upi_ref: null,
          merchant_name: 'NEFT Bank Transfer to Landlord',
        })
      );
      expect(item.paymentMethod).toBe('BANK');
    });

    it('defaults to BANK when bank_short_code is present and upi_ref is absent', () => {
      const item = detectExpenseDetails(
        createMockStaged({
          upi_ref: null,
          merchant_name: 'Generic Vendor',
          bank_short_code: 'ICICI',
        })
      );
      expect(item.paymentMethod).toBe('BANK');
    });
  });

  describe('Constant Exports Integrity', () => {
    it('includes app-supported categories and instruments', () => {
      expect(EXPENSE_CATEGORIES.some((c) => c.name === 'Food')).toBe(true);
      expect(EXPENSE_CATEGORIES.some((c) => c.name === 'Other')).toBe(true);
      expect(INCOME_CATEGORIES.some((c) => c.name === 'Salary')).toBe(true);
      expect(INCOME_CATEGORIES.some((c) => c.name === 'Other')).toBe(true);
      expect(PAYMENT_INSTRUMENTS.map((p) => p.id)).toEqual(['UPI', 'CARD', 'BANK', 'CASH']);
    });
  });
});
