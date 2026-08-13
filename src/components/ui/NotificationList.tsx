import { useState, useMemo } from "react";
import { List, Typography, Button, Avatar, Spin, Segmented } from "antd";
import { Bell, Check, ExternalLink, BellRing } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "../../hooks/supabase/useNotifications";
import { formatRelativeTime } from "../../utils/date";

const { Text } = Typography;

interface NotificationListProps {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearSeen: () => void;
  onClose?: () => void;
}

export function NotificationList({
  notifications,
  loading,
  unreadCount,
  markAsRead,
  markAllAsRead,
  clearSeen,
  onClose,
}: NotificationListProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, activeTab]);

  const hasSeenNotifications = notifications.some((n) => n.is_read);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 w-full h-full sm:w-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[400px] sm:max-h-[65vh] bg-bg-surface">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-border-base bg-bg-surface sticky top-0 z-10 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <Text strong className="text-base flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary-100 text-primary-700 text-xs py-0.5 px-2 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </Text>
          <div className="flex items-center gap-2">
            {hasSeenNotifications && (
              <Button
                type="link"
                size="small"
                onClick={clearSeen}
                className="px-0 text-sm text-text-muted hover:text-text-base font-medium"
              >
                Clear read
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={markAllAsRead}
                className="px-0 text-sm text-primary-600 font-medium"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        
          <Segmented
            block
            value={activeTab}
            onChange={(val) => setActiveTab(val as "all" | "unread")}
            options={[
              { label: "All", value: "all" },
              { label: "Unread", value: "unread" },
            ]}
            className="bg-bg-subtle/70 p-1"
          />
      </div>

      {/* List Content */}
      <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[65vh] sm:max-h-[450px] px-4">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center mb-3">
              <BellRing className="w-6 h-6 text-gray-300" />
            </div>
            <Text className="text-text-muted font-medium text-sm">
              {activeTab === "unread"
                ? "You're all caught up!"
                : "No notifications yet"}
            </Text>
          </div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredNotifications}
            renderItem={(item) => (
              <List.Item
                className={`cursor-pointer px-4 py-3 transition-colors border-b border-border-base/40 last:border-b-0 ${
                  !item.is_read
                    ? "bg-primary-500/10 dark:bg-primary-500/20 border-l-4 border-l-primary-500 font-semibold"
                    : "hover:bg-bg-subtle/80"
                }`}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={
                        item.type === "SETTLEMENT_RECORDED" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4 text-white" />
                        )
                      }
                      className={`flex-shrink-0 mt-0.5 shadow-sm ${!item.is_read ? "bg-primary-500 text-white" : "bg-bg-subtle text-text-muted"}`}
                    />
                  }
                  title={
                    <div className="flex justify-between items-start gap-2">
                      <Text
                        className={`${!item.is_read ? "text-text-base font-bold" : "text-text-muted font-medium"} text-sm leading-tight`}
                      >
                        {item.title}
                      </Text>
                      {item.link && (
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  }
                  description={
                    <div className="flex flex-col mt-1">
                      <Text
                        className={`text-xs leading-relaxed ${!item.is_read ? "text-text-base font-semibold" : "text-text-muted"}`}
                      >
                        {item.message}
                      </Text>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 inline-block animate-pulse" />
                        )}
                        <Text
                          type="secondary"
                          className="text-[10px] font-medium tracking-wide"
                        >
                          {formatRelativeTime(item.created_at)}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
}
