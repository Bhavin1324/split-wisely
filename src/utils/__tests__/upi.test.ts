import { describe, it, expect } from 'vitest';
import {
  encodeUpiParam,
  sanitizeVpa,
  formatUpiAmount,
  generateUpiUri,
  getAppSpecificUpiUri,
  UPI_APP_PACKAGES,
} from '../upi';

describe('UPI Utility Functions', () => {
  describe('encodeUpiParam', () => {
    it('strips spaces and special characters', () => {
      expect(encodeUpiParam('John Doe')).toBe('JohnDoe');
      expect(encodeUpiParam('Alice & Bob @ Home!')).toBe('AliceBobHome');
      expect(encodeUpiParam('Settlement #123 (Trip)')).toBe('Settlement123Trip');
    });

    it('strips emojis and unicode symbols', () => {
      expect(encodeUpiParam('Dinner 🍕 with Friends ✨')).toBe('DinnerwithFriends');
    });

    it('truncates to specified max length', () => {
      const longString = 'A'.repeat(100);
      expect(encodeUpiParam(longString, 50)).toBe('A'.repeat(50));
      expect(encodeUpiParam('1234567890', 5)).toBe('12345');
    });

    it('handles empty or falsy strings', () => {
      expect(encodeUpiParam('')).toBe('');
    });
  });

  describe('sanitizeVpa', () => {
    it('converts to lowercase and trims whitespace', () => {
      expect(sanitizeVpa('  User@OKSBI  ')).toBe('user@oksbi');
      expect(sanitizeVpa('Friend . Name @ paytm ')).toBe('friend.name@paytm');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeVpa('')).toBe('');
    });
  });

  describe('formatUpiAmount', () => {
    it('correctly converts integer cents to 2-decimal fractional INR', () => {
      expect(formatUpiAmount(5000)).toBe('50.00');
      expect(formatUpiAmount(123456)).toBe('1234.56');
      expect(formatUpiAmount(10)).toBe('0.10');
      expect(formatUpiAmount(1050)).toBe('10.50');
    });

    it('handles zero and negative amounts gracefully', () => {
      expect(formatUpiAmount(0)).toBe('0.00');
      expect(formatUpiAmount(-100)).toBe('0.00');
    });
  });

  describe('generateUpiUri', () => {
    it('constructs a valid NPCI P2P UPI URI', () => {
      const uri = generateUpiUri({
        vpa: 'friend@oksbi',
        payeeName: 'John Doe',
        amountCents: 5000,
        note: 'Settlement Flat',
        currency: 'INR',
      });

      expect(uri).not.toBeNull();
      expect(uri).toBe('upi://pay?pa=friend@oksbi&pn=JohnDoe&am=50.00&cu=INR&tn=SettlementFlat');
    });

    it('strictly excludes prohibited merchant/tracking parameters', () => {
      const uri = generateUpiUri({
        vpa: 'user@icici',
        payeeName: 'Jane Smith',
        amountCents: 15000,
      });

      expect(uri).not.toBeNull();
      // Verify NO merchant tags
      expect(uri).not.toContain('mc=');
      expect(uri).not.toContain('mode=');
      expect(uri).not.toContain('tr=');
      expect(uri).not.toContain('tid=');
      expect(uri).not.toContain('url=');
      expect(uri).not.toContain('sign=');

      // Verify mandatory P2P keys are present
      expect(uri).toContain('pa=user@icici');
      expect(uri).toContain('pn=JaneSmith');
      expect(uri).toContain('am=150.00');
      expect(uri).toContain('cu=INR');
      expect(uri).toContain('tn=Settlement');
    });

    it('returns null if vpa is missing or invalid', () => {
      expect(generateUpiUri({ vpa: '', payeeName: 'John', amountCents: 1000 })).toBeNull();
      expect(generateUpiUri({ vpa: '   ', payeeName: 'John', amountCents: 1000 })).toBeNull();
    });

    it('returns null if amount is zero or negative', () => {
      expect(generateUpiUri({ vpa: 'user@upi', payeeName: 'John', amountCents: 0 })).toBeNull();
      expect(generateUpiUri({ vpa: 'user@upi', payeeName: 'John', amountCents: -500 })).toBeNull();
    });

    it('uses fallback name when payee name contains only special characters', () => {
      const uri = generateUpiUri({
        vpa: 'test@upi',
        payeeName: '*** @@@ !!!',
        amountCents: 2000,
      });

      expect(uri).toContain('pn=Friend');
    });
  });

  describe('getAppSpecificUpiUri', () => {
    const opts = {
      vpa: 'patelmaulik89054-1@okicici',
      payeeName: 'MrProject',
      amountCents: 100,
      note: 'SplitTest',
    };

    it('generates direct Google Pay Chrome Intent', () => {
      const uri = getAppSpecificUpiUri('gpay', opts);
      expect(uri).toContain('intent://pay?');
      expect(uri).toContain(`package=${UPI_APP_PACKAGES.gpay}`);
      expect(uri).toContain('scheme=upi');
      expect(uri).toContain('pa=patelmaulik89054-1@okicici');
      expect(uri).toContain('am=1.00');
    });

    it('generates direct PhonePe Chrome Intent', () => {
      const uri = getAppSpecificUpiUri('phonepe', opts);
      expect(uri).toContain('intent://pay?');
      expect(uri).toContain(`package=${UPI_APP_PACKAGES.phonepe}`);
    });

    it('generates direct Paytm Chrome Intent', () => {
      const uri = getAppSpecificUpiUri('paytm', opts);
      expect(uri).toContain('intent://pay?');
      expect(uri).toContain(`package=${UPI_APP_PACKAGES.paytm}`);
    });

    it('generates direct BHIM Chrome Intent', () => {
      const uri = getAppSpecificUpiUri('bhim', opts);
      expect(uri).toContain('intent://pay?');
      expect(uri).toContain(`package=${UPI_APP_PACKAGES.bhim}`);
    });

    it('returns standard upi://pay for generic target', () => {
      const uri = getAppSpecificUpiUri('generic', opts);
      expect(uri).toBe('upi://pay?pa=patelmaulik89054-1@okicici&pn=MrProject&am=1.00&cu=INR&tn=SplitTest');
    });
  });
});
