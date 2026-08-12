import { Button, Dropdown, Switch, App } from "antd";
import { Users, ArrowRight, Settings, CheckCircle2, Plus, UserPlus, LogOut, Trash2 } from "lucide-react";
import type { MenuProps } from "antd";
import { formatCents } from "../../utils/currency";
import { leaveGroup, deleteGroup, updateGroupSettings } from "../../hooks/supabase/useMutations";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";
import type { Group } from "../../types";

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
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { refetchGroups } = useAppData();

  const handleLeaveGroup = () => {
    if (userNetBalance !== 0 || displayedDebts.length > 0) {
      modal.confirm({
        title: "Unsettled Debts",
        content:
          "You cannot leave this group because you have unsettled debts. Please settle up first.",
        okButtonProps: { danger: true, disabled: true },
        cancelText: "Cancel",
      });
      return;
    }
    modal.confirm({
      title: "Leave Group",
      content: "Are you sure you want to leave this group?",
      okText: "Leave",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await leaveGroup(group.id, userId);
          message.success("Left group successfully");
          refetchGroups();
          navigate("/dashboard");
        } catch (error: any) {
          message.error(error.message || "Failed to leave group");
        }
      },
    });
  };

  const handleDeleteGroup = () => {
    if (displayedDebts.length > 0) {
      modal.confirm({
        title: "Warning: Unsettled Debts!",
        content:
          "This group has unsettled expenses. Are you absolutely sure you want to delete it? This action cannot be undone.",
        okText: "Delete Anyway",
        okButtonProps: { danger: true },
        cancelText: "Cancel",
        onOk: async () => {
          try {
            await deleteGroup(group.id);
            message.success("Group deleted");
            refetchGroups();
            navigate("/dashboard");
          } catch (error: any) {
            message.error(error.message || "Failed to delete group");
          }
        },
      });
      return;
    }
    modal.confirm({
      title: "Delete Group",
      content: "Are you sure you want to delete this group?",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteGroup(group.id);
          message.success("Group deleted");
          refetchGroups();
          navigate("/dashboard");
        } catch (error: any) {
          message.error(error.message || "Failed to delete group");
        }
      },
    });
  };

  const handleToggleSimplify = async (checked: boolean) => {
    try {
      await updateGroupSettings(group.id, { simplify_debts: checked });
      message.success(`Debt simplification turned ${checked ? "on" : "off"}`);
      refetchGroups();
    } catch (error: any) {
      message.error(error.message || "Failed to update setting");
    }
  };

  const settingsMenu: MenuProps["items"] = [
    {
      key: "simplify",
      label: (
        <div
          className="flex items-center justify-between min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Simplify Debts</span>
          <Switch
            size="small"
            checked={group?.simplify_debts !== false}
            onChange={handleToggleSimplify}
          />
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "leave",
      icon: <LogOut className="h-4 w-4" />,
      label: "Leave Group",
      onClick: handleLeaveGroup,
    },
    {
      key: "delete",
      danger: true,
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete Group",
      onClick: handleDeleteGroup,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-surface border border-border-base p-5 sm:p-6 text-text-base shadow-sm">
      <div className="relative z-10 space-y-5">
        {/* Top Row: Info & Settings */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-400 text-xl sm:text-2xl font-bold border border-primary-500/30">
              {group.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-base mb-1 line-clamp-1">
                {group.name}
              </h1>
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
        <div className="bg-bg-subtle rounded-xl p-3 sm:p-4 border border-border-base">
          <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-2">
            Your Status
          </div>
          {myDebts.length === 0 ? (
            <div className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4" /> All settled up!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {myDebts.map((debt, idx) => {
                const isOwe = debt.from === userId;
                const otherPersonId = isOwe ? debt.to : debt.from;
                const otherPerson = getProfile(otherPersonId);
                const otherName = otherPerson?.full_name ?? otherPersonId;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 text-sm bg-bg-surface rounded-lg px-3 py-2 border border-border-base"
                  >
                    <span className="text-text-base truncate">
                      {isOwe ? (
                        <>
                          You owe <strong>{otherName}</strong>
                        </>
                      ) : (
                        <>
                          <strong>{otherName}</strong> owes you
                        </>
                      )}
                    </span>
                    <span
                      className={`font-bold font-financial shrink-0 ${isOwe ? "text-error-text" : "text-success-text"}`}
                    >
                      {formatCents(debt.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
  );
}
