import { Modal, Button, Divider, Space, Typography, Popconfirm, message } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import type { Expense } from '../types';
import { formatCents } from '../utils/currency';
import { formatDate } from '../utils/date';
import { getCategoryIcon } from '../utils/icons';
import { useAppData } from '../context/AppDataContext';
import { deleteExpense } from '../hooks/supabase/useMutations';
import { getProfileById } from '../lib/mockData';

const { Text, Title } = Typography;

interface ExpenseStatementModalProps {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseStatementModal({
  open,
  expense,
  onClose,
  onEdit,
}: ExpenseStatementModalProps) {
  const { loading } = useAppData();
  const [messageApi, contextHolder] = message.useMessage();

  if (!expense || loading) return null;

  const CatIcon = getCategoryIcon(expense.category);
  const payerName = expense.payer?.full_name ?? getProfileById(expense.payer_id)?.full_name ?? 'Unknown';

  const handleDelete = async () => {
    try {
      await deleteExpense(expense.id);
      messageApi.success('Expense deleted successfully.');
      window.dispatchEvent(new Event('expenseAdded')); // Trigger refetch
      onClose();
    } catch (err: any) {
      messageApi.error(err.message || 'Failed to delete expense.');
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width={480}
        className="expense-statement-modal"
      >
        <div className="flex flex-col items-center pt-6 pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-4 shadow-sm">
            <CatIcon className="h-8 w-8" strokeWidth={1.8} />
          </div>
          <Title level={4} className="mb-1 text-text-base text-center">
            {expense.description}
          </Title>
          <Text className="text-xl font-bold font-financial text-text-base mb-1">
            {formatCents(expense.total_amount)}
          </Text>
          <Text className="text-sm text-text-muted font-medium">
            Added by {payerName} on {formatDate(expense.expense_date ?? expense.created_at)}
          </Text>
        </div>

        <Divider className="my-4" />

        <div className="space-y-4 px-2">
          {expense.splits?.map((split) => {
            const splitUser = split.user?.full_name ?? getProfileById(split.user_id)?.full_name ?? 'Unknown';
            const isPayer = split.user_id === expense.payer_id;
            
            return (
              <div key={split.user_id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-bg-subtle flex items-center justify-center font-bold text-text-muted text-xs">
                    {splitUser.charAt(0).toUpperCase()}
                  </div>
                  <Text className="font-medium text-text-base">{splitUser}</Text>
                </div>
                <div className="text-right">
                  <Text className="block font-medium font-financial text-text-base">
                    {formatCents(split.amount_owed)}
                  </Text>
                  {isPayer && (
                    <Text className="text-[10px] uppercase font-bold text-success-text tracking-wider">
                      Paid
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Divider className="my-4" />

        <div className="flex justify-between items-center px-2 pb-2">
          <Popconfirm
            title="Delete Expense"
            description="Are you sure you want to delete this expense? This action cannot be undone."
            onConfirm={handleDelete}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
          </Popconfirm>
          <Space>
            <Button onClick={onClose}>Close</Button>
            <Button
              type="primary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
            >
              Edit Expense
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
}
