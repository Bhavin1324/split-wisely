import { Drawer, Avatar, Button } from "antd";
import { NavLink } from "react-router-dom";
import { Receipt, Settings, Plus, LogOut, X } from "lucide-react";
import type { Group, Profile } from "../../types";

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  currentUser: Profile;
  onOpenCreateGroup: () => void;
  onSignOut: () => Promise<void> | void;
}

export function SidebarDrawer({
  open,
  onClose,
  groups,
  currentUser,
  onOpenCreateGroup,
  onSignOut,
}: SidebarDrawerProps) {
  return (
    <Drawer
      placement="left"
      width={300}
      open={open}
      onClose={onClose}
      closable={false}
      className="md:hidden"
      styles={{ body: { padding: 0 } }}
      maskClassName="backdrop-blur-sm bg-black/60"
    >
      <div className="flex flex-col h-full bg-bg-surface text-text-base">
        {/* ── 1. Header Section ── */}
        <div className="shrink-0 p-4 border-b border-border-base flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-text-base">
              SplitWisely
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-bg-subtle transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Scrollable Content Section ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {/* Section 1: Quick Actions & Settings */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              General
            </div>
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? "bg-primary-500/10 text-primary-500 font-semibold"
                    : "text-text-base hover:bg-bg-subtle"
                }`
              }
            >
              <Settings className="w-5 h-5 text-text-muted" />
              <span className="text-sm">Settings</span>
            </NavLink>
          </div>

          {/* Section 2: Your Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <span>Your Groups</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateGroup();
                }}
                className="text-primary-500 hover:underline flex items-center gap-1 font-semibold normal-case text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-1">
              {groups.map((group) => (
                <NavLink
                  key={group.id}
                  to={`/groups/${group.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary-500/10 text-primary-500 font-semibold"
                        : "text-text-base hover:bg-bg-subtle"
                    }`
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 font-bold flex items-center justify-center shrink-0 text-sm border border-primary-500/20">
                    {group.name.charAt(0)}
                  </div>
                  <span className="font-medium truncate text-sm">
                    {group.name}
                  </span>
                </NavLink>
              ))}

              {groups.length === 0 && (
                <div className="p-4 text-center text-xs text-text-muted bg-bg-subtle/50 rounded-xl border border-border-base">
                  No groups yet. Create one to get started!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Fixed Footer Section ── */}
        <div className="shrink-0 p-4 border-t border-border-base bg-bg-subtle/50 pb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar
              size={32}
              style={{
                backgroundColor: "var(--color-primary-500)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {(currentUser.full_name || "User")
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-text-base">
                {currentUser.full_name || "User"}
              </div>
            </div>
          </div>

          <Button
            type="text"
            danger
            icon={<LogOut className="w-4 h-4" />}
            onClick={onSignOut}
            className="shrink-0 text-xs flex items-center"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
