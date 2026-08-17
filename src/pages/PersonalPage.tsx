import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { usePersonalLedger } from "../hooks/usePersonalLedger";
import { PersonalHeader } from "../components/personal/PersonalHeader";
import { PersonalHeroCard } from "../components/personal/PersonalHeroCard";
import { PersonalTransactionFeed } from "../components/personal/PersonalTransactionFeed";
import { AddPersonalTransactionDrawer } from "../components/personal/AddPersonalTransactionDrawer";
import { SetBudgetModal } from "../components/personal/SetBudgetModal";
import { PageSkeleton } from "../components/ui/PageSkeleton";
import type { PersonalTransaction } from "../types";

export function PersonalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [monthYear, setMonthYear] = useState<string>(dayjs().format("YYYY-MM"));
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedTransactionToEdit, setSelectedTransactionToEdit] = useState<PersonalTransaction | null>(null);

  const {
    transactions,
    budget,
    summary,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setMonthlyBudget,
  } = usePersonalLedger(monthYear);

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
      />

      {/* ── Transaction Feed ── */}
      <PersonalTransactionFeed
        transactions={transactions}
        onDeleteTransaction={deleteTransaction}
        onOpenAddTransaction={handleOpenAdd}
        onSelectTransaction={handleSelectTransaction}
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
    </div>
  );
}
