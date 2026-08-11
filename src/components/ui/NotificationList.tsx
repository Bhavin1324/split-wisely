import { List, Typography, Button, Empty, Avatar, Spin } from 'antd';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../../hooks/supabase/useNotifications';
import { formatRelativeTime } from '../../utils/date';

const { Text } = Typography;

interface NotificationListProps {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  onClose?: () => void;
}

export function NotificationList({ 
  notifications, 
  loading, 
  unreadCount, 
  markAsRead, 
  markAllAsRead, 
  onClose 
}: NotificationListProps) {
  const navigate = useNavigate();

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
      <div className="flex justify-center items-center py-8">
        <Spin />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-8">
        <Empty description="No notifications yet" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-sm" style={{ maxHeight: '400px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} className="px-0">
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="overflow-y-auto custom-scrollbar flex-1 p-0 m-0">
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              className={`cursor-pointer px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                !item.is_read ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => handleNotificationClick(item)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={item.type === 'SETTLEMENT_RECORDED' ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />} 
                    className={`${!item.is_read ? 'bg-primary-500' : 'bg-gray-300'}`}
                  />
                }
                title={
                  <div className="flex justify-between items-start">
                    <Text strong className={`${!item.is_read ? 'text-gray-900' : 'text-gray-600'} text-sm`}>
                      {item.title}
                    </Text>
                    {item.link && <ExternalLink className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0 ml-2" />}
                  </div>
                }
                description={
                  <div className="flex flex-col mt-0.5">
                    <Text className={`text-xs ${!item.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {item.message}
                    </Text>
                    <Text type="secondary" className="text-[10px] mt-1">
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}
