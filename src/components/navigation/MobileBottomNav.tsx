import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Drawer, Button } from "antd";
import {
  LayoutGrid,
  Users,
  Plus,
  Wallet,
  PieChart,
  Receipt,
} from "lucide-react";

interface MobileBottomNavProps {
  onOpenGroupExpense: (groupId?: string) => void;
  onOpenPersonalExpense: () => void;
}

export function MobileBottomNav({
  onOpenGroupExpense,
  onOpenPersonalExpense,
}: MobileBottomNavProps) {
  const location = useLocation();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // 1. Detect Personal Route
  const isPersonalPage = location.pathname.startsWith("/personal");

  // 2. Detect and Extract Active Group ID (handles /group/:id or /groups/:id)
  const groupMatch = location.pathname.match(/^\/groups?\/([^/?#]+)/);
  const activeGroupId = groupMatch ? groupMatch[1] : null;

  const handleFabClick = () => {
    if (isPersonalPage) {
      onOpenPersonalExpense();
    } else if (activeGroupId) {
      onOpenGroupExpense(activeGroupId);
    } else {
      setIsQuickMenuOpen(true);
    }
  };

  return (
    <>
      {/* ── Modern Floating Glassmorphic Dock Container ── */}
      <div className="block md:hidden fixed bottom-3 left-3 right-3 z-50 rounded-2xl bg-bg-surface/95 backdrop-blur-md border border-border-base shadow-2xl h-16">
        <nav className="grid grid-cols-5 h-full items-center px-1">
          {/* Slot 1: Dashboard */}
          <NavLink
            to="/dashboard"
            className="flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-base transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            {({ isActive }) => (
              <>
                <LayoutGrid
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary-500" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium truncate ${
                    isActive ? "text-primary-500 font-semibold" : "text-text-muted"
                  }`}
                >
                  Dashboard
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-500 shadow-[0_0_6px_var(--color-primary-500)]" />
                )}
              </>
            )}
          </NavLink>

          {/* Slot 2: Friends */}
          <NavLink
            to="/friends"
            className="flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-base transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            {({ isActive }) => (
              <>
                <Users
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary-500" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium truncate ${
                    isActive ? "text-primary-500 font-semibold" : "text-text-muted"
                  }`}
                >
                  Friends
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-500 shadow-[0_0_6px_var(--color-primary-500)]" />
                )}
              </>
            )}
          </NavLink>

          {/* Slot 3: Center Action Elevated Quick Action FAB */}
          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={handleFabClick}
              onContextMenu={(e) => {
                e.preventDefault();
                setIsQuickMenuOpen(true);
              }}
              className={`relative -top-0.5 w-12 h-12 rounded-full bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] shadow-lg shadow-[var(--color-primary-500)]/30 flex items-center justify-center text-nav-plus-icon transition-transform duration-200 active:scale-95 [-webkit-tap-highlight-color:transparent] ${
                isQuickMenuOpen ? "rotate-45" : "rotate-0"
              }`}
              aria-label="Add Transaction or Expense"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Slot 4: Personal */}
          <NavLink
            to="/personal"
            className="flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-base transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            {({ isActive }) => (
              <>
                <Wallet
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary-500" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium truncate ${
                    isActive ? "text-primary-500 font-semibold" : "text-text-muted"
                  }`}
                >
                  Personal
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-500 shadow-[0_0_6px_var(--color-primary-500)]" />
                )}
              </>
            )}
          </NavLink>

          {/* Slot 5: Analytics */}
          <NavLink
            to="/spending"
            className="flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-base transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            {({ isActive }) => (
              <>
                <PieChart
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-primary-500" : "text-text-muted"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium truncate ${
                    isActive ? "text-primary-500 font-semibold" : "text-text-muted"
                  }`}
                >
                  Analytics
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-500 shadow-[0_0_6px_var(--color-primary-500)]" />
                )}
              </>
            )}
          </NavLink>
        </nav>
      </div>

      {/* ── Quick Action Drawer ── */}
      <Drawer
        placement="bottom"
        open={isQuickMenuOpen}
        onClose={() => setIsQuickMenuOpen(false)}
        height="auto"
        closable={false}
        className="rounded-t-3xl overflow-hidden"
        styles={{ body: { padding: "20px" } }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-base">
            <span className="font-bold text-base text-text-base">Quick Actions</span>
            <span className="text-xs text-text-muted">Choose expense type</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => {
                setIsQuickMenuOpen(false);
                onOpenGroupExpense();
              }}
              className="flex items-center gap-4 p-3.5 rounded-2xl bg-bg-subtle hover:bg-border-base transition-colors text-left border border-border-base w-full"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-text-base text-sm">Add Group Expense</div>
                <div className="text-xs text-text-muted">Split bills across shared groups or friends</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsQuickMenuOpen(false);
                onOpenPersonalExpense();
              }}
              className="flex items-center gap-4 p-3.5 rounded-2xl bg-bg-subtle hover:bg-border-base transition-colors text-left border border-border-base w-full"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--color-danger-500)]/10 text-[var(--color-danger-500)] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-text-base text-sm">Add Personal Expense</div>
                <div className="text-xs text-text-muted">Track your personal income & spending cash flow</div>
              </div>
            </button>
          </div>

          <Button
            block
            size="large"
            onClick={() => setIsQuickMenuOpen(false)}
            className="rounded-xl mt-2"
          >
            Cancel
          </Button>
        </div>
      </Drawer>
    </>
  );
}
