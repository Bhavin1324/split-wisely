import { useAuth } from '../../context/AuthContext';
import { useNotificationsQuery, type AppNotification } from '../queries/useNotificationsQuery';

export type { AppNotification };

/**
 * Hook to retrieve and manage user notifications with real-time push and background cache revalidation.
 * Backed by TanStack Query.
 */
export function useNotifications() {
  const { user } = useAuth();
  return useNotificationsQuery(user?.id);
}
