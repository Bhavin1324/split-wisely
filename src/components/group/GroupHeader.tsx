import { useState, useEffect, useMemo } from "react";
import { Button, Dropdown, Switch, App, Tooltip } from "antd";
import { Users, ArrowRight, Settings, CheckCircle2, Plus, UserPlus, LogOut, Trash2, Info, Camera } from "lucide-react";
import type { MenuProps } from "antd";
import { formatCents } from "../../utils/currency";
import { updateGroupSettings } from "../../hooks/supabase/useMutations";
import { queryClient } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import type { Group } from "../../types";
import { GroupCoverModal } from "./GroupCoverModal";
import { GroupStatusCard } from "./GroupStatusCard";
import { useGroupHeaderActions } from "./useGroupHeaderActions";

export function GroupHeader({
  group,
  groupMembers,
  myDebts,
  getProfile,
  userId,
  userNetBalance,
  displayedDebts,
  onOpenMembers,
  onOpenAddExpense,
  onOpenInvite,
}: {
  group: Group;
  groupMembers: any[];
  myDebts: any[];
  getProfile: (id: string) => any;
  userId: string;
  userNetBalance: number;
  displayedDebts: any[];
  onOpenMembers: () => void;
  onOpenAddExpense: () => void;
  onOpenInvite: () => void;
}) {
  const { message } = App.useApp();
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  // Optimistic simplify state for 0ms visual feedback
  const [isOptimisticSimplified, setIsOptimisticSimplified] = useState(group?.simplify_debts !== false);
  const [isUpdatingSimplify, setIsUpdatingSimplify] = useState(false);

  useEffect(() => {
    setIsOptimisticSimplified(group?.simplify_debts !== false);
  }, [group?.simplify_debts]);

  const { handleLeaveGroup, handleDeleteGroup } = useGroupHeaderActions({
    group,
    userId,
    userNetBalance,
    hasUnsettledDebts: displayedDebts.length > 0,
  });

  const handleToggleSimplify = async (checked: boolean) => {
    if (isUpdatingSimplify) return;
    setIsUpdatingSimplify(true);

    // 1. Instant 0ms optimistic local update
    setIsOptimisticSimplified(checked);

    // 2. Instant 0ms optimistic TanStack cache update for immediate calculation/tag response
    queryClient.setQueriesData<Group[]>({ queryKey: queryKeys.groups.all }, (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((g) => (g.id === group.id ? { ...g, simplify_debts: checked } : g));
    });

    try {
      await updateGroupSettings(group.id, { simplify_debts: checked });
      message.success(`Debt simplification turned ${checked ? "on" : "off"}`);
    } catch (error: any) {
      // 3. Rollback on failure
      setIsOptimisticSimplified(!checked);
      queryClient.setQueriesData<Group[]>({ queryKey: queryKeys.groups.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((g) => (g.id === group.id ? { ...g, simplify_debts: !checked } : g));
      });
      message.error(error.message || "Failed to update setting");
    } finally {
      setIsUpdatingSimplify(false);
    }
  };

  const settingsMenu: MenuProps["items"] = useMemo(
    () => [
      {
        key: "cover",
        className: "h-12",
        icon: <Camera className="h-4 w-4" />,
        label: "Change Cover Photo",
        onClick: () => setIsCoverModalOpen(true),
      },
      {
        key: "simplify",
        className: "h-12",
        label: (
          <div
            className={`flex items-center justify-between min-w-[170px] select-none py-1 ${
              isUpdatingSimplify ? "cursor-not-allowed opacity-80" : "cursor-pointer"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isUpdatingSimplify) {
                handleToggleSimplify(!isOptimisticSimplified);
              }
            }}
          >
            <span className="font-medium text-sm">Simplify Debts</span>
            <Switch
              size="default"
              checked={isOptimisticSimplified}
              loading={isUpdatingSimplify}
              disabled={isUpdatingSimplify}
              onChange={(checked, e) => {
                e.stopPropagation();
                handleToggleSimplify(checked);
              }}
            />
          </div>
        ),
      },
      { type: "divider" },
      {
        key: "leave",
        className: "h-12",
        icon: <LogOut className="h-4 w-4" />,
        label: "Leave Group",
        onClick: handleLeaveGroup,
      },
      {
        key: "delete",
        className: "h-12",
        danger: true,
        icon: <Trash2 className="h-4 w-4" />,
        label: "Delete Group",
        onClick: handleDeleteGroup,
      },
    ],
    [isOptimisticSimplified, isUpdatingSimplify, handleLeaveGroup, handleDeleteGroup]
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-bg-surface border border-border-base text-text-base shadow-sm">
        {/* Cover Photo Banner */}
        {group.cover_image_url && (
          <div className="relative h-28 sm:h-36 w-full overflow-hidden">
            <img
              src={group.cover_image_url}
              alt={group.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-black/40 to-black/60" />
            <button
              type="button"
              onClick={() => setIsCoverModalOpen(true)}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer border border-white/20"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover</span>
            </button>
          </div>
        )}

        <div className={`relative z-10 space-y-5 p-5 sm:p-6 ${group.cover_image_url ? "-mt-10 sm:-mt-12" : ""}`}>
          {/* Top Row: Info & Settings */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-400 text-2xl sm:text-3xl font-bold border-2 border-bg-surface shadow-md backdrop-blur-md">
                {(group.name || "G").charAt(0)}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-base mb-0.5 line-clamp-1">
                  {group.name || "Untitled Group"}
                </h1>
                <div className="mb-1.5 flex items-center gap-1.5">
                  {userNetBalance === 0 ? (
                    <span className="text-sm font-medium text-text-muted flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All settled up
                    </span>
                  ) : userNetBalance > 0 ? (
                    <span className="text-sm font-medium text-success-text">
                      You are owed <span className="font-financial font-bold">{formatCents(userNetBalance)}</span> overall
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-error-text">
                      You owe <span className="font-financial font-bold">{formatCents(Math.abs(userNetBalance))}</span> overall
                    </span>
                  )}
                  <Tooltip title="Note: Overall 1-on-1 balance with group members may include direct settlements recorded outside this group.">
                    <Info className="h-3.5 w-3.5 text-text-muted hover:text-primary-500 cursor-pointer transition-colors shrink-0" />
                  </Tooltip>
                </div>
                <Button
                  type="primary"
                  onClick={onOpenMembers}
                  className="text-text-muted hover:text-text-base hover:bg-bg-subtle flex items-center gap-2 h-auto px-0"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm font-medium">
                    {groupMembers.length} Members
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </div>
            </div>

            <Dropdown
              menu={{ items: settingsMenu }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<Settings className="h-5 w-5" />}
                className="text-text-muted hover:text-text-base hover:bg-bg-subtle"
              />
            </Dropdown>
          </div>

          {/* Middle Row: Status */}
          <GroupStatusCard
            isSimplified={isOptimisticSimplified}
            myDebts={myDebts}
            userId={userId}
            getProfile={getProfile}
          />

          {/* Bottom Row: Actions */}
          <div className="flex items-center gap-3 w-full">
            <Button
              type="primary"
              icon={<Plus className="h-4 w-4" />}
              size="large"
              onClick={onOpenAddExpense}
              className="flex-1 rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold border-none shadow-lg shadow-primary-500/20"
            >
              Expenses
            </Button>
            <Button
              icon={<UserPlus className="h-4 w-4" />}
              size="large"
              onClick={onOpenInvite}
              className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold backdrop-blur-sm"
            >
              Invite
            </Button>
          </div>
        </div>
      </div>

      <GroupCoverModal
        open={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        group={group}
      />
    </>
  );
}
