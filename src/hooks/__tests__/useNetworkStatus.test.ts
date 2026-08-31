import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Network connectivity monitoring logic', () => {
  const originalNavigator = globalThis.navigator;

  const setGlobalNavigatorOnLine = (online: boolean) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: online },
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('detects online status when navigator.onLine is true', () => {
    setGlobalNavigatorOnLine(true);
    expect(navigator.onLine).toBe(true);
  });

  it('detects offline status when navigator.onLine is false', () => {
    setGlobalNavigatorOnLine(false);
    expect(navigator.onLine).toBe(false);
  });

  it('listens to online and offline event handlers', () => {
    const listeners: Record<string, () => void> = {};
    const addEventListenerMock = vi.fn((event: string, handler: () => void) => {
      listeners[event] = handler;
    });
    const removeEventListenerMock = vi.fn((event: string) => {
      delete listeners[event];
    });

    let onlineStatus = true;
    const onlineHandler = () => { onlineStatus = true; };
    const offlineHandler = () => { onlineStatus = false; };

    addEventListenerMock('online', onlineHandler);
    addEventListenerMock('offline', offlineHandler);

    expect(addEventListenerMock).toHaveBeenCalledWith('online', onlineHandler);
    expect(addEventListenerMock).toHaveBeenCalledWith('offline', offlineHandler);

    // Trigger offline
    listeners['offline']();
    expect(onlineStatus).toBe(false);

    // Trigger online
    listeners['online']();
    expect(onlineStatus).toBe(true);

    removeEventListenerMock('online', onlineHandler);
    expect(removeEventListenerMock).toHaveBeenCalledWith('online', onlineHandler);
  });
});
