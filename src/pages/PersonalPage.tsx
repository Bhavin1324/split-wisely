import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { usePersonalLedger } from "../hooks/usePersonalLedger";
import { useAuth } from "../context/AuthContext";
import { DEMO_MODE, useAppData } from "../context/AppDataContext";
import { MOCK_CURRENT_USER, MOCK_EXPENSES } from "../lib/mockData";
import { useAllExpenses } from "../hooks/supabase/useExpensesData";
import { PersonalHeader } from "../components/personal/PersonalHeader";
import { PersonalHeroCard } from "../components/personal/PersonalHeroCard";
import { PersonalTransactionFeed } from "../components/personal/PersonalTransactionFeed";
import { AddPersonalTransactionDrawer } from "../components/personal/AddPersonalTransactionDrawer";
import { SetBudgetModal } from "../components/personal/SetBudgetModal";
import { HybridBreakdownModal } from "../components/analytics/HybridBreakdownModal";
import { ExpenseStatementModal } from "../components/ExpenseStatementModal";
import { PageSkeleton } from "../components/ui/PageSkeleton";
import type { PersonalTransaction, Expense } from "../types";

export function PersonalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [monthYear, setMonthYear] = useState<string>(dayjs().format("YYYY-MM"));
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedTransactionToEdit, setSelectedTransactionToEdit] = useState<PersonalTransaction | null>(null);
  const [selectedGroupExpense, setSelectedGroupExpense] = useState<Expense | null>(null);

  const { user } = useAuth();
  const { currentUser, groups } = useAppData();
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : "");

  const { data: liveExpenses, loading: expensesLoading, refetch: refetchExpenses } = useAllExpenses(userId);
  const expenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses ?? []);

  const {
    transactions,
    budget,
    summary,
    hybrid,
    groupBreakdowns,
    personalBreakdown,
    loading: ledgerLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setMonthlyBudget,
    refetch: refetchLedger,
  } = usePersonalLedger(monthYear, expenses, groups);

  const loading = ledgerLoading || expensesLoading;

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add" || action === "new") {
      setSelectedTransactionToEdit(null);
      setIsAddDrawerOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("action");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (loading && transactions.length === 0) {
    return <PageSkeleton layout="dashboard" />;
  }

  const handleOpenAdd = () => {
    setSelectedTransactionToEdit(null);
    setIsAddDrawerOpen(true);
  };

  const handleSelectTransaction = (tx: PersonalTransaction) => {
    setSelectedTransactionToEdit(tx);
    setIsAddDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-32 md:pb-6">
      {/* ── Personal Header ── */}
      <PersonalHeader
        monthYear={monthYear}
        onMonthChange={setMonthYear}
        onOpenAddTransaction={handleOpenAdd}
      />

      {/* ── Personal Hero Summary & Cash Flow Card ── */}
      <PersonalHeroCard
        summary={summary}
        onOpenSetBudget={() => setIsBudgetModalOpen(true)}
        onOpenMoneyOutBreakdown={() => setIsBreakdownOpen(true)}
      />

      {/* ── Transaction Feed ── */}
      <PersonalTransactionFeed
        transactions={transactions}
        onDeleteTransaction={deleteTransaction}
        onOpenAddTransaction={handleOpenAdd}
        onSelectTransaction={handleSelectTransaction}
        onSelectGroupExpense={setSelectedGroupExpense}
      />

      {/* ── Modals & Drawers ── */}
      <AddPersonalTransactionDrawer
        open={isAddDrawerOpen}
        existingTransaction={selectedTransactionToEdit}
        onClose={() => {
          setIsAddDrawerOpen(false);
          setSelectedTransactionToEdit(null);
        }}
        onAddTransaction={addTransaction}
        onUpdateTransaction={updateTransaction}
      />

      <SetBudgetModal
        open={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudgetCents={budget?.budget_amount ?? null}
        currentOpeningBalanceCents={budget?.opening_balance ?? undefined}
        currentDynamicBudgetEnabled={budget?.dynamic_budget_enabled ?? false}
        onSave={setMonthlyBudget}
      />

      {/* ── Money Out Breakdown Modal (Solo vs Group Bills) ── */}
      <HybridBreakdownModal
        open={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        initialTab="GROUP"
        periodLabel={dayjs(`${monthYear}-01`).format("MMMM YYYY")}
        groupBreakdowns={groupBreakdowns}
        personalBreakdown={personalBreakdown}
        hybrid={hybrid}
      />

      {/* ── Group Expense Statement Modal (Read-only inspection) ── */}
      <ExpenseStatementModal
        open={!!selectedGroupExpense}
        expense={selectedGroupExpense}
        onClose={() => setSelectedGroupExpense(null)}
        onEdit={() => {}}
        onDelete={async () => {
          await refetchExpenses();
          await refetchLedger();
        }}
        onSuccess={async () => {
          await refetchExpenses();
          await refetchLedger();
        }}
      />
    </div>
  );
}
