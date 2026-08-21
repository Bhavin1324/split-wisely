import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyFromInput, copyTextToClipboard, canShare, shareText } from '../clipboard';

describe('clipboard utilities', () => {
  const originalNavigator = globalThis.navigator;
  const originalDocument = (globalThis as unknown as { document?: Document }).document;

  const setGlobalNavigator = (val: unknown) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: val,
      configurable: true,
      writable: true,
    });
  };

  const setGlobalDocument = (val: unknown) => {
    Object.defineProperty(globalThis, 'document', {
      value: val,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setGlobalNavigator(originalNavigator);
    setGlobalDocument(originalDocument);
  });

  describe('copyFromInput', () => {
    it('returns false for empty input and empty text', () => {
      expect(copyFromInput(null, '')).toBe(false);
    });

    it('synchronously focuses and selects rendered input element and runs execCommand', () => {
      setGlobalNavigator({});
      const focusMock = vi.fn();
      const selectMock = vi.fn();
      const setSelectionRangeMock = vi.fn();

      const mockInput = {
        value: 'test@upi',
        focus: focusMock,
        select: selectMock,
        setSelectionRange: setSelectionRangeMock,
      } as unknown as HTMLInputElement;

      const execCommandMock = vi.fn().mockReturnValue(true);
      setGlobalDocument({
        execCommand: execCommandMock,
      });

      const result = copyFromInput(mockInput);
      expect(result).toBe(true);
      expect(focusMock).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalled();
      expect(setSelectionRangeMock).toHaveBeenCalledWith(0, 8);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
    });

    it('triggers navigator.clipboard.writeText when available', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      setGlobalNavigator({
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const result = copyFromInput(null, 'patelmaulik@okicici');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('patelmaulik@okicici');
    });
  });

  describe('copyTextToClipboard', () => {
    it('calls copyFromInput with text', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      setGlobalNavigator({
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const result = await copyTextToClipboard('user@okaxis');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('user@okaxis');
    });
  });

  describe('shareText and canShare', () => {
    it('returns false from canShare when navigator.share is absent', () => {
      setGlobalNavigator({});
      expect(canShare()).toBe(false);
    });

    it('returns true from canShare when navigator.share exists', () => {
      setGlobalNavigator({ share: vi.fn() });
      expect(canShare()).toBe(true);
    });

    it('shares text successfully using navigator.share', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      setGlobalNavigator({ share: shareMock });

      const result = await shareText('friend@upi', 'Pay via UPI');
      expect(result).toBe(true);
      expect(shareMock).toHaveBeenCalledWith({ title: 'Pay via UPI', text: 'friend@upi' });
    });

    it('handles share cancellation or error gracefully', async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error('User cancelled'));
      setGlobalNavigator({ share: shareMock });

      const result = await shareText('friend@upi');
      expect(result).toBe(false);
    });
  });
});
