import { describe, it, expect } from 'vitest';
import { SplitEngine } from './SplitEngine';

describe('SplitEngine', () => {
  it('should split equally', () => {
    const result = SplitEngine.equalSplit(100, ['u1', 'u2', 'u3']);
    expect(result).toEqual([
      { userId: 'u1', amountOwed: 34 },
      { userId: 'u2', amountOwed: 33 },
      { userId: 'u3', amountOwed: 33 },
    ]);
  });

  it('should split exactly', () => {
    const result = SplitEngine.exactSplit(100, [
      { userId: 'u1', amount: 40 },
      { userId: 'u2', amount: 60 },
    ]);
    expect(result).toEqual([
      { userId: 'u1', amountOwed: 40 },
      { userId: 'u2', amountOwed: 60 },
    ]);
  });

  it('should throw if exact split doesnt sum up', () => {
    expect(() => {
      SplitEngine.exactSplit(100, [
        { userId: 'u1', amount: 40 },
        { userId: 'u2', amount: 50 },
      ]);
    }).toThrow();
  });

  it('should split by percentages', () => {
    const result = SplitEngine.percentageSplit(1000, [
      { userId: 'u1', percentage: 33.33 },
      { userId: 'u2', percentage: 33.33 },
      { userId: 'u3', percentage: 33.34 },
    ]);
    // 33.33% of 1000 is 333
    // 33.34% of 1000 is 333 (Math.round(333.4))
    // Sum = 999. Remaining 1 cent goes to largest percentage (u3).
    expect(result).toEqual([
      { userId: 'u1', amountOwed: 333 },
      { userId: 'u2', amountOwed: 333 },
      { userId: 'u3', amountOwed: 334 },
    ]);
  });

  it('should split by shares', () => {
    const result = SplitEngine.sharesSplit(100, [
      { userId: 'u1', share: 1 },
      { userId: 'u2', share: 2 },
    ]);
    // u1 gets 1/3 of 100 = 33
    // u2 gets 2/3 of 100 = 66
    // diff is 1, goes to largest share (u2).
    expect(result).toEqual([
      { userId: 'u1', amountOwed: 33 },
      { userId: 'u2', amountOwed: 67 }, // 66 + 1
    ]);
  });
});
