import { useState, useEffect } from "react";
import { Drawer, Form, Input, InputNumber, Segmented, Button, App, DatePicker } from "antd";
import dayjs from "dayjs";
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
} from "lucide-react";
import { getCurrencySymbol } from "../../utils/currency";
import type { PersonalTransaction, TransactionType } from "../../types";

export interface CreateTransactionDTO {
  id?: string;
  type: "EXPENSE" | "INCOME";
  amount: number; // Stored in integer cents/paisa (displayValue * 100)
  category: string;
  paymentMethod?: "UPI" | "CARD" | "CASH" | "BANK";
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
  initialType?: "EXPENSE" | "INCOME";
}

const EXPENSE_CATEGORIES = [
  { name: "Food", icon: Utensils },
  { name: "Transport", icon: Car },
  { name: "Bills", icon: Zap },
  { name: "Shopping", icon: ShoppingBag },
  { name: "Entertainment", icon: Film },
  { name: "Health", icon: HeartPulse },
  { name: "Other", icon: Tag },
];

const INCOME_CATEGORIES = [
  { name: "Salary", icon: Banknote },
  { name: "Freelance", icon: Laptop },
  { name: "Investments", icon: TrendingUp },
  { name: "Gifts", icon: Gift },
  { name: "Refund", icon: RotateCcw },
  { name: "Other", icon: Tag },
];

const PAYMENT_METHODS = [
  { id: "UPI" as const, label: "UPI", icon: Smartphone },
  { id: "CARD" as const, label: "Card", icon: CreditCard },
  { id: "CASH" as const, label: "Cash", icon: Banknote },
  { id: "BANK" as const, label: "Bank", icon: Building2 },
];

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export function AddPersonalTransactionDrawer({
  open,
  onClose,
  existingTransaction,
  onSubmit,
  onAddTransaction,
  onUpdateTransaction,
  initialType = "EXPENSE",
}: AddPersonalTransactionDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string>("Food");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "CASH" | "BANK">("UPI");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeCategories = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isExpense = type === "EXPENSE";
  const isEditing = !!existingTransaction;

  useEffect(() => {
    if (open) {
      if (existingTransaction) {
        setType(existingTransaction.type);
        setSelectedCategory(existingTransaction.category);

        let desc = existingTransaction.description || "";
        let method: "UPI" | "CARD" | "CASH" | "BANK" = "UPI";
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
        const startType = initialType || "EXPENSE";
        setType(startType);
        setSelectedCategory(startType === "EXPENSE" ? "Food" : "Salary");
        setPaymentMethod("UPI");
        form.setFieldsValue({
          date: dayjs(),
        });
      }
    }
  }, [open, existingTransaction, initialType, form]);

  const handleTypeChange = (newTypeVal: TransactionType) => {
    setType(newTypeVal);
    if (newTypeVal === "EXPENSE") {
      if (!EXPENSE_CATEGORIES.some((c) => c.name === selectedCategory)) {
        setSelectedCategory("Food");
      }
    } else {
      if (!INCOME_CATEGORIES.some((c) => c.name === selectedCategory)) {
        setSelectedCategory("Salary");
      }
    }
  };

  const handleQuickAddAmount = (addVal: number) => {
    const currentVal = form.getFieldValue("amount") || 0;
    form.setFieldsValue({ amount: Number((currentVal + addVal).toFixed(2)) });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const amountValue = Number(values.amount);

      if (!amountValue || amountValue <= 0) {
        message.error("Please enter a valid positive amount");
        return;
      }

      setSubmitting(true);
      const amountCents = Math.round(amountValue * 100);
      const dateIso = values.date ? values.date.toISOString() : new Date().toISOString();

      const dto: CreateTransactionDTO = {
        id: existingTransaction?.id,
        type,
        amount: amountCents,
        category: selectedCategory,
        paymentMethod,
        description: values.description || "",
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

      onClose();
      form.resetFields();
    } catch (e: any) {
      if (e.message) message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isExpense ? "bg-[var(--color-danger-500)]" : "bg-[var(--color-success-500)]"
            }`}
          />
          <span className="font-bold text-text-base">
            {isEditing ? "Edit Personal Transaction" : "Add Personal Cash Flow"}
          </span>
        </div>
      }
      placement="bottom"
      onClose={onClose}
      open={open}
      height="88vh"
      className="rounded-t-3xl overflow-hidden"
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="space-y-4 max-w-md mx-auto pb-6">
        {/* ── Dynamic Type Toggle ── */}
        <div className="flex justify-center pb-1">
          <Segmented
            value={type}
            onChange={(val) => handleTypeChange(val as TransactionType)}
            options={[
              {
                label: (
                  <span className={isExpense ? "font-bold text-[var(--color-danger-500)]" : ""}>
                    Expense (-)
                  </span>
                ),
                value: "EXPENSE",
                icon: (
                  <MinusCircle
                    className={`w-4 h-4 inline mr-1 ${
                      isExpense ? "text-[var(--color-danger-500)]" : "text-text-muted"
                    }`}
                  />
                ),
              },
              {
                label: (
                  <span className={!isExpense ? "font-bold text-[var(--color-success-500)]" : ""}>
                    Income (+)
                  </span>
                ),
                value: "INCOME",
                icon: (
                  <PlusCircle
                    className={`w-4 h-4 inline mr-1 ${
                      !isExpense ? "text-[var(--color-success-500)]" : "text-text-muted"
                    }`}
                  />
                ),
              },
            ]}
            className="w-full bg-bg-subtle p-1 border border-border-base rounded-xl"
            block
          />
        </div>

        {/* ── Hero Amount Input Section (No Native Spinners, text-3xl/4xl) ── */}
        <div className="space-y-2">
          <Form.Item
            name="amount"
            className="mb-1"
            rules={[{ required: true, message: "Please enter an amount" }]}
          >
            <InputNumber
              controls={false}
              prefix={
                <span
                  className={`text-2xl sm:text-3xl font-bold mr-1 font-financial ${
                    isExpense ? "text-[var(--color-danger-500)]" : "text-[var(--color-success-500)]"
                  }`}
                >
                  {getCurrencySymbol()}
                </span>
              }
              placeholder="0.00"
              min={0.01}
              step={1}
              precision={2}
              className={`w-full text-3xl sm:text-4xl font-bold tracking-tight h-12 flex items-center rounded-2xl bg-bg-surface border border-border-base font-financial ${
                isExpense
                  ? "focus:border-[var(--color-danger-500)] focus:ring-2 focus:ring-[var(--color-danger-500)]/40"
                  : "focus:border-[var(--color-success-500)] focus:ring-2 focus:ring-[var(--color-success-500)]/40"
              }`}
              style={{ width: "100%" }}
              autoFocus
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all active:scale-95 font-financial ${
                  isExpense
                    ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-500)] hover:bg-[var(--color-danger-bg)]"
                    : "bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-500)] hover:bg-[var(--color-success-bg)]"
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
          className="mb-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {activeCategories.map(({ name, icon: Icon }) => {
              const isSelected = selectedCategory === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedCategory(name)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? isExpense
                        ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-500)] text-[var(--color-danger-500)] font-bold shadow-sm"
                        : "bg-[var(--color-success-bg)] border-[var(--color-success-500)] text-[var(--color-success-500)] font-bold shadow-sm"
                      : "bg-bg-subtle border-border-base text-text-muted hover:border-text-muted"
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
          className="mb-3"
        >
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
              const isSelected = paymentMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? isExpense
                        ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-500)] text-[var(--color-danger-500)] font-bold"
                        : "bg-[var(--color-success-bg)] border-[var(--color-success-500)] text-[var(--color-success-500)] font-bold"
                      : "bg-bg-subtle border-border-base text-text-muted hover:border-text-muted"
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
          className="mb-3"
        >
          <Input
            placeholder="e.g. Groceries, Coffee, Salary payout"
            maxLength={100}
            className="rounded-xl bg-bg-surface border border-border-base text-text-base placeholder:text-text-muted/50 px-3 py-2 h-12"
          />
        </Form.Item>

        {/* ── Transaction Date ── */}
        <Form.Item
          name="date"
          label={<span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Date</span>}
          rules={[{ required: true }]}
          className="mb-4"
        >
          <DatePicker className="w-full rounded-xl bg-bg-surface border border-border-base h-12" style={{ width: "100%" }} />
        </Form.Item>

        {/* ── Save / Submit Action Button (Unified Colors & Labels) ── */}
        <div className="pt-3 border-t border-border-base flex gap-3">
          <Button block size="large" onClick={onClose} disabled={submitting} className="rounded-xl">
            Cancel
          </Button>
          <Button
            block
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={submitting}
            className={`rounded-xl font-bold border-none transition-all ${
              isExpense
                ? "bg-gradient-to-r from-[var(--color-danger-500)] to-[var(--color-primary-600)] text-text-main shadow-lg shadow-[var(--color-danger-500)]/30"
                : "bg-gradient-to-r from-[var(--color-success-500)] to-[var(--color-primary-600)] text-text-main shadow-lg shadow-[var(--color-success-500)]/30"
            }`}
          >
            {isEditing ? "Update" : "Save"} {isExpense ? "Expense" : "Income"}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
