import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Drawer } from "antd";
import { Bell, Search, Menu } from "lucide-react";
import { NotificationList } from "../ui/NotificationList";
import type { AppNotification } from "../../hooks/supabase/useNotifications";

interface MobileHeaderProps {
  unreadCount: number;
  notifications: AppNotification[];
  loading: boolean;
  markAsRead: (id: string) => Promise<void> | void;
  markAllAsRead: () => Promise<void> | void;
  clearSeen: () => Promise<void> | void;
  onOpenMobileMenu: () => void;
}

/**
 * MobileHeader
 * Dedicated top navigation header for mobile viewports.
 * Uses semantic theme tokens (bg-bg-surface, text-text-base) to match the status bar
 * color and guarantee high contrast in both light and dark modes.
 */
export function MobileHeader({
  unreadCount,
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
  clearSeen,
  onOpenMobileMenu,
}: MobileHeaderProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-bg-surface/95 text-text-base border-b border-border-subtle backdrop-blur-xl flex items-center justify-between px-4 pb-3 mobile-header-safe transition-colors duration-200">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center overflow-hidden shadow-sm transition-colors duration-200">
          <img src="/brand-logo.png" alt="Centfolio" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-lg tracking-tight text-text-base">Centfolio</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-xl bg-bg-subtle/80 hover:bg-bg-subtle text-text-base transition-colors"
          onClick={() => setNotificationOpen(true)}
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-bg-surface" />
          )}
        </button>

        <Drawer
          placement="top"
          closable={false}
          onClose={() => setNotificationOpen(false)}
          open={notificationOpen}
          height="70vh"
          styles={{ body: { padding: 0 } }}
          className="rounded-b-3xl overflow-hidden shadow-2xl"
        >
          <NotificationList
            notifications={notifications}
            loading={loading}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            clearSeen={clearSeen}
            onClose={() => setNotificationOpen(false)}
          />
        </Drawer>

        <NavLink
          to="/search"
          aria-label="Search"
          className="!p-2 !rounded-xl !bg-bg-subtle/80 !hover:bg-bg-subtle !text-text-base !transition-colors !inline-flex !items-center !justify-center"
        >
          <Search className="w-4.5 h-4.5" />
        </NavLink>

        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-bg-subtle/80 hover:bg-bg-subtle text-text-base transition-colors"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
