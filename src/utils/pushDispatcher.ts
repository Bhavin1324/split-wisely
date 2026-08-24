import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../context/AppDataContext';

export interface PushPayload {
  userIds: string[];
  title: string;
  message: string;
  url?: string;
  tag?: string;
}

/**
 * Dispatches a Web Push Notification to the target user IDs via Supabase Edge Function.
 * Designed to be fail-safe: failures are logged silently so they never block user transactions.
 */
export async function dispatchPushNotification({
  userIds,
  title,
  message,
  url = '/dashboard',
  tag = 'splitwisely-update',
}: PushPayload): Promise<void> {
  if (DEMO_MODE || !userIds || userIds.length === 0) {
    return;
  }

  // Filter out invalid IDs
  const validUserIds = userIds.filter((id) => Boolean(id) && id.trim() !== '');
  if (validUserIds.length === 0) return;

  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        user_ids: validUserIds,
        title,
        message,
        url,
        tag,
      },
    });

    if (error) {
      console.warn('Push notification dispatch note (Edge function):', error.message);
    }
  } catch (err) {
    console.warn('Push notification dispatch skipped or offline:', err);
  }
}
