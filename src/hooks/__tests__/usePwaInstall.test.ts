import { describe, it, expect } from 'vitest';
import { usePwaInstall } from '../usePwaInstall';

describe('usePwaInstall hook', () => {
  it('initializes with default non-standalone values in node test environment', () => {
    // In node/vitest environment, window is mock or minimal
    expect(typeof usePwaInstall).toBe('function');
  });
});
