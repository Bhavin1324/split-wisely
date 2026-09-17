import { useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { DEMO_MODE } from '../context/AppDataContext';
import { MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_PERSONAL_TRANSACTIONS, MOCK_GROUPS } from '../lib/mockData';
import { ExportAdapter } from '../adapters/ExportAdapter';
import type { Expense, Settlement, PersonalTransaction, Group } from '../types';

interface UseSettingsExportParams {
  user: User | null;
  queryClient: QueryClient;
  messageApi: MessageInstance;
}

// ─── Private Data Fetchers (lazy, on-demand, cache-first) ────────────────────

async function fetchGroupExpenses(userId: string, queryClient: QueryClient): Promise<Expense[]> {
  const cached = queryClient.getQueryData<Expense[]>(queryKeys.expenses.byUser(userId));
  if (cached && cached.length > 0) return cached;

  const { data: members, error: memberErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (memberErr) throw memberErr;
  const groupIds = (members || []).map((m) => m.group_id).filter(Boolean);

  // Include both group expenses AND direct 1-on-1 expenses (group_id IS NULL)
  let query = supabase
    .from('expenses')
    .select(
      '*, payer:profiles!payer_id(id, full_name, avatar_url), category:categories(*), splits:expense_splits(*, user:profiles(id, full_name, avatar_url))'
    )
    .order('expense_date', { ascending: false });

  if (groupIds.length > 0) {
    query = query.or(`group_id.in.(${groupIds.join(',')}),group_id.is.null`);
  } else {
    query = query.is('group_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Expense[];
}

async function fetchRealSettlements(userId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select(
      '*, payer:profiles!payer_id(id, full_name, avatar_url), payee:profiles!payee_id(id, full_name, avatar_url)'
    )
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as Settlement[];
}

async function fetchPersonalTransactions(
  userId: string,
  queryClient: QueryClient
): Promise<PersonalTransaction[]> {
  const cached = queryClient.getQueryData<PersonalTransaction[]>(
    queryKeys.personalLedger.transactions(userId)
  );
  if (cached && cached.length > 0) return cached;

  const { data, error } = await supabase
    .from('personal_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return (data || []) as PersonalTransaction[];
}

async function fetchGroupsForExport(userId: string): Promise<Group[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return (members || [])
    .map((m: any) => (Array.isArray(m?.groups) ? m.groups[0] : m?.groups))
    .filter((g: any): g is Group => Boolean(g?.id)) as Group[];
}

function buildGroupNameMap(groups: Group[]): Record<string, string> {
  const map: Record<string, string> = {};
  groups.forEach((g) => { map[g.id] = g.name; });
  return map;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10); // YYYY-MM-DD
}

function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettingsExport({ user, queryClient, messageApi }: UseSettingsExportParams) {
  const [isExportingPersonal, setIsExportingPersonal] = useState(false);
  const [isExportingGroupSplits, setIsExportingGroupSplits] = useState(false);
  const [isExportingArchive, setIsExportingArchive] = useState(false);

  // ── 1. Personal Ledger CSV ────────────────────────────────────────────────
  const handleExportPersonalCSV = async () => {
    setIsExportingPersonal(true);
    try {
      const transactions: PersonalTransaction[] = DEMO_MODE
        ? MOCK_PERSONAL_TRANSACTIONS
        : await fetchPersonalTransactions(user!.id, queryClient);

      if (transactions.length === 0) {
        messageApi.info('No personal transactions to export.');
        return;
      }

      const rows = transactions.map((tx) => {
        const amount = parseFloat(centsToAmount(tx.amount));
        return {
          Date: formatDate(tx.transaction_date),
          Type: tx.type,
          Description: tx.description || 'Personal Transaction',
          Category: tx.category || 'Uncategorized',
          'Amount': amount,
          'Flow': tx.type === 'INCOME' ? '+' : '-',
          'Net Impact': tx.type === 'INCOME' ? `+${amount.toFixed(2)}` : `-${amount.toFixed(2)}`,
        };
      });

      ExportAdapter.exportToCSV(rows, 'centfolio-personal-ledger.csv');
      messageApi.success(`Personal ledger exported — ${rows.length} transactions`);
    } catch {
      messageApi.error('Failed to export personal ledger. Please try again.');
    } finally {
      setIsExportingPersonal(false);
    }
  };

  // ── 2. Group Splits & Settlements CSV ────────────────────────────────────
  const handleExportGroupSplitsCSV = async () => {
    setIsExportingGroupSplits(true);
    try {
      const userId = user?.id ?? '';

      const [expenses, settlements, groups] = DEMO_MODE
        ? [MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUPS]
        : await Promise.all([
            fetchGroupExpenses(userId, queryClient),
            fetchRealSettlements(userId),
            fetchGroupsForExport(userId),
          ]);

      const groupNameMap = buildGroupNameMap(groups as Group[]);

      // Section A: Shared & Direct Expenses
      const expenseRows = expenses
        .filter((exp) => {
          const userSplit = exp.splits?.find((s) => s.user_id === userId);
          return exp.payer_id === userId || Boolean(userSplit);
        })
        .map((exp) => {
          const userSplit = exp.splits?.find((s) => s.user_id === userId);
          const isPayer = exp.payer_id === userId;
          const totalBill = parseFloat(centsToAmount(exp.total_amount));
          const paidByYou = isPayer ? totalBill : 0;
          const yourShare = parseFloat(centsToAmount(userSplit?.amount_owed ?? 0));
          const netImpact = paidByYou - yourShare;

          return {
            Date: formatDate(exp.expense_date ?? exp.created_at),
            Scope: 'Group Split',
            Group: exp.group_id ? (groupNameMap[exp.group_id] ?? 'Unknown Group') : 'Direct',
            Description: exp.description,
            Category: exp.category?.name ?? 'General',
            'Total Bill': totalBill,
            'Paid by You': paidByYou,
            'Your Share': yourShare,
            'Net Impact': netImpact >= 0 ? `+${netImpact.toFixed(2)}` : netImpact.toFixed(2),
            'Paid By': exp.payer?.full_name ?? exp.payer_id,
          };
        });

      // Section B: Settlements / Repayments
      const settlementRows = (settlements as Settlement[]).map((s) => {
        const isYouPaid = s.payer_id === userId;
        const counterparty = isYouPaid
          ? (s.payee?.full_name ?? s.payee_id)
          : (s.payer?.full_name ?? s.payer_id);

        return {
          Date: formatDate(s.created_at),
          Scope: 'Settlement',
          Group: s.group_id ? (groupNameMap[s.group_id] ?? 'Unknown Group') : 'Direct',
          Direction: isYouPaid ? 'You Paid' : 'You Received',
          'To / From': counterparty,
          Amount: parseFloat(centsToAmount(s.amount)),
        };
      });

      if (expenseRows.length === 0 && settlementRows.length === 0) {
        messageApi.info('No group expenses or settlements to export.');
        return;
      }

      ExportAdapter.exportMultiSectionCSV(
        [
          { title: 'Shared Expenses', rows: expenseRows },
          { title: 'Settlements & Repayments', rows: settlementRows },
        ],
        'centfolio-group-splits.csv'
      );
      messageApi.success(
        `Group export done — ${expenseRows.length} expenses, ${settlementRows.length} settlements`
      );
    } catch {
      messageApi.error('Failed to export group splits. Please try again.');
    } finally {
      setIsExportingGroupSplits(false);
    }
  };

  // ── 3. Complete Archive JSON ──────────────────────────────────────────────
  const handleExportArchiveJSON = async () => {
    setIsExportingArchive(true);
    try {
      const userId = user?.id ?? '';

      const [expenses, settlements, personalTransactions, groups] = DEMO_MODE
        ? [MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_PERSONAL_TRANSACTIONS, MOCK_GROUPS]
        : await Promise.all([
            fetchGroupExpenses(userId, queryClient),
            fetchRealSettlements(userId),
            fetchPersonalTransactions(userId, queryClient),
            fetchGroupsForExport(userId),
          ]);

      // Convert all integer cents to currency units for human readability
      const mappedExpenses = (expenses as Expense[]).map((exp) => ({
        ...exp,
        total_amount: parseFloat(centsToAmount(exp.total_amount)),
        base_currency_amount: exp.base_currency_amount
          ? parseFloat(centsToAmount(exp.base_currency_amount))
          : null,
        splits: exp.splits?.map((split) => ({
          ...split,
          amount_owed: parseFloat(centsToAmount(split.amount_owed)),
        })),
      }));

      const mappedSettlements = (settlements as Settlement[]).map((s) => ({
        ...s,
        amount: parseFloat(centsToAmount(s.amount)),
      }));

      const mappedPersonal = (personalTransactions as PersonalTransaction[]).map((tx) => ({
        ...tx,
        amount: parseFloat(centsToAmount(tx.amount)),
      }));

      const archiveData = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        currency_note:
          'All amounts are in currency units (e.g. 1.00 = ₹1.00). Amounts are NOT stored as integer paise.',
        user_id: userId,
        summary: {
          total_groups: (groups as Group[]).length,
          total_expenses: mappedExpenses.length,
          total_settlements: mappedSettlements.length,
          total_personal_transactions: mappedPersonal.length,
        },
        groups: groups,
        expenses: mappedExpenses,
        settlements: mappedSettlements,
        personal_transactions: mappedPersonal,
      };

      ExportAdapter.exportToJSON(archiveData, 'centfolio-archive.json');
      messageApi.success('Complete archive exported successfully');
    } catch {
      messageApi.error('Failed to export archive. Please try again.');
    } finally {
      setIsExportingArchive(false);
    }
  };

  return {
    isExportingPersonal,
    isExportingGroupSplits,
    isExportingArchive,
    handleExportPersonalCSV,
    handleExportGroupSplitsCSV,
    handleExportArchiveJSON,
  };
}
