import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSafeRealtimeSubscription } from '../realtime';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  };
});

describe('createSafeRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates distinct collision-proof channel names for identical prefixes and entity IDs', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => {
        if (cb) cb('SUBSCRIBED', null);
        return mockChannel;
      }),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    const builder = vi.fn();

    const unsub1 = createSafeRealtimeSubscription('realtime-group-members', 'group-123', builder);
    const unsub2 = createSafeRealtimeSubscription('realtime-group-members', 'group-123', builder);

    expect(supabase.channel).toHaveBeenCalledTimes(2);

    const call1ChannelName = (supabase.channel as any).mock.calls[0][0];
    const call2ChannelName = (supabase.channel as any).mock.calls[1][0];

    expect(call1ChannelName).toMatch(/^realtime-group-members-group-123-\d+-[a-z0-9]+$/);
    expect(call2ChannelName).toMatch(/^realtime-group-members-group-123-\d+-[a-z0-9]+$/);
    expect(call1ChannelName).not.toBe(call2ChannelName);

    unsub1();
    unsub2();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
  });

  it('calls the builder with the channel and then subscribes', () => {
    const callOrder: string[] = [];
    const mockChannel = {
      on: vi.fn(() => {
        callOrder.push('on');
        return mockChannel;
      }),
      subscribe: vi.fn((cb) => {
        callOrder.push('subscribe');
        if (cb) cb('SUBSCRIBED', null);
        return mockChannel;
      }),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    createSafeRealtimeSubscription('test-topic', 'entity-1', (channel) => {
      channel.on('postgres_changes', {} as any, () => {});
    });

    expect(callOrder).toEqual(['on', 'subscribe']);
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('safely catches errors in the builder without crashing the caller', () => {
    const mockChannel = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);

    expect(() => {
      createSafeRealtimeSubscription('test-topic', 'entity-1', () => {
        throw new Error('cannot add postgres_changes callbacks after subscribe()');
      });
    }).not.toThrow();
  });

  it('safely handles cleanup errors during unsubscribe without throwing', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);
    (supabase.removeChannel as any).mockImplementation(() => {
      throw new Error('Supabase teardown failed');
    });

    const unsub = createSafeRealtimeSubscription('test-topic', 'entity-1', () => {});

    expect(() => {
      unsub();
    }).not.toThrow();
  });
});
