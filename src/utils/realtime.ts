import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Creates an isolated, collision-proof real-time channel subscription.
 * Automatically guarantees unique channel naming, error containment, and safe teardown.
 * Prevents Supabase's fatal "cannot add postgres_changes callbacks after subscribe()" exception.
 */
export function createSafeRealtimeSubscription(
  topicPrefix: string,
  entityId: string,
  builder: (channel: RealtimeChannel) => void,
  onStatusChange?: (status: string, err?: Error) => void
): () => void {
  const channelName = `${topicPrefix}-${entityId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase.channel(channelName);

  try {
    builder(channel);
    channel.subscribe((status, err) => {
      if (err) {
        console.warn(`[Realtime ${channelName}] status: ${status}`, err);
      }
      if (onStatusChange) {
        onStatusChange(status, err);
      }
    });
  } catch (err) {
    console.error(`[Realtime ${channelName}] registration error:`, err);
  }

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn(`[Realtime ${channelName}] cleanup error:`, err);
    }
  };
}
