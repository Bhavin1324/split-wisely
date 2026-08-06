import { useState, useMemo } from 'react';
import { Input, Select, Card, Empty, Tag } from 'antd';
import { Search as SearchIcon, Receipt } from 'lucide-react';
import {
  MOCK_EXPENSES,
  MOCK_CATEGORIES,
  MOCK_GROUPS,
  getProfileById,
} from '../lib/mockData';
import { formatCents } from '../utils/currency';
import { formatDate } from '../utils/date';

export function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'date' | 'amount_desc' | 'amount_asc'>('date');

  const filteredExpenses = useMemo(() => {
    return MOCK_EXPENSES.filter((expense) => {
      const textMatch =
        !searchTerm.trim() ||
        expense.description.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        getProfileById(expense.payer_id)?.full_name.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const categoryMatch = !selectedCategory || expense.category_id === selectedCategory;
      const groupMatch = !selectedGroup || expense.group_id === selectedGroup;

      return textMatch && categoryMatch && groupMatch;
    }).sort((a, b) => {
      if (sortBy === 'amount_desc') return b.total_amount - a.total_amount;
      if (sortBy === 'amount_asc') return a.total_amount - b.total_amount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [searchTerm, selectedCategory, selectedGroup, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1 flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-brand-500" />
          Instant Expense Search
        </h1>
        <p className="text-sm text-gray-500">
          Find any expense across all your groups by description, payer, category, or group.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Search text</label>
            <Input
              prefix={<SearchIcon className="h-4 w-4 text-gray-400" />}
              placeholder="Search description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Group</label>
            <Select
              placeholder="All groups"
              allowClear
              className="w-full"
              value={selectedGroup}
              onChange={(val) => setSelectedGroup(val)}
              options={MOCK_GROUPS.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Category</label>
            <Select
              placeholder="All categories"
              allowClear
              className="w-full"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={MOCK_CATEGORIES.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Sort By</label>
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
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Found {filteredExpenses.length} matching expenses</span>
        {(searchTerm || selectedCategory || selectedGroup) && (
          <Tag color="blue" className="rounded-full">
            Filtered view
          </Tag>
        )}
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <Card className="rounded-2xl text-center py-12">
            <Empty description="No expenses match your search query" />
          </Card>
        ) : (
          filteredExpenses.map((expense) => {
            const payer = getProfileById(expense.payer_id);
            const group = MOCK_GROUPS.find((g) => g.id === expense.group_id);
            const category = MOCK_CATEGORIES.find((c) => c.id === expense.category_id);

            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{expense.description}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>Paid by <strong>{payer?.full_name ?? expense.payer_id}</strong></span>
                      {group && <span>• {group.name}</span>}
                      {category && <Tag className="rounded-full text-[10px]">{category.name}</Tag>}
                      <span>• {formatDate(expense.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-bold font-financial text-gray-900 text-base">
                  {formatCents(expense.total_amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
