import { useCallback } from "react";
import { App } from "antd";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";
import { leaveGroup, deleteGroup } from "../../hooks/supabase/useMutations";
import type { Group } from "../../types";

interface UseGroupHeaderActionsProps {
  group: Group;
  userId: string;
  userNetBalance: number;
  hasUnsettledDebts: boolean;
}

export function useGroupHeaderActions({
  group,
  userId,
  userNetBalance,
  hasUnsettledDebts,
}: UseGroupHeaderActionsProps) {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const { refetchGroups } = useAppData();

  const handleLeaveGroup = useCallback(() => {
    if (userNetBalance !== 0 || hasUnsettledDebts) {
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
  }, [userNetBalance, hasUnsettledDebts, modal, group.id, userId, message, refetchGroups, navigate]);

  const handleDeleteGroup = useCallback(() => {
    if (hasUnsettledDebts) {
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
  }, [hasUnsettledDebts, modal, group.id, message, refetchGroups, navigate]);

  return { handleLeaveGroup, handleDeleteGroup };
}
