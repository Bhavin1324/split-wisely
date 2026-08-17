import type { PersonalTransaction, Expense } from '../types';
import { formatCents } from './currency';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export interface ExportRow {
  date: string;
  type: 'Personal' | 'Group Share';
  description: string;
  category: string;
  paidOut: string;
  netShare: string;
  groupName: string;
}

export function buildExportRows(
  personalTransactions: PersonalTransaction[],
  groupExpenses: Expense[],
  userId: string,
  groupNameMap: Record<string, string>
): ExportRow[] {
  const rows: ExportRow[] = [];

  // Add Personal Transactions (Expense type only)
  personalTransactions.forEach((tx) => {
    if (tx.type !== 'EXPENSE') return;
    rows.push({
      date: dayjs(tx.transaction_date).format('YYYY-MM-DD'),
      type: 'Personal',
      description: tx.description || 'Personal Expense',
      category: tx.category,
      paidOut: formatCents(tx.amount),
      netShare: formatCents(tx.amount),
      groupName: '-',
    });
  });

  // Add Group Expenses
  groupExpenses.forEach((expense) => {
    // Only include if user was involved
    const userSplit = expense.splits?.find((s) => s.user_id === userId);
    const isPayer = expense.payer_id === userId;

    if (!userSplit && !isPayer) return;

    const amountOwed = userSplit?.amount_owed || 0;
    const amountPaid = isPayer ? expense.total_amount : 0;

    rows.push({
      date: dayjs(expense.expense_date || expense.created_at).format('YYYY-MM-DD'),
      type: 'Group Share',
      description: expense.description,
      category: expense.category?.name || 'General',
      paidOut: formatCents(amountPaid),
      netShare: formatCents(amountOwed),
      groupName: expense.group_id ? (groupNameMap[expense.group_id] || 'Unknown Group') : '-',
    });
  });

  // Sort by date descending
  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function convertToCSV(rows: ExportRow[]): string {
  const headers = ['Date', 'Type', 'Description', 'Category', 'Paid Out', 'Net Share', 'Group Name'];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const values = [
      `"${row.date}"`,
      `"${row.type}"`,
      `"${row.description.replace(/"/g, '""')}"`,
      `"${row.category.replace(/"/g, '""')}"`,
      `"${row.paidOut}"`,
      `"${row.netShare}"`,
      `"${row.groupName.replace(/"/g, '""')}"`,
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function exportToCSV(rows: ExportRow[], filename: string): void {
  const csvStr = convertToCSV(rows);
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  
  if (typeof window !== 'undefined') {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export async function copyReportToClipboard(rows: ExportRow[]): Promise<void> {
  const csvStr = convertToCSV(rows);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(csvStr);
  } else {
    throw new Error('Clipboard API not available');
  }
}
