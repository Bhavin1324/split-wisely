import { describe, it, expect } from 'vitest';
import { SplitEngine } from '../../core/domain/SplitEngine';

describe('Equal Split Calculation & Selection Invariants', () => {
  it('allocates 100% of the amount when exactly one participant is selected', () => {
    const totalAmount = 50000; // ₹500.00
    const singleUserId = 'user-single';
    const splits = SplitEngine.equalSplit(totalAmount, [singleUserId]);

    expect(splits.length).toBe(1);
    expect(splits[0].userId).toBe(singleUserId);
    expect(splits[0].amountOwed).toBe(totalAmount);
  });

  it('guarantees unique participant calculation when set deduplication is applied', () => {
    const totalAmount = 30000; // ₹300.00
    const duplicateList = ['user-1', 'user-1', 'user-1'];
    const uniqueList = Array.from(new Set(duplicateList));

    expect(uniqueList.length).toBe(1);
    const splits = SplitEngine.equalSplit(totalAmount, uniqueList);
    expect(splits.length).toBe(1);
    expect(splits[0].userId).toBe('user-1');
    expect(splits[0].amountOwed).toBe(30000);
  });

  it('correctly splits evenly between 2 selected participants out of 4 group members', () => {
    const totalAmount = 25000; // ₹250.00
    const selectedParticipants = ['user-1', 'user-3'];
    const splits = SplitEngine.equalSplit(totalAmount, selectedParticipants);

    expect(splits.length).toBe(2);
    expect(splits[0].amountOwed).toBe(12500);
    expect(splits[1].amountOwed).toBe(12500);
    expect(splits[0].amountOwed + splits[1].amountOwed).toBe(totalAmount);
  });

  it('reconciles remainder cents across selected participants without losing a penny', () => {
    const totalAmount = 1000; // 1000 cents (₹10.00) across 3 participants
    const participants = ['user-a', 'user-b', 'user-c'];
    const splits = SplitEngine.equalSplit(totalAmount, participants);

    expect(splits.length).toBe(3);
    const sum = splits.reduce((acc, s) => acc + s.amountOwed, 0);
    expect(sum).toBe(totalAmount);

    // 1000 / 3 = 333 with remainder 1 -> first participant receives 334, others 333
    expect(splits[0].amountOwed).toBe(334);
    expect(splits[1].amountOwed).toBe(333);
    expect(splits[2].amountOwed).toBe(333);
  });

  it('handles empty participant list gracefully by returning empty splits', () => {
    const splits = SplitEngine.equalSplit(10000, []);
    expect(splits).toEqual([]);
  });
});
