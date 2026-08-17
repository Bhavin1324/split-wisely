import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Form, Input, Segmented, Button, App, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  Utensils,
  Car,
  Zap,
  ShoppingBag,
  Film,
  HeartPulse,
  Banknote,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
  Tag,
  Smartphone,
  CreditCard,
  Building2,
  MinusCircle,
  PlusCircle,
  X,
} from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import type { PersonalTransaction, TransactionType } from '../../types';
import { HeroAmountInput } from '../ui/HeroAmountInput';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBottomSheetDismiss } from '../../hooks/useBottomSheetDismiss';

export interface CreateTransactionDTO {
  id?: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number; // Stored in integer cents/paisa (displayValue * 100)
  category: string;
  paymentMethod?: 'UPI' | 'CARD' | 'CASH' | 'BANK';
  description?: string;
  transactionDate: string; // ISO string
}

export interface AddPersonalTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  existingTransaction?: PersonalTransaction | null;
  onSubmit?: (transaction: CreateTransactionDTO) => Promise<void> | void;
  onAddTransaction?: (data: {
    type: TransactionType;
    amount: number; // in cents
    category: string;
    description: string;
    transaction_date: string;
  }) => Promise<void> | void;
  onUpdateTransaction?: (
    id: string,
    data: {
      type: TransactionType;
      amount: number; // in cents
      category: string;
      description: string;
      transaction_date: string;
    }
  ) => Promise<void> | void;
  initialType?: 'EXPENSE' | 'INCOME';
}

const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: Utensils },
  { name: 'Transport', icon: Car },
  { name: 'Bills', icon: Zap },
  { name: 'Shopping', icon: ShoppingBag },
  { name: 'Entertainment', icon: Film },
  { name: 'Health', icon: HeartPulse },
  { name: 'Other', icon: Tag },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: Banknote },
  { name: 'Freelance', icon: Laptop },
  { name: 'Investments', icon: TrendingUp },
  { name: 'Gifts', icon: Gift },
  { name: 'Refund', icon: RotateCcw },
  { name: 'Other', icon: Tag },
];

const PAYMENT_METHODS = [
  { id: 'UPI' as const, label: 'UPI', icon: Smartphone },
  { id: 'CARD' as const, label: 'Card', icon: CreditCard },
  { id: 'CASH' as const, label: 'Cash', icon: Banknote },
  { id: 'BANK' as const, label: 'Bank', icon: Building2 },
];

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export function AddPersonalTransactionDrawer({
  open,
  onClose,
  existingTransaction,
  onSubmit,
  onAddTransaction,
  onUpdateTransaction,
  initialType = 'EXPENSE',
}: AddPersonalTransactionDrawerProps) {
  const isMobile = useIsMobile(640);
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string>('Food');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | 'BANK'>('UPI');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeCategories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isExpense = type === 'EXPENSE';
  const isEditing = !!existingTransaction;

  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const {
    isRendered,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  } = useBottomSheetDismiss({ open, onClose: handleCancel });

  useEffect(() => {
    if (open) {
      if (existingTransaction) {
        setType(existingTransaction.type);
        setSelectedCategory(existingTransaction.category);

        let desc = existingTransaction.description || '';
        let method: 'UPI' | 'CARD' | 'CASH' | 'BANK' = 'UPI';
        const match = desc.match(/^\[(UPI|CARD|CASH|BANK)\]\s*(.*)$/i);
        if (match) {
          method = match[1].toUpperCase() as any;
          desc = match[2];
        }
        setPaymentMethod(method);

        form.setFieldsValue({
          amount: existingTransaction.amount / 100,
          description: desc,
          date: dayjs(existingTransaction.transaction_date),
        });
      } else {
        form.resetFields();
        const startType = initialType || 'EXPENSE';
        setType(startType);
        setSelectedCategory(startType === 'EXPENSE' ? 'Food' : 'Salary');
        setPaymentMethod('UPI');
        form.setFieldsValue({
          date: dayjs(),
        });
      }
    }
  }, [open, existingTransaction, initialType, form]);

  const handleTypeChange = (newTypeVal: TransactionType) => {
    setType(newTypeVal);
    if (newTypeVal === 'EXPENSE') {
      if (!EXPENSE_CATEGORIES.some((c) => c.name === selectedCategory)) {
        setSelectedCategory('Food');
      }
    } else {
      if (!INCOME_CATEGORIES.some((c) => c.name === selectedCategory)) {
        setSelectedCategory('Salary');
      }
    }
  };

  const handleQuickAddAmount = (addVal: number) => {
    const currentVal = form.getFieldValue('amount') || 0;
    form.setFieldsValue({ amount: Number((currentVal + addVal).toFixed(2)) });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const amountValue = Number(values.amount);

      if (!amountValue || amountValue <= 0) {
        message.error('Please enter a valid positive amount');
        return;
      }

      setSubmitting(true);
      const amountCents = Math.round(amountValue * 100);
      const dateIso = values.date
        ? values.date.format('YYYY-MM-DDTHH:mm:ss')
        : dayjs().format('YYYY-MM-DDTHH:mm:ss');

      const dto: CreateTransactionDTO = {
        id: existingTransaction?.id,
        type,
        amount: amountCents,
        category: selectedCategory,
        paymentMethod,
        description: values.description || '',
        transactionDate: dateIso,
      };

      if (isEditing && existingTransaction) {
        if (onUpdateTransaction) {
          await onUpdateTransaction(existingTransaction.id, {
            type,
            amount: amountCents,
            category: selectedCategory,
            description: values.description ? `[${paymentMethod}] ${values.description}` : `[${paymentMethod}]`,
            transaction_date: dateIso,
          });
        } else if (onSubmit) {
          await onSubmit(dto);
        }
        message.success(`Updated ${type.toLowerCase()} of ${getCurrencySymbol()}${amountValue.toFixed(2)}`);
      } else {
        if (onAddTransaction) {
          await onAddTransaction({
            type,
            amount: amountCents,
            category: selectedCategory,
            description: values.description ? `[${paymentMethod}] ${values.description}` : `[${paymentMethod}]`,
            transaction_date: dateIso,
          });
        } else if (onSubmit) {
          await onSubmit(dto);
        }
        message.success(`Recorded ${type.toLowerCase()} of ${getCurrencySymbol()}${amountValue.toFixed(2)}`);
      }

      if (isMobile) {
        triggerDismiss();
      } else {
        handleCancel();
      }
    } catch (e: any) {
      if (e.message) message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <Form form={form} layout="vertical" className="space-y-3.5 max-w-md mx-auto">
      {/* ── Dynamic Type Toggle ── */}
      <div className="flex justify-center pb-0.5">
        <Segmented
          value={type}
          onChange={(val) => handleTypeChange(val as TransactionType)}
          options={[
            {
              label: (
                <span className={isExpense ? 'font-bold text-[var(--color-danger-500)]' : ''}>
                  Expense (-)
                </span>
              ),
              value: 'EXPENSE',
              icon: (
                <MinusCircle
                  className={`w-4 h-4 inline mr-1 ${
                    isExpense ? 'text-[var(--color-danger-500)]' : 'text-text-muted'
                  }`}
                />
              ),
            },
            {
              label: (
                <span className={!isExpense ? 'font-bold text-[var(--color-success-500)]' : ''}>
                  Income (+)
                </span>
              ),
              value: 'INCOME',
              icon: (
                <PlusCircle
                  className={`w-4 h-4 inline mr-1 ${
                    !isExpense ? 'text-[var(--color-success-500)]' : 'text-text-muted'
                  }`}
                />
              ),
            },
          ]}
          className="w-full bg-bg-subtle p-1 border border-border-base rounded-xl"
          block
        />
      </div>

      {/* ── Hero Amount Input Section ── */}
      <div className="space-y-2">
        <Form.Item
          name="amount"
          className="mb-1"
          rules={[{ required: true, message: 'Please enter an amount' }]}
        >
          <HeroAmountInput
            value={form.getFieldValue('amount')}
            onChange={(val) => form.setFieldsValue({ amount: val })}
            label={isExpense ? 'EXPENSE AMOUNT' : 'INCOME AMOUNT'}
            badgeVariant={isExpense ? 'danger' : 'success'}
            placeholder="0.00"
          />
        </Form.Item>

        {/* Quick Amount Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-[11px] text-text-muted font-medium shrink-0 mr-1">Quick Add:</span>
          {QUICK_AMOUNTS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAddAmount(val)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all active:scale-95 font-financial cursor-pointer ${
                isExpense
                  ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-500)]/20 text-[var(--color-danger-500)] hover:bg-[var(--color-danger-bg)]/80'
                  : 'bg-[var(--color-success-bg)] border-[var(--color-success-500)]/20 text-[var(--color-success-500)] hover:bg-[var(--color-success-bg)]/80'
              }`}
            >
              +{getCurrencySymbol()}{val}
            </button>
          ))}
        </div>
      </div>

      {/* ── Smart Category Filtering ── */}
      <Form.Item
        label={<span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Category</span>}
        className="mb-2"
      >
        <div className="grid grid-cols-3 gap-2">
          {activeCategories.map(({ name, icon: Icon }) => {
            const isSelected = selectedCategory === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCategory(name)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? isExpense
                      ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-500)] text-[var(--color-danger-500)] font-bold shadow-sm'
                      : 'bg-[var(--color-success-bg)] border-[var(--color-success-500)] text-[var(--color-success-500)] font-bold shadow-sm'
                    : 'bg-bg-subtle border-border-base text-text-muted hover:border-text-muted'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      </Form.Item>

      {/* ── Payment Instrument Selector ── */}
      <Form.Item
        label={<span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Payment Instrument</span>}
        className="mb-2"
      >
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
            const isSelected = paymentMethod === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentMethod(id)}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? isExpense
                      ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger-500)] text-[var(--color-danger-500)] font-bold'
                      : 'bg-[var(--color-success-bg)] border-[var(--color-success-500)] text-[var(--color-success-500)] font-bold'
                    : 'bg-bg-subtle border-border-base text-text-muted hover:border-text-muted'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[11px]">{label}</span>
              </button>
            );
          })}
        </div>
      </Form.Item>

      {/* ── Description Surface ── */}
      <Form.Item
        name="description"
        label={<span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Description / Note</span>}
        className="mb-2"
      >
        <Input
          placeholder="e.g. Groceries, Coffee, Salary payout"
          maxLength={100}
          className="rounded-xl bg-bg-surface border border-border-base text-text-base placeholder:text-text-muted/50 px-3 py-2 h-11 text-sm"
        />
      </Form.Item>

      {/* ── Transaction Date ── */}
      <Form.Item
        name="date"
        label={<span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Date</span>}
        rules={[{ required: true }]}
        className="mb-2"
      >
        <DatePicker className="w-full rounded-xl bg-bg-surface border border-border-base h-11" style={{ width: '100%' }} allowClear={false} />
      </Form.Item>
    </Form>
  );

  // ══════════════════════════════════════════════════════════════
  //  Mobile Bottom Sheet Drawer View (< 640px)
  // ══════════════════════════════════════════════════════════════
  if (isMobile) {
    if (!isRendered) return null;

    return createPortal(
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
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isExpense ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-success-500)]'
                  }`}
                />
                <h2 className="text-base font-bold text-text-main m-0 select-none">
                  {isEditing ? 'Edit Personal Transaction' : 'Add Personal Cash Flow'}
                </h2>
              </div>
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
            {formContent}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 bg-bg-surface/95 backdrop-blur-md pt-2.5 pb-safe px-4 pb-4 border-t border-border-subtle flex gap-2.5 shrink-0 z-10">
            <Button
              size="large"
              onClick={() => triggerDismiss()}
              disabled={submitting}
              className="rounded-xl flex-1 h-12 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={submitting}
              className={`rounded-xl flex-[2] h-12 font-bold border-none transition-all text-white flex items-center justify-center ${
                isExpense
                  ? 'bg-danger-500 hover:bg-danger-600 shadow-lg shadow-danger-500/25 active:scale-[0.98]'
                  : 'bg-success-500 hover:bg-success-600 shadow-lg shadow-success-500/25 active:scale-[0.98]'
              }`}
            >
              {isEditing ? 'Update' : 'Save'} {isExpense ? 'Expense' : 'Income'}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  Desktop Centered Modal View (>= 640px)
  // ══════════════════════════════════════════════════════════════
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isExpense ? 'bg-[var(--color-danger-500)]' : 'bg-[var(--color-success-500)]'
            }`}
          />
          <span className="font-bold text-text-main">
            {isEditing ? 'Edit Personal Transaction' : 'Add Personal Cash Flow'}
          </span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      width={520}
      destroyOnClose
      style={{ top: 20 }}
      footer={
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button onClick={handleCancel} disabled={submitting} className="rounded-xl font-medium">
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            className={`rounded-xl font-bold border-none px-5 text-white ${
              isExpense
                ? 'bg-danger-500 hover:bg-danger-600 shadow-md shadow-danger-500/20'
                : 'bg-success-500 hover:bg-success-600 shadow-md shadow-success-500/20'
            }`}
          >
            {isEditing ? 'Update' : 'Save'} {isExpense ? 'Expense' : 'Income'}
          </Button>
        </div>
      }
    >
      <div className="py-2">
        {formContent}
      </div>
    </Modal>
  );
}
