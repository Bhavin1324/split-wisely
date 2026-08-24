import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DEMO_MODE } from '../../context/AppDataContext';
import { getOrRegisterServiceWorker } from '../../utils/pushNotifications';

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

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clearedUntil, setClearedUntil] = useState<number>(() => {
    return parseInt(localStorage.getItem('notificationsClearedUntil') || '0', 10);
  });

  useEffect(() => {
    if (DEMO_MODE || !user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (err) throw err;
        setNotifications(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channelName = `public-notifications-${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const subscription = supabase.channel(channelName);

    subscription
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));

          // ── Never trigger OS notification banner for your own actions ──
          if (newNotif.actor_id === user.id) {
            return;
          }

          // ── Trigger Native OS Notification (Banner, Sound, Vibration) ──
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            getOrRegisterServiceWorker()
              .then((registration) => {
                if (registration && 'showNotification' in registration) {
                  registration.showNotification(newNotif.title || 'SplitWisely', {
                    body: newNotif.message || 'You have a new update in SplitWisely.',
                    icon: '/pwa-icon.jpg',
                    badge: '/pwa-icon.jpg',
                    vibrate: [150, 50, 150],
                    tag: `splitwisely-${newNotif.id}`,
                    data: {
                      url: newNotif.link || '/dashboard',
                    },
                  } as NotificationOptions);
                } else {
                  new Notification(newNotif.title || 'SplitWisely', {
                    body: newNotif.message || 'You have a new update in SplitWisely.',
                    icon: '/pwa-icon.jpg',
                  });
                }
              })
              .catch(() => {
                try {
                  new Notification(newNotif.title || 'SplitWisely', {
                    body: newNotif.message || 'You have a new update in SplitWisely.',
                    icon: '/pwa-icon.jpg',
                  });
                } catch {
                  // Ignore fallback error
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as AppNotification) : n))
          );
        }
      )
      .subscribe((_status, err) => {
        if (err) console.error(`Realtime error [${channelName}]:`, err);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    if (DEMO_MODE || !user?.id) return;
    
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (DEMO_MODE || !user?.id) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const clearSeen = () => {
    const now = Date.now();
    setClearedUntil(now);
    localStorage.setItem('notificationsClearedUntil', now.toString());
  };

  const visibleNotifications = notifications.filter(n => {
    if (!n.is_read) return true;
    return new Date(n.created_at).getTime() > clearedUntil;
  });

  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length;

  return { notifications: visibleNotifications, unreadCount, loading, error, markAsRead, markAllAsRead, clearSeen };
}
