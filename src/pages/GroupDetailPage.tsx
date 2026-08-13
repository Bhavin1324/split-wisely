import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Segmented, Empty, Button, App } from "antd";
import { Receipt, DollarSign } from "lucide-react";

import { MOCK_CURRENT_USER } from "../lib/mockData";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { ExpenseStatementModal } from "../components/ExpenseStatementModal";
import { AddFriendModal } from "../components/AddFriendModal";
import { PageSkeleton } from "../components/ui/PageSkeleton";
import { SettleUpModal } from "../components/SettleUpModal";

import { useAppData, DEMO_MODE } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useGroupMembers } from "../hooks/supabase/useGroupsData";
import { useGroupCalculations } from "../hooks/useGroupCalculations";
import type { Expense } from "../types";

import { GroupHeader } from "../components/group/GroupHeader";
import { GroupExpensesTab } from "../components/group/GroupExpensesTab";
import { GroupBalancesTab } from "../components/group/GroupBalancesTab";
import { GroupMembersDrawer } from "../components/group/GroupMembersDrawer";
import { GroupLedgerModal } from "../components/group/GroupLedgerModal";
import { removeMemberFromGroup } from "../hooks/supabase/useMutations";

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();

  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"expenses" | "balances">("expenses");
  
  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  
  const [settleUpTarget, setSettleUpTarget] = useState<string | null>(null);
  const [settleUpTargetName, setSettleUpTargetName] = useState<string | undefined>(undefined);
  const [settleUpMaxAmount, setSettleUpMaxAmount] = useState<number | undefined>(undefined);
  
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const { user } = useAuth();
  const { currentUser, groups, loading: appLoading } = useAppData();
  
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : "");

  useGroupMembers(groupId); // pre-fetch or trigger load for cache

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  const {
    groupMembers,
    refetchMembers,
    refetchAll,
    feedItems,
    displayedDebts,
    userNetBalance,
    myDebts,
    getProfile,
    memberLedgers,
    loading: groupLoading,
  } = useGroupCalculations(groupId, userId, group);

  if (appLoading || groupLoading) {
    return <PageSkeleton layout="dashboard" />;
  }

  if (!group) {
    return (
      <div className="py-16 text-center">
        <Empty description="Group not found" />
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleRemoveMember = (memberId: string, memberName: string) => {
    modal.confirm({
      title: "Remove Member",
      content: `Are you sure you want to remove ${memberName} from this group?`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeMemberFromGroup(groupId!, memberId);
          message.success(`${memberName} removed from group`);
          refetchMembers();
        } catch (error: any) {
          message.error(error.message || "Failed to remove member");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Group Header ── */}
      <GroupHeader 
        group={group}
        groupMembers={groupMembers}
        myDebts={myDebts}
        getProfile={getProfile}
        userId={userId}
        userNetBalance={userNetBalance}
        displayedDebts={displayedDebts}
        onOpenMembers={() => setIsMembersDrawerOpen(true)}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenInvite={() => setIsAddMemberOpen(true)}
      />

      {/* ── Tab Selector ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border-base pb-3">
        <div className="overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Segmented
            options={[
              { label: "Expenses", value: "expenses", icon: <Receipt className="h-4 w-4 inline mr-1" /> },
              { label: "Settlements", value: "balances", icon: <DollarSign className="h-4 w-4 inline mr-1" /> },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as "expenses" | "balances")}
            className="bg-bg-subtle p-1"
          />
        </div>

        <div className="text-sm text-text-muted font-medium">
          {activeTab === "expenses"
            ? `${feedItems.length} activities`
            : `${displayedDebts.length} pending debts`}
        </div>
      </div>

      {/* ── TAB 1: Expenses Feed ── */}
      {activeTab === "expenses" && (
        <GroupExpensesTab 
          feedItems={feedItems}
          userId={userId}
          getProfile={getProfile}
          onSelectExpense={setSelectedExpense}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onRefresh={refetchAll}
        />
      )}

      {/* ── TAB 2: Balances & Simplified Debts ── */}
      {activeTab === "balances" && (
        <GroupBalancesTab 
          displayedDebts={displayedDebts}
          userId={userId}
          getProfile={getProfile}
          onSettleUp={(targetId, targetName, amount) => {
            setSettleUpTarget(targetId);
            setSettleUpTargetName(targetName);
            setSettleUpMaxAmount(amount);
          }}
          onOpenLedger={() => setIsLedgerOpen(true)}
        />
      )}

      {/* ── Modals & Drawers ── */}
      <AddExpenseModal
        open={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setExpenseToEdit(undefined);
        }}
        groupId={groupId}
        existingExpense={expenseToEdit}
        onSuccess={refetchAll}
      />

      <ExpenseStatementModal
        open={!!selectedExpense}
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={(expense) => {
          setExpenseToEdit(expense);
          setIsAddExpenseOpen(true);
        }}
      />

      <AddFriendModal
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        defaultGroupId={groupId}
      />

      <SettleUpModal
        open={!!settleUpTarget}
        onClose={() => {
          setSettleUpTarget(null);
          setSettleUpTargetName(undefined);
          setSettleUpMaxAmount(undefined);
        }}
        onSuccess={refetchAll}
        defaultPayeeId={settleUpTarget ?? undefined}
        defaultPayeeName={settleUpTargetName}
        defaultAmountCents={settleUpMaxAmount}
        maxAmountCents={settleUpMaxAmount}
        defaultGroupId={groupId}
      />

      <GroupMembersDrawer
        isOpen={isMembersDrawerOpen}
        onClose={() => setIsMembersDrawerOpen(false)}
        groupMembers={groupMembers}
        userId={userId}
        getProfile={getProfile}
        onOpenAddMember={() => setIsAddMemberOpen(true)}
        onRemoveMember={handleRemoveMember}
      />

      <GroupLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        memberLedgers={memberLedgers}
        userId={userId}
      />
    </div>
  );
}
