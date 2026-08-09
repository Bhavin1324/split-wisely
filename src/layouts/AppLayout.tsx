import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Button, Tooltip, Popover, Empty, Drawer } from 'antd';
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
} from 'lucide-react';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { AddFriendModal } from '../components/AddFriendModal';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/friends', label: 'Friends', icon: Users },
  { path: '/spending', label: 'Analytics', icon: PieChart },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Main application layout with persistent sidebar and content area.
 * Uses Outlet from react-router-dom for nested route rendering.
 */
export function AppLayout() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentUser: contextUser, groups: contextGroups } = useAppData();

  // Provide a safe fallback during initial load to prevent crashes.
  const currentUser = contextUser ?? { full_name: 'Loading...', created_at: new Date().toISOString() } as any;
  const groups = contextGroups || [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
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
              className="bg-white/10 hover:bg-white/20 text-white border-none rounded-lg text-xs"
            >
              Group
            </Button>
            <Button
              size="small"
              icon={<UserPlus className="w-3 h-3" />}
              onClick={() => setIsAddFriendOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-none rounded-lg text-xs"
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
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* Groups section header */}
          <div className="pt-6 pb-2 px-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Groups
            </span>
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(true)}
              className="text-gray-400 hover:text-white transition-colors p-1"
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
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
            >
              <div className="w-6 h-6 rounded-md bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                {group.name.charAt(0)}
              </div>
              <span className="truncate">{group.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <Avatar
            size={36}
            style={{ backgroundColor: 'var(--color-primary-500)', fontSize: 14, fontWeight: 600 }}
          >
            {currentUser.full_name
              .split(' ')
              .map((n: string) => n[0])
              .join('')}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {currentUser.full_name}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Popover
              content={<Empty description="No new notifications" className="my-4 mx-2" />}
              trigger="click"
              placement="topRight"
              onOpenChange={(open) => {
                if (open) setHasUnread(false);
              }}
            >
              <Tooltip title="Notifications">
                <button
                  className="relative p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {hasUnread && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  )}
                </button>
              </Tooltip>
            </Popover>
            <Tooltip title="Sign out">
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                onClick={async () => { await signOut(); navigate('/login'); }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface-900 text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg">SplitWisely</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink
            to="/search"
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <Search className="w-5 h-5" />
          </NavLink>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex h-16 pb-safe">
        {/* Left Items */}
        {NAV_ITEMS.filter(item => item.path !== '/search').slice(0, 2).map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Center Add Button */}
        <div className="flex-1 flex justify-center items-center">
          <div className="relative -top-2">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:bg-primary-600 transition-all border-[4px] border-gray-50"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Right Items */}
        {NAV_ITEMS.filter(item => item.path !== '/search').slice(2).map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
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
            <span className="text-sm font-medium text-gray-500">{currentUser.full_name}</span>
            <Button 
              type="text" 
              danger 
              icon={<LogOut className="w-4 h-4" />} 
              onClick={async () => { await signOut(); navigate('/login'); }}
            >
              Sign Out
            </Button>
          </div>
        }
      >
        <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-200">
          <span className="font-semibold text-gray-700">All Groups</span>
          <Button size="small" icon={<Plus className="w-3 h-3" />} onClick={() => { setIsMobileMenuOpen(false); setIsCreateGroupOpen(true); }}>New</Button>
        </div>
        <div className="flex flex-col">
          {groups.map((group) => (
            <NavLink
              key={group.id}
              to={`/groups/${group.id}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-4 border-b border-gray-100 transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold shrink-0 text-lg">
                {group.name.charAt(0)}
              </div>
              <span className="font-medium truncate text-base">{group.name}</span>
            </NavLink>
          ))}
          {groups.length === 0 && (
            <div className="p-8 text-center text-gray-500">
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
