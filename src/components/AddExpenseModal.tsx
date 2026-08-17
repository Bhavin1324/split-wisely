import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, message, Typography } from 'antd';
import { X } from 'lucide-react';
import { MOCK_CURRENT_USER } from '../lib/mockData';
import type { Expense } from '../types';
import { formatCents, getStoredCurrency } from '../utils/currency';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { createExpenseWithSplits, updateExpenseWithSplits } from '../hooks/supabase/useMutations';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../hooks/useBottomSheetDismiss';
import { matchCategoryByDescription } from '../utils/categoryKeywords';
import { computeSplits } from '../utils/expenseSplits';
import { ExpenseFormFields } from './expenses/ExpenseFormFields';

const { Text } = Typography;

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string;
  existingExpense?: Expense;
  onSuccess?: () => Promise<void> | void;
}

export function AddExpenseModal({ open, onClose, groupId, existingExpense, onSuccess }: AddExpenseModalProps) {
  const isMobile = useIsMobile(640);
  const { currentUser, groups, categories, refetchData } = useAppData();
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const formState = useExpenseForm(groupId, existingExpense, open, userId, categories);
  const {
    form, description, setDescription, amountValue, setAmountValue, categoryId, setCategoryId,
    selectedGroupId, setSelectedGroupId, expenseDate, setExpenseDate, payerId, setPayerId,
    splitMode, setSplitMode, selectedUserIds, setSelectedUserIds, exactAmounts, setExactAmounts,
    percentages, setPercentages, shares, setShares, validationError, setValidationError,
    isSubmitting, setIsSubmitting, fieldErrors, setFieldErrors, members, totalCents,
    equalPerPerson, exactRemaining, percentageSum, totalShares, resetForm,
  } = formState;

  const [messageApi, contextHolder] = message.useMessage();

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const {
    isRendered, sheetRef, backdropRef, handlePointerDown, handlePointerMove, handlePointerUp, triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose: handleCancel });

  const memberName = useCallback((uid: string): string => {
    const member = members.find((m) => m.user_id === uid);
    if (!member?.profile) return uid;
    return uid === userId ? `${member.profile.full_name} (you)` : member.profile.full_name;
  }, [members, userId]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);
    if (!categoryId) {
      const matchedId = matchCategoryByDescription(val, categories);
      if (matchedId) setCategoryId(matchedId);
    }
  }, [categoryId, categories, setDescription, setCategoryId]);

  const toggleParticipant = useCallback((uid: string, checked: boolean) => {
    setSelectedUserIds((prev) => (checked ? [...prev, uid] : prev.filter((id) => id !== uid)));
  }, [setSelectedUserIds]);

  const handleSave = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!description.trim()) errors.description = 'Please enter a description.';
    if (totalCents <= 0) errors.amount = 'Please enter a valid amount.';
    if (!selectedGroupId) errors.groupId = 'Please select a group.';
    if (!categoryId) errors.categoryId = 'Please select a category.';
    if (!expenseDate) errors.expenseDate = 'Please select a date.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setValidationError('Please fix the highlighted fields above.');
      return;
    }
    setFieldErrors({});
    setValidationError(null);

    let splits;
    try {
      splits = computeSplits({ splitMode, totalCents, selectedUserIds, members, exactAmounts, percentages, shares });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid split configuration.');
      return;
    }

    if (DEMO_MODE) {
      messageApi.success(existingExpense ? 'Expense updated (Demo Mode)!' : 'Expense added successfully (Demo Mode)!');
      await refetchData();
      if (onSuccess) await onSuccess();
      if (isMobile) triggerDismiss(); else handleCancel();
    } else {
      setIsSubmitting(true);
      try {
        const payload = {
          description, total_amount: totalCents, currency_code: getStoredCurrency(), exchange_rate: 1.0,
          group_id: selectedGroupId ?? null, payer_id: payerId, category_id: categoryId ?? null,
          expense_date: expenseDate.toISOString(),
          splits: splits.map((s) => ({ user_id: s.userId, amount_owed: s.amountOwed })),
        };
        if (existingExpense) {
          await updateExpenseWithSplits({ ...payload, expense_id: existingExpense.id, receipt_image_url: existingExpense.receipt_image_url });
          messageApi.success('Expense updated successfully!');
        } else {
          await createExpenseWithSplits({ ...payload, created_by: currentUser?.id ?? payerId, receipt_image_url: null });
          messageApi.success('Expense added successfully!');
        }
        await refetchData();
        if (onSuccess) await onSuccess();
        if (isMobile) triggerDismiss(); else handleCancel();
      } catch (error: any) {
        setValidationError(error.message || 'Failed to save expense');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [description, totalCents, selectedGroupId, splitMode, selectedUserIds, members, exactAmounts, percentages, shares, categoryId, payerId, messageApi, isMobile, triggerDismiss, handleCancel, expenseDate, existingExpense, currentUser, onSuccess, refetchData, setFieldErrors, setIsSubmitting, setValidationError]);

  const formFieldsProps = {
    form, description, onDescriptionChange: handleDescriptionChange, amountValue, setAmountValue,
    categoryId, setCategoryId, categories, expenseDate, setExpenseDate, selectedGroupId, setSelectedGroupId,
    groups, payerId, setPayerId, members, memberName, splitMode, setSplitMode, selectedUserIds, toggleParticipant,
    exactAmounts, setExactAmounts, percentages, setPercentages, shares, setShares, totalCents, equalPerPerson,
    exactRemaining, percentageSum, totalShares, fieldErrors, validationError, existingExpense: !!existingExpense,
    isMobile, currentUserName: currentUser?.full_name ?? MOCK_CURRENT_USER.full_name, currentUserId: userId,
  };

  if (isMobile) {
    if (!isRendered) return null;
    return createPortal(
      <>
        {contextHolder}
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          {/* Backdrop Overlay */}
          <div
            ref={backdropRef}
            onClick={() => triggerDismiss()}
            className="fixed inset-0 bg-black/65 backdrop-blur-md animate-backdrop-fade-in will-change-[opacity]"
          />

          {/* Sliding Bottom Sheet Container */}
          <div
            ref={sheetRef}
            className="relative z-10 w-full max-h-[90dvh] bg-bg-surface rounded-t-3xl border-t border-border-subtle shadow-2xl flex flex-col overflow-hidden will-change-transform animate-sheet-slide-up"
          >
            {/* Top Drag Handle & Title Bar */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="pt-2.5 pb-1 px-4 flex flex-col items-center border-b border-border-subtle shrink-0 cursor-grab active:cursor-grabbing select-none touch-none bg-bg-surface"
            >
              <div className="w-12 h-1.5 bg-border-base hover:bg-border-strong rounded-full shrink-0 transition-colors" />
              <div className="flex items-center justify-between w-full pt-2 pb-1">
                <h2 className="text-base font-bold text-text-main m-0 select-none">
                  {existingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <button
                  type="button"
                  onClick={() => triggerDismiss()}
                  className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-bg-subtle cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
              <ExpenseFormFields {...formFieldsProps} />
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-0 bg-bg-surface/95 backdrop-blur-md pt-2.5 pb-safe px-4 pb-4 border-t border-border-subtle flex flex-col gap-2.5 shrink-0 z-10">
              {totalCents > 0 && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-text-muted font-medium">Total:</span>
                  <span className="text-base font-bold text-text-main font-financial">{formatCents(totalCents)}</span>
                </div>
              )}
              <Button
                type="primary"
                size="large"
                onClick={handleSave}
                loading={isSubmitting}
                className="w-full h-12 text-base font-bold rounded-xl bg-primary-500 hover:bg-primary-600 border-none shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all text-white flex items-center justify-center"
              >
                {existingExpense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      </>,
      document.body,
    );
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={existingExpense ? 'Edit Expense' : 'Add Expense'}
        open={open}
        onCancel={handleCancel}
        width={560}
        destroyOnClose
        style={{ top: 20 }}
        footer={
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div>
              {totalCents > 0 && (
                <Text type="secondary" className="text-sm">
                  Total: <strong className="text-text-main font-financial text-base">{formatCents(totalCents)}</strong>
                </Text>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCancel} disabled={isSubmitting} className="rounded-xl font-medium">Cancel</Button>
              <Button type="primary" onClick={handleSave} loading={isSubmitting} className="rounded-xl font-bold bg-primary-500 hover:bg-primary-600 border-none px-5 shadow-md shadow-primary-500/20">
                {existingExpense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="py-1">
          <ExpenseFormFields {...formFieldsProps} />
        </div>
      </Modal>
    </>
  );
}
