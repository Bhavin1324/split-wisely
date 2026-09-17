import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Input, Select, Card, Empty, Tag, Button } from 'antd';
import { Search as SearchIcon, Receipt } from 'lucide-react';
import {
  MOCK_EXPENSES,
  getProfileById,
} from '../lib/mockData';
import { formatCents } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useAllExpenses } from '../hooks/supabase/useExpensesData';
import { ExpenseStatementModal } from '../components/ExpenseStatementModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { PageSkeleton } from '../components/ui/PageSkeleton';
import type { Expense } from '../types';

const INITIAL_PAGE_SIZE = 30;

export function SearchPage() {
  const { user } = useAuth();
  const { groups, categories, loading: appLoading } = useAppData();
  const { data: liveExpenses, loading: expensesLoading } = useAllExpenses(user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'date' | 'amount_desc' | 'amount_asc'>('date');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  // O(1) Lookup Maps to eliminate O(N * M) scans inside list rendering
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Reset pagination slice when any filter criteria changes
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [deferredSearchTerm, selectedCategory, selectedGroup, sortBy]);

  const filteredExpenses = useMemo(() => {
    const allExpenses = DEMO_MODE ? MOCK_EXPENSES : (liveExpenses || []);
    const normalizedSearch = deferredSearchTerm.toLowerCase().trim();

    return allExpenses
      .filter((expense) => {
        // Find payer profile in live mode or fallback to getProfileById
        const payerName = DEMO_MODE 
          ? getProfileById(expense.payer_id)?.full_name 
          : ((expense as any).payer?.full_name ?? expense.payer_id);

        const textMatch =
          !normalizedSearch ||
          expense.description.toLowerCase().includes(normalizedSearch) ||
          (payerName && payerName.toLowerCase().includes(normalizedSearch));

        const categoryMatch = !selectedCategory || expense.category_id === selectedCategory;
        const groupMatch = !selectedGroup || expense.group_id === selectedGroup;

        return textMatch && categoryMatch && groupMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'amount_desc') return b.total_amount - a.total_amount;
        if (sortBy === 'amount_asc') return a.total_amount - b.total_amount;
        // Zero-allocation ISO string comparison: avoids thousands of new Date() allocations
        const dateA = a.expense_date ?? a.created_at;
        const dateB = b.expense_date ?? b.created_at;
        return dateB.localeCompare(dateA);
      });
  }, [deferredSearchTerm, selectedCategory, selectedGroup, sortBy, liveExpenses]);

  const visibleExpenses = useMemo(() => {
    return filteredExpenses.slice(0, visibleCount);
  }, [filteredExpenses, visibleCount]);

  if (appLoading || expensesLoading) {
    return <PageSkeleton layout="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-base tracking-tight mb-1 flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-primary-500" />
          Instant Expense Search
        </h1>
        <p className="text-sm text-text-muted">
          Find any expense across all your groups by description, payer, category, or group.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-border-base shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Search text</label>
            <Input
              prefix={<SearchIcon className="h-4 w-4 text-text-muted" />}
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Group</label>
            <Select
              placeholder="All groups"
              allowClear
              className="w-full"
              value={selectedGroup}
              onChange={(val) => setSelectedGroup(val)}
              options={groups.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Category</label>
            <Select
              placeholder="All categories"
              allowClear
              className="w-full"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categories.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium block mb-1">Sort By</label>
            <Select
              className="w-full"
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { label: 'Most Recent', value: 'date' },
                { label: 'Highest Amount', value: 'amount_desc' },
                { label: 'Lowest Amount', value: 'amount_asc' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm text-text-muted mt-2">
        <span>Found {filteredExpenses.length} matching expenses</span>
        {(searchTerm || selectedCategory || selectedGroup) && (
          <div className="rounded-full text-primary-500 bg-bg-surface px-2 py-1">
            Filtered view
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <Card className="rounded-2xl text-center py-12">
            <Empty description="No expenses match your search query" />
          </Card>
        ) : (
          <>
            {visibleExpenses.map((expense) => {
              const payerName = DEMO_MODE 
                ? (getProfileById(expense.payer_id)?.full_name ?? expense.payer_id)
                : ((expense as any).payer?.full_name ?? expense.payer_id);
                
              const group = expense.group_id ? groupMap.get(expense.group_id) : undefined;
              const category = expense.category_id ? categoryMap.get(expense.category_id) : undefined;

              return (
                <div
                  key={expense.id}
                  onClick={() => setSelectedExpense(expense as unknown as Expense)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-bg-surface rounded-xl border border-border-base shadow-sm hover:shadow-md transition-all gap-3 cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 font-bold">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text-base truncate">{expense.description}</div>
                      <div className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="truncate">Paid by <strong className="text-text-main">{payerName}</strong></span>
                        {group && <span className="text-text-muted">•</span>}
                        {group && <span className="truncate">{group.name}</span>}
                        {category && <Tag>{category.name}</Tag>}
                        <span className="text-text-muted">•</span>
                        <span className="whitespace-nowrap">{formatDate(expense.expense_date ?? expense.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-bold font-financial text-text-base text-base self-start sm:self-auto ml-15 sm:ml-0">
                    {formatCents(expense.total_amount)}
                  </div>
                </div>
              );
            })}

            {visibleExpenses.length < filteredExpenses.length && (
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  onClick={() => setVisibleCount((prev) => prev + INITIAL_PAGE_SIZE)}
                  className="rounded-xl font-medium border-border-base hover:border-primary-500 text-text-muted hover:text-text-base px-6 h-9"
                >
                  Show More ({filteredExpenses.length - visibleExpenses.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {isAddExpenseOpen && (
        <AddExpenseModal
          open={isAddExpenseOpen}
          onClose={() => {
            setIsAddExpenseOpen(false);
            setExpenseToEdit(undefined);
          }}
          existingExpense={expenseToEdit}
        />
      )}

      {selectedExpense && (
        <ExpenseStatementModal
          open={Boolean(selectedExpense)}
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onEdit={(expense) => {
            setExpenseToEdit(expense);
            setIsAddExpenseOpen(true);
          }}
        />
      )}
    </div>
  );
}
