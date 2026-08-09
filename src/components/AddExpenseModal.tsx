import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Segmented,
  Button,
  message,
  Alert,
  Divider,
  Space,
  Typography,
  DatePicker,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUP_MEMBERS,
} from '../lib/mockData';
import { SplitEngine } from '../core/domain/SplitEngine';
import type { SplitMode, SplitParticipant } from '../types';
import { formatCents, getStoredCurrency, getCurrencySymbol } from '../utils/currency';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useGroupMembers } from '../hooks/supabase/useGroupsData';
import { createExpenseWithSplits, updateExpenseWithSplits } from '../hooks/supabase/useMutations';
import type { Expense } from '../types';

import { EqualSplitTab } from './expenses/EqualSplitTab';
import { ExactSplitTab } from './expenses/ExactSplitTab';
import { PercentageSplitTab } from './expenses/PercentageSplitTab';
import { SharesSplitTab } from './expenses/SharesSplitTab';

const { Text } = Typography;

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string;
  existingExpense?: Expense;
}

/** Split mode options for the Segmented control */
const SPLIT_MODE_OPTIONS = [
  { label: 'Equal', value: 'equal' },
  { label: 'Exact', value: 'exact' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'Shares', value: 'shares' },
] as const;

/** Keywords for auto-categorization based on description */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drink': ['dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'pizza', 'burger', 'coffee', 'cafe', 'drink', 'bar', 'beer', 'grocery'],
  'Transportation': ['uber', 'lyft', 'taxi', 'cab', 'bus', 'train', 'subway', 'flight', 'gas', 'parking', 'toll'],
  'Entertainment': ['movie', 'cinema', 'concert', 'ticket', 'game', 'club', 'party', 'rental', 'museum', 'bowling', 'netflix', 'hulu', 'disney', 'spotify', 'theater', 'theatre', 'show', 'amusement', 'park', 'zoo', 'aquarium', 'arcade', 'festival'],
  'Utilities & Rent': ['rent', 'water', 'electricity', 'internet', 'wifi', 'power', 'utility', 'trash', 'bill'],
  'Shopping': ['groceries', 'supermarket', 'mall', 'clothes', 'shoes', 'amazon', 'walmart', 'target', 'store'],
};

export function AddExpenseModal({ open, onClose, groupId, existingExpense }: AddExpenseModalProps) {
  const { currentUser, groups, categories } = useAppData();

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // ── Form state ──────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(groupId);
  const [expenseDate, setExpenseDate] = useState<Dayjs>(dayjs());
  
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');
  const [payerId, setPayerId] = useState(userId);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');

  // ── Split-specific state ────────────────────────────────────
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, number | null>>({});
  const [percentages, setPercentages] = useState<Record<string, number | null>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  // ── Validation ──────────────────────────────────────────────
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Data fetching ───────────────────────────────────────────
  const { data: liveMembers } = useGroupMembers(selectedGroupId || '');

  // ── Derived: members of the selected group ──────────────────
  const members = useMemo(() => {
    if (!selectedGroupId) return [];
    return DEMO_MODE 
      ? MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === selectedGroupId)
      : (liveMembers || []);
  }, [selectedGroupId, liveMembers]);

  // Reset split state whenever group or split mode changes
  useEffect(() => {
    // If we're populating an exact split from existingExpense, we might want to bypass reset if they just opened the modal.
    // However, if the user changes the group or split mode manually, we reset.
    // To handle initial load of existingExpense without resetting, we do it in a separate effect that depends on `open`.
    if (!existingExpense) {
      const allIds = members.map((m) => m.user_id);
      setSelectedUserIds(allIds);
      setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
      setPercentages(Object.fromEntries(allIds.map((id) => [id, null])));
      setShares(Object.fromEntries(allIds.map((id) => [id, 1])));
      setValidationError(null);
    }
  }, [members, splitMode]); // Note: removed existingExpense from dep array deliberately to prevent reset loops

  // Initialize from existingExpense or defaults when modal opens
  useEffect(() => {
    if (open) {
      if (existingExpense) {
        setDescription(existingExpense.description);
        setAmountValue(existingExpense.total_amount / 100);
        setCategoryId(existingExpense.category_id || undefined);
        setSelectedGroupId(existingExpense.group_id || undefined);
        setPayerId(existingExpense.payer_id);
        setExpenseDate(existingExpense.expense_date ? dayjs(existingExpense.expense_date) : dayjs());
        setSplitMode('exact');

        const allIds = members.map((m) => m.user_id);
        setSelectedUserIds(allIds);
        
        if (existingExpense.splits && existingExpense.splits.length > 0) {
          const exacts: Record<string, number | null> = {};
          allIds.forEach(id => {
            const split = existingExpense.splits?.find(s => s.user_id === id);
            exacts[id] = split ? split.amount_owed / 100 : null;
          });
          setExactAmounts(exacts);
        } else {
          setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
        }
      } else {
        // New Expense mode
        if (groupId) setSelectedGroupId(groupId);
        if (userId) setPayerId(userId);
        
        // Ensure split states are reset
        const allIds = members.map((m) => m.user_id);
        setSelectedUserIds(allIds);
        setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
        setPercentages(Object.fromEntries(allIds.map((id) => [id, null])));
        setShares(Object.fromEntries(allIds.map((id) => [id, 1])));
      }
    }
  }, [open, existingExpense, groupId, userId, members]);

  // ── Total in cents ──────────────────────────────────────────
  const totalCents = useMemo(() => {
    if (amountValue == null || amountValue <= 0) return 0;
    return Math.round(amountValue * 100);
  }, [amountValue]);

  // ── Equal split preview ─────────────────────────────────────
  const equalPerPerson = useMemo(() => {
    if (selectedUserIds.length === 0 || totalCents === 0) return 0;
    return Math.floor(totalCents / selectedUserIds.length);
  }, [totalCents, selectedUserIds]);

  // ── Exact split: remaining indicator ────────────────────────
  const exactSum = useMemo(() => {
    return Object.values(exactAmounts).reduce<number>(
      (acc, val) => acc + Math.round((val ?? 0) * 100),
      0,
    );
  }, [exactAmounts]);

  const exactRemaining = totalCents - exactSum;

  // ── Percentage split: sum indicator ─────────────────────────
  const percentageSum = useMemo(() => {
    return Object.values(percentages).reduce<number>((acc, val) => acc + (val ?? 0), 0);
  }, [percentages]);

  // ── Shares split: total shares ──────────────────────────────
  const totalShares = useMemo(() => {
    return Object.values(shares).reduce<number>((acc, val) => acc + val, 0);
  }, [shares]);

  /**
   * Resolves the display name for a user ID.
   * Falls back to the raw ID if profile is missing.
   */
  const memberName = useCallback(
    (uid: string): string => {
      const member = members.find((m) => m.user_id === uid);
      if (!member?.profile) return uid;
      return uid === userId
        ? `${member.profile.full_name} (you)`
        : member.profile.full_name;
    },
    [members, userId],
  );

  // ── Reset all form state ────────────────────────────────────
  const resetForm = useCallback(() => {
    setDescription('');
    setAmountValue(null);
    setCategoryId(undefined);
    setSelectedGroupId(groupId);
    setExpenseDate(dayjs());
    setPayerId(userId);
    setSplitMode('equal');
    setValidationError(null);
    setFieldErrors({});
    form.resetFields();
  }, [form, groupId, userId]);

  // ── Auto-categorization handler ─────────────────────────────
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    // Only auto-categorize if no category is currently selected
    if (!categoryId) {
      const lowerDesc = val.toLowerCase();
      let matchedCategoryName: string | null = null;

      for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lowerDesc.includes(kw))) {
          matchedCategoryName = catName;
          break;
        }
      }

      if (matchedCategoryName) {
        const match = categories.find(c => c.name === matchedCategoryName);
        if (match) {
          setCategoryId(match.id);
        }
      }
    }
  }, [categoryId, categories]);

  // ── Handle cancel / close ───────────────────────────────────
  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ── Compute splits & submit ─────────────────────────────────
  const handleSave = useCallback(async () => {
    // Basic validation
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

    let splits: SplitParticipant[];

    try {
      switch (splitMode) {
        case 'equal': {
          if (selectedUserIds.length === 0) {
            setValidationError('Select at least one participant for equal split.');
            return;
          }
          splits = SplitEngine.equalSplit(totalCents, selectedUserIds);
          break;
        }
        case 'exact': {
          const entries = members.map((m) => ({
            userId: m.user_id,
            amount: Math.round((exactAmounts[m.user_id] ?? 0) * 100),
          }));
          splits = SplitEngine.exactSplit(totalCents, entries);
          break;
        }
        case 'percentage': {
          const entries = members.map((m) => ({
            userId: m.user_id,
            percentage: percentages[m.user_id] ?? 0,
          }));
          splits = SplitEngine.percentageSplit(totalCents, entries);
          break;
        }
        case 'shares': {
          const entries = members.map((m) => ({
            userId: m.user_id,
            share: shares[m.user_id] ?? 0,
          }));
          splits = SplitEngine.sharesSplit(totalCents, entries);
          break;
        }
        default:
          setValidationError('Unsupported split mode.');
          return;
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid split configuration.');
      return;
    }

    setValidationError(null);

    const expensePayload = {
      description,
      totalCents,
      currencyCode: getStoredCurrency(),
      categoryId,
      groupId: selectedGroupId,
      payerId,
      splitMode,
      splits,
    };

    if (DEMO_MODE) {
      console.log('[AddExpenseModal] Demo Mode Expense saved:', expensePayload);
      console.table(
        splits.map((s) => ({
          user: memberName(s.userId),
          amountOwed: formatCents(s.amountOwed),
        })),
      );
      messageApi.success(existingExpense ? 'Expense updated (Demo Mode)!' : 'Expense added successfully (Demo Mode)!');
      window.dispatchEvent(new Event('expenseAdded'));
      resetForm();
      onClose();
    } else {
      setIsSubmitting(true);
      try {
        if (existingExpense) {
          await updateExpenseWithSplits({
            expense_id: existingExpense.id,
            description,
            total_amount: totalCents,
            currency_code: getStoredCurrency(),
            exchange_rate: 1.0,
            group_id: selectedGroupId ?? null,
            payer_id: payerId,
            category_id: categoryId ?? null,
            receipt_image_url: existingExpense.receipt_image_url,
            expense_date: expenseDate.toISOString(),
            splits: splits.map(s => ({
              user_id: s.userId,
              amount_owed: s.amountOwed,
            }))
          });
          messageApi.success('Expense updated successfully!');
        } else {
          await createExpenseWithSplits({
            description,
            total_amount: totalCents,
            currency_code: getStoredCurrency(),
            exchange_rate: 1.0,
            group_id: selectedGroupId ?? null,
            payer_id: payerId,
            created_by: currentUser?.id ?? payerId,
            category_id: categoryId ?? null,
            receipt_image_url: null,
            expense_date: expenseDate.toISOString(),
            splits: splits.map(s => ({
              user_id: s.userId,
              amount_owed: s.amountOwed,
            }))
          });
          messageApi.success('Expense added successfully!');
        }
        window.dispatchEvent(new Event('expenseAdded'));
        resetForm();
        onClose();
      } catch (error: any) {
        setValidationError(error.message || 'Failed to save expense');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [
    description,
    totalCents,
    selectedGroupId,
    splitMode,
    selectedUserIds,
    members,
    exactAmounts,
    percentages,
    shares,
    categoryId,
    payerId,
    memberName,
    messageApi,
    resetForm,
    onClose,
    expenseDate,
    existingExpense,
    currentUser,
  ]);

  // ══════════════════════════════════════════════════════════════
  //  Render helpers
  // ══════════════════════════════════════════════════════════════

  /** Toggle a single participant in/out of equal split */
  const toggleParticipant = useCallback(
    (uid: string, checked: boolean) => {
      setSelectedUserIds((prev) =>
        checked ? [...prev, uid] : prev.filter((id) => id !== uid),
      );
    },
    [],
  );

  /** Render the active split details panel */
  const renderSplitDetails = () => {
    if (!selectedGroupId || members.length === 0) {
      return (
        <Text type="secondary" className="block py-4 text-center text-sm">
          Select a group to configure splits.
        </Text>
      );
    }

    switch (splitMode) {
      case 'equal':
        return <EqualSplitTab members={members} selectedUserIds={selectedUserIds} totalCents={totalCents} equalPerPerson={equalPerPerson} memberName={memberName} toggleParticipant={toggleParticipant} />;
      case 'exact':
        return <ExactSplitTab members={members} exactAmounts={exactAmounts} exactRemaining={exactRemaining} memberName={memberName} setExactAmounts={setExactAmounts} />;
      case 'percentage':
        return <PercentageSplitTab members={members} percentages={percentages} percentageSum={percentageSum} totalCents={totalCents} memberName={memberName} setPercentages={setPercentages} />;
      case 'shares':
        return <SharesSplitTab members={members} shares={shares} totalShares={totalShares} totalCents={totalCents} memberName={memberName} setShares={setShares} />;
      default:
        return null;
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  Main render
  // ══════════════════════════════════════════════════════════════
  return (
    <>
      {contextHolder}
      <Modal
        title={existingExpense ? "Edit Expense" : "Add Expense"}
        open={open}
        onCancel={handleCancel}
        width={560}
        destroyOnClose
        style={{ top: 20 }}
        footer={
          <div className="flex items-center justify-between">
            <div className="flex-1">
            </div>
            <Space>
              <Button onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
              <Button type="primary" onClick={handleSave} loading={isSubmitting}>
                Save Expense
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" className="space-y-4">
          {/* ── Header Section ─────────────────────────────────── */}
          <Form.Item 
            label="Description" 
            className="mb-3"
            validateStatus={fieldErrors.description ? 'error' : ''}
            help={fieldErrors.description}
          >
            <Input
              size="large"
              placeholder="e.g. Dinner at Ocean Drive"
              value={description}
              onChange={handleDescriptionChange}
              maxLength={120}
            />
          </Form.Item>

          <div className="flex flex-col sm:flex-row gap-3">
            <Form.Item 
              label="Amount" 
              className="mb-3 flex-1"
              validateStatus={fieldErrors.amount ? 'error' : ''}
              help={fieldErrors.amount}
            >
              <InputNumber
                size="large"
                prefix={getCurrencySymbol()}
                placeholder="0.00"
                min={0}
                step={0.01}
                precision={2}
                className="w-full"
                value={amountValue}
                onChange={(val) => setAmountValue(val)}
              />
            </Form.Item>

            <Form.Item 
              label="Category" 
              className="mb-3 flex-1"
              validateStatus={fieldErrors.categoryId ? 'error' : ''}
              help={fieldErrors.categoryId}
            >
              <Select
                size="large"
                placeholder="Select category"
                allowClear
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={categories.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>
            
            <Form.Item 
              label="Date" 
              className="mb-3 flex-1"
              validateStatus={fieldErrors.expenseDate ? 'error' : ''}
              help={fieldErrors.expenseDate}
            >
              <DatePicker 
                size="large"
                className="w-full"
                value={expenseDate}
                onChange={(val) => setExpenseDate(val || dayjs())}
                allowClear={false}
              />
            </Form.Item>
          </div>

          <Form.Item 
            label="Group" 
            className="mb-3"
            validateStatus={fieldErrors.groupId ? 'error' : ''}
            help={fieldErrors.groupId}
          >
            <Select
              size="large"
              placeholder="Select group"
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              options={groups.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </Form.Item>

          <Divider className="my-2" />

          {/* ── Payer Section ──────────────────────────────────── */}
          <Form.Item label="Paid by" className="mb-3">
            <Select
              size="large"
              value={payerId}
              onChange={(val) => setPayerId(val)}
              options={
                members.length > 0
                  ? members.map((m) => ({
                      label: memberName(m.user_id),
                      value: m.user_id,
                    }))
                  : [{ label: (currentUser?.full_name ?? MOCK_CURRENT_USER.full_name) + ' (you)', value: userId }]
              }
            />
          </Form.Item>

          <Divider className="my-2" />

          {/* ── Split Type Selector ────────────────────────────── */}
          <div className="mb-3">
            <Text strong className="mb-2 block text-sm">
              Split method
            </Text>
            <Segmented
              block
              value={splitMode}
              onChange={(val) => setSplitMode(val as SplitMode)}
              options={SPLIT_MODE_OPTIONS.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
            />
          </div>

          {/* ── Split Details ──────────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            {renderSplitDetails()}
          </div>

          {/* ── Validation Alert ───────────────────────────────── */}
          {validationError && (
            <Alert message={validationError} type="error" showIcon className="mt-2" />
          )}

          {/* ── Total summary ──────────────────────────────────── */}
          {totalCents > 0 && (
            <div className="mt-2 text-right">
              <Text type="secondary" className="text-sm">
                Total: <Text strong>{formatCents(totalCents)}</Text>
              </Text>
            </div>
          )}
        </Form>
      </Modal>
    </>
  );
}
