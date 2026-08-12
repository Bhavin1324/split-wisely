import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Avatar, Button, Tooltip, Popover, Drawer } from "antd";
import {
  LayoutDashboard,
  Users,
  PieChart,
  Search,
  Settings,
  LogOut,
  Plus,
  Receipt,
  UserPlus,
  Bell,
  Menu,
} from "lucide-react";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { AddFriendModal } from "../components/AddFriendModal";
import { NotificationList } from "../components/ui/NotificationList";
import { useNotifications } from "../hooks/supabase/useNotifications";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/spending", label: "Analytics", icon: PieChart },
  { path: "/search", label: "Search", icon: Search },
  { path: "/settings", label: "Settings", icon: Settings },
];

/**
 * Main application layout with persistent sidebar and content area.
 * Uses Outlet from react-router-dom for nested route rendering.
 */
export function AppLayout() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const [mobileNotificationPopoverOpen, setMobileNotificationPopoverOpen] =
    useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentUser: contextUser, groups: contextGroups } = useAppData();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

  // Provide a safe fallback during initial load to prevent crashes.
  const currentUser =
    contextUser ??
    ({ full_name: "Loading...", created_at: new Date().toISOString() } as any);
  const groups = contextGroups || [];

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-nav-bg border-r border-nav-border text-nav-text backdrop-blur-xl z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-nav-border">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">SplitWisely</span>
        </div>

        {/* Action CTAs */}
        <div className="px-4 pt-5 pb-2 space-y-2">
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsExpenseModalOpen(true)}
            className="w-full h-10 rounded-xl font-semibold text-sm"
            id="add-expense-btn"
          >
            Add Expense
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="small"
              icon={<Plus className="w-3 h-3" />}
              onClick={() => setIsCreateGroupOpen(true)}
              className="bg-nav-icon-bg hover:bg-nav-icon-hover text-nav-text border-none rounded-lg text-xs"
            >
              Group
            </Button>
            <Button
              size="small"
              icon={<UserPlus className="w-3 h-3" />}
              onClick={() => setIsAddFriendOpen(true)}
              className="bg-nav-icon-bg hover:bg-nav-icon-hover text-nav-text border-none rounded-lg text-xs"
            >
              Friend
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-primary-500/10 text-primary-600 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary-500 before:rounded-r-full"
                    : "text-nav-text-muted hover:bg-nav-icon-bg hover:text-nav-text"
                }`
              }
            >
              {({ isActive }) => (
                <span
                  className={` flex gap-2 ${
                    isActive
                      ? "text-primary-500"
                      : "text-nav-text-muted group-hover:text-nav-text"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors duration-200`}
                  />
                  <span>{label}</span>
                </span>
              )}
            </NavLink>
          ))}

          {/* Groups section header */}
          <div className="pt-6 pb-2 px-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Groups
            </span>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-text-muted hover:text-white transition-colors p-1"
              title="Create New Group"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {groups.map((group) => (
            <NavLink
              key={group.id}
              to={`/groups/${group.id}`}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "sidebar-item-active" : "sidebar-item-inactive"}`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary-500/20 text-primary-400"
                        : "bg-bg-subtle text-text-muted group-hover:text-text-base group-hover:bg-border-base"
                    }`}
                  >
                    {group.name.charAt(0)}
                  </div>
                  <span className="truncate">{group.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-nav-border px-4 py-3 flex items-center gap-3">
          <Avatar
            size={36}
            style={{
              backgroundColor: "var(--color-primary-500)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {currentUser.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {currentUser.full_name}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Popover
              content={
                <NotificationList
                  notifications={notifications}
                  loading={loading}
                  unreadCount={unreadCount}
                  markAsRead={markAsRead}
                  markAllAsRead={markAllAsRead}
                  onClose={() => setNotificationPopoverOpen(false)}
                />
              }
              trigger="click"
              placement="topRight"
              open={notificationPopoverOpen}
              onOpenChange={setNotificationPopoverOpen}
              overlayStyle={{ maxWidth: "calc(100vw - 32px)" }}
              overlayInnerStyle={{
                padding: 0,
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <Tooltip title="Notifications">
                <button className="relative p-1.5 rounded-lg text-nav-text-muted hover:text-nav-text hover:bg-nav-icon-bg transition-colors cursor-pointer">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-surface-900" />
                  )}
                </button>
              </Tooltip>
            </Popover>
            <Tooltip title="Sign out">
              <button
                className="p-1.5 rounded-lg text-nav-text-muted hover:text-nav-text hover:bg-nav-icon-bg transition-colors"
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-nav-bg text-nav-text border-b border-nav-border backdrop-blur-xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg">SplitWisely</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="relative p-1.5 bg-nav-icon-bg hover:bg-nav-icon-hover rounded-lg transition-colors text-nav-text"
            onClick={() => setMobileNotificationPopoverOpen(true)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface-900" />
            )}
          </button>

          <Drawer
            placement="top"
            closable={false}
            onClose={() => setMobileNotificationPopoverOpen(false)}
            open={mobileNotificationPopoverOpen}
            height="85vh"
            styles={{ body: { padding: 0 } }}
            className="rounded-b-3xl overflow-hidden shadow-2xl"
          >
            <NotificationList
              notifications={notifications}
              loading={loading}
              unreadCount={unreadCount}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              onClose={() => setMobileNotificationPopoverOpen(false)}
            />
          </Drawer>
          <NavLink
            to="/search"
            className="!p-1.5 !bg-nav-icon-bg !hover:bg-nav-icon-hover !rounded-lg !transition-colors !text-nav-text"
          >
            <Search className="w-5 h-5" />
          </NavLink>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 bg-nav-icon-bg hover:bg-nav-icon-hover rounded-lg transition-colors text-nav-text"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border-base flex h-16 pb-safe">
        {/* Left Items */}
        {NAV_ITEMS.filter((item) => item.path !== "/search")
          .slice(0, 2)
          .map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              // Kept purely for flex layout and removing the ugly mobile browser tap flash
              className="flex-1 flex flex-col items-center justify-center gap-1 [-webkit-tap-highlight-color:transparent]"
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? "text-primary-500" : "text-text-muted"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors duration-200 ${
                      isActive ? "text-primary-500" : "text-text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

        {/* Center Add Button */}
        <div className="flex-1 flex justify-center items-center">
          <div className="relative -top-1">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white transition-colors duration-200 active:bg-primary-600 [-webkit-tap-highlight-color:transparent]"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Right Items */}
        {NAV_ITEMS.filter((item) => item.path !== "/search")
          .slice(2)
          .map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center gap-1 [-webkit-tap-highlight-color:transparent]"
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? "text-primary-500" : "text-text-muted"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors duration-200 ${
                      isActive ? "text-primary-500" : "text-text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* ── Mobile Groups Drawer ── */}
      <Drawer
        title="Your Groups"
        placement="right"
        onClose={() => setIsMobileMenuOpen(false)}
        open={isMobileMenuOpen}
        className="md:hidden flex flex-col"
        styles={{ body: { padding: 0 } }}
        footer={
          <div className="flex items-center justify-between p-2">
            <span className="text-sm font-medium text-text-muted">
              {currentUser.full_name}
            </span>
            <Button
              type="text"
              danger
              icon={<LogOut className="w-4 h-4" />}
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
            >
              Sign Out
            </Button>
          </div>
        }
      >
        <div className="p-4 flex justify-between items-center bg-bg-base border-b border-border-base">
          <span className="font-semibold text-base">All Groups</span>
          <Button
            icon={<Plus className="w-3 h-3" />}
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsCreateGroupOpen(true);
            }}
          >
            New
          </Button>
        </div>
        <div className="flex flex-col">
          {groups.map((group) => (
            <NavLink
              key={group.id}
              to={`/groups/${group.id}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-4 border-b border-border-base transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-700 hover:bg-bg-base"
                }`
              }
            >
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold shrink-0 text-lg">
                {group.name.charAt(0)}
              </div>
              <span className="font-medium truncate text-base">
                {group.name}
              </span>
            </NavLink>
          ))}
          {groups.length === 0 && (
            <div className="p-8 text-center text-text-muted">
              No groups yet. Create one to get started!
            </div>
          )}
        </div>
      </Drawer>

      {/* ── Modals ── */}
      <AddExpenseModal
        open={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />
      <CreateGroupModal
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={(groupId) => navigate(`/groups/${groupId}`)}
      />
      <AddFriendModal
        open={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
    </div>
  );
}
