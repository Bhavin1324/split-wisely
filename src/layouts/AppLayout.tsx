import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Button, Tooltip } from 'antd';
import {
  LayoutDashboard,
  Users,
  PieChart,
  Search,
  Settings,
  LogOut,
  Plus,
  Receipt,
} from 'lucide-react';
import { MOCK_CURRENT_USER, MOCK_GROUPS } from '../lib/mockData';
import { AddExpenseModal } from '../components/AddExpenseModal';

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
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">SplitWisely</span>
        </div>

        {/* Add Expense CTA */}
        <div className="px-4 pt-5 pb-2">
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsExpenseModalOpen(true)}
            className="w-full h-10 rounded-xl font-semibold text-sm"
            id="add-expense-btn"
          >
            Add Expense
          </Button>
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

          {/* Groups section */}
          <div className="pt-6 pb-2 px-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Groups
            </span>
          </div>
          {MOCK_GROUPS.map((group) => (
            <NavLink
              key={group.id}
              to={`/groups/${group.id}`}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
            >
              <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
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
            style={{ backgroundColor: '#1db954', fontSize: 14, fontWeight: 600 }}
          >
            {MOCK_CURRENT_USER.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {MOCK_CURRENT_USER.full_name}
            </div>
            <div className="text-[11px] text-gray-400">Pro Tier Parity</div>
          </div>
          <Tooltip title="Sign out">
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => navigate('/login')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface-900 text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-bold">SplitWisely</span>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsExpenseModalOpen(true)}
        >
          Add
        </Button>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? 'text-brand-500' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Add Expense Modal ── */}
      <AddExpenseModal
        open={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />
    </div>
  );
}
