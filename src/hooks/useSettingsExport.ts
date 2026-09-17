import { useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_EXPENSES, MOCK_SETTLEMENTS } from '../lib/mockData';
import { ExportAdapter } from '../adapters/ExportAdapter';
import type { Expense } from '../types';

interface UseSettingsExportParams {
  user: User | null;
  queryClient: QueryClient;
  messageApi: MessageInstance;
}

export function useSettingsExport({ user, queryClient, messageApi }: UseSettingsExportParams) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);

  // Lazy on-demand expense fetcher for export actions only
  const getExpensesForExport = async (): Promise<Expense[]> => {
    if (DEMO_MODE) return MOCK_EXPENSES;
    if (!user?.id) return [];

    const cached = queryClient.getQueryData<Expense[]>(queryKeys.expenses.byUser(user.id));
    if (cached && cached.length > 0) {
      return cached;
    }

    const { data: members, error: memberErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberErr) throw memberErr;
    const groupIds = (members || []).map((m) => m.group_id).filter(Boolean);
    if (groupIds.length === 0) return [];

    const { data, error } = await supabase
      .from('expenses')
      .select('*, payer:profiles!payer_id(id, full_name, avatar_url), category:categories(*), splits:expense_splits(*, user:profiles(id, full_name, avatar_url))')
      .in('group_id', groupIds)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Expense[];
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const expenses = await getExpensesForExport();
      const csvData = expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.total_amount / 100,
        currency: exp.currency_code,
        payer: exp.payer?.full_name ?? exp.payer_id,
        category: exp.category?.name ?? 'Uncategorized',
        date: exp.created_at,
      }));
      ExportAdapter.exportToCSV(csvData, 'centfolio-expenses.csv');
      messageApi.success('Expenses exported as CSV');
    } catch {
      messageApi.error('Failed to export expenses as CSV');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const expenses = await getExpensesForExport();
      const mappedExpenses = expenses.map((exp) => ({
        ...exp,
        total_amount: exp.total_amount / 100,
        base_currency_amount: exp.base_currency_amount ? exp.base_currency_amount / 100 : exp.base_currency_amount,
        splits: exp.splits?.map((split) => ({
          ...split,
          amount_owed: split.amount_owed / 100,
        })),
      }));

      const mappedSettlements = (DEMO_MODE ? MOCK_SETTLEMENTS : []).map((settlement) => ({
        ...settlement,
        amount: settlement.amount / 100,
      }));

      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        expenses: mappedExpenses,
        settlements: mappedSettlements,
      };

      ExportAdapter.exportToJSON(backupData, 'centfolio-backup.json');
      messageApi.success('Complete data backup exported as JSON');
    } catch {
      messageApi.error('Failed to export data as JSON');
    } finally {
      setIsExportingJSON(false);
    }
  };

  return {
    isExportingCSV,
    isExportingJSON,
    handleExportCSV,
    handleExportJSON,
  };
}
