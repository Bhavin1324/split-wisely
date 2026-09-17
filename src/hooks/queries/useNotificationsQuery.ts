import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getOrRegisterServiceWorker } from '../../utils/pushNotifications';
import { createSafeRealtimeSubscription } from '../../utils/realtime';
import { APP_ASSETS } from '../../constants/assets';

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

/**
 * Fetch and manage user notifications with real-time push and background cache revalidation.
 */
export function useNotificationsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  const [clearedUntil, setClearedUntil] = useState<number>(() => {
    return parseInt(localStorage.getItem('notificationsClearedUntil') || '0', 10);
  });

  const query = useQuery({
    queryKey: queryKeys.notifications.list(userId),
    queryFn: async (): Promise<AppNotification[]> => {
      if (!userId || DEMO_MODE) return [];

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.warn('Notifications fetch warning:', error.message);
          return [];
        }
        return (data || []) as AppNotification[];
      } catch (err) {
        console.warn('Notifications unexpected fetch error:', err);
        return [];
      }
    },
    enabled: Boolean(userId),
  });

  // Scoped real-time subscription for notifications & native OS dispatch
  useEffect(() => {
    if (!userId || DEMO_MODE) return;

    return createSafeRealtimeSubscription('realtime-notifications', userId, (channel) => {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(userId) });

          // Never trigger OS notification banner for your own actions
          if (newNotif.actor_id === userId) return;

          // Trigger Native OS Notification
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            const origin = window.location.origin;
            const absoluteBadge = new URL(APP_ASSETS.notifications.badge, origin).href;
            const absoluteIcon = new URL(APP_ASSETS.notifications.icon, origin).href;

            getOrRegisterServiceWorker()
              .then((registration) => {
                if (registration && 'showNotification' in registration) {
                  registration.showNotification(newNotif.title || 'Centfolio', {
                    body: newNotif.message || 'You have a new update in Centfolio.',
                    icon: absoluteIcon,
                    badge: absoluteBadge,
                    vibrate: [150, 50, 150],
                    tag: `centfolio-${newNotif.id}`,
                    data: {
                      url: newNotif.link || '/dashboard',
                    },
                  } as NotificationOptions);
                } else {
                  new Notification(newNotif.title || 'Centfolio', {
                    body: newNotif.message || 'You have a new update in Centfolio.',
                    icon: absoluteIcon,
                  });
                }
              })
              .catch((err) => {
                console.warn('Native notification dispatch error:', err);
              });
          }
        }
      );
    });
  }, [userId, queryClient]);

  const markAllAsRead = async () => {
    if (!userId || DEMO_MODE) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      queryClient.setQueryData<AppNotification[]>(
        queryKeys.notifications.list(userId),
        (old = []) => old.map((n) => ({ ...n, is_read: true }))
      );
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    }
  };

  const markAsRead = async (id: string) => {
    if (!userId || DEMO_MODE) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);

      queryClient.setQueryData<AppNotification[]>(
        queryKeys.notifications.list(userId),
        (old = []) => old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const clearAllNotifications = async () => {
    const now = Date.now();
    localStorage.setItem('notificationsClearedUntil', now.toString());
    setClearedUntil(now);

    if (!userId || DEMO_MODE) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(userId), []);
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  const allNotifications = Array.isArray(query.data) ? query.data : [];
  const visibleNotifications = allNotifications.filter((n) => {
    if (!n || !n.created_at) return false;
    const time = new Date(n.created_at).getTime();
    return !isNaN(time) && time > clearedUntil;
  });
  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length;

  return {
    notifications: visibleNotifications,
    unreadCount,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    clearSeen: clearAllNotifications,
    refetch: query.refetch,
  };
}
