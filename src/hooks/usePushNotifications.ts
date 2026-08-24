import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  isPushSupported,
  getNotificationPermissionState,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  sendLocalTestNotification,
  getOrRegisterServiceWorker,
  type TestNotificationResult,
} from '../utils/pushNotifications';

export interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  loading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTest: () => Promise<TestNotificationResult>;
  refreshStatus: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth();
  const [isSupported] = useState<boolean>(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermissionState()
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setIsSubscribed(false);
      setPermission('unsupported');
      setLoading(false);
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // If permission is default or denied, no push subscription can exist
    if (currentPermission !== 'granted') {
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    const userDisabled = localStorage.getItem('splitwisely_push_enabled') === 'false';
    if (userDisabled) {
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    try {
      const registration = await getOrRegisterServiceWorker();
      if (registration && registration.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      } else {
        setIsSubscribed(currentPermission === 'granted');
      }
    } catch {
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, user?.id]);

  const subscribe = async (): Promise<boolean> => {
    setLoading(true);
    localStorage.setItem('splitwisely_push_enabled', 'true');
    try {
      const sub = await subscribeUserToPush(user?.id);
      setIsSubscribed(Boolean(sub));
      setPermission(Notification.permission);
      return Boolean(sub);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);
    localStorage.setItem('splitwisely_push_enabled', 'false');
    try {
      const success = await unsubscribeUserFromPush(user?.id);
      setIsSubscribed(false);
      return success;
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async (): Promise<TestNotificationResult> => {
    const result = await sendLocalTestNotification();
    if (result.permission && result.permission !== 'unsupported') {
      setPermission(result.permission);
      if (result.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
    return result;
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
    refreshStatus,
  };
}
