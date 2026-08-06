import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Segmented,
  Checkbox,
  Button,
  message,
  Alert,
  Divider,
  Space,
  Typography,
} from 'antd';
import {
  MOCK_CURRENT_USER,
  MOCK_GROUPS,
  MOCK_GROUP_MEMBERS,
  MOCK_CATEGORIES,
} from '../lib/mockData';
import { SplitEngine } from '../core/domain/SplitEngine';
import type { SplitMode, SplitParticipant, GroupMember } from '../types';
import { formatCents } from '../utils/currency';

const { Text } = Typography;

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string;
}

/** Split mode options for the Segmented control */
const SPLIT_MODE_OPTIONS = [
  { label: 'Equal', value: 'equal' },
  { label: 'Exact', value: 'exact' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'Shares', value: 'shares' },
] as const;

/**
 * Returns group members for a given group ID.
 * Falls back to an empty array for unknown groups.
 */
function getMembersForGroup(groupId: string): GroupMember[] {
  return MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === groupId);
}

export function AddExpenseModal({ open, onClose, groupId }: AddExpenseModalProps) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // ── Form state ──────────────────────────────────────────────
  const [description, setDescription] = useState('');
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(groupId);
  const [payerId, setPayerId] = useState(MOCK_CURRENT_USER.id);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');

  // ── Split-specific state ────────────────────────────────────
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, number | null>>({});
  const [percentages, setPercentages] = useState<Record<string, number | null>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  // ── Validation ──────────────────────────────────────────────
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Derived: members of the selected group ──────────────────
  const members = useMemo(() => {
    if (!selectedGroupId) return [];
    return getMembersForGroup(selectedGroupId);
  }, [selectedGroupId]);

  // Reset split state whenever group or split mode changes
  useEffect(() => {
    const allIds = members.map((m) => m.user_id);
    setSelectedUserIds(allIds);
    setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
    setPercentages(Object.fromEntries(allIds.map((id) => [id, null])));
    setShares(Object.fromEntries(allIds.map((id) => [id, 1])));
    setValidationError(null);
  }, [members, splitMode]);

  // Sync groupId prop when modal opens
  useEffect(() => {
    if (open && groupId) {
      setSelectedGroupId(groupId);
    }
  }, [open, groupId]);

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
    (userId: string): string => {
      const member = members.find((m) => m.user_id === userId);
      if (!member?.profile) return userId;
      return userId === MOCK_CURRENT_USER.id
        ? `${member.profile.full_name} (you)`
        : member.profile.full_name;
    },
    [members],
  );

  // ── Reset all form state ────────────────────────────────────
  const resetForm = useCallback(() => {
    setDescription('');
    setAmountValue(null);
    setCategoryId(undefined);
    setSelectedGroupId(groupId);
    setPayerId(MOCK_CURRENT_USER.id);
    setSplitMode('equal');
    setValidationError(null);
    form.resetFields();
  }, [form, groupId]);

  // ── Handle cancel / close ───────────────────────────────────
  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ── Compute splits & submit ─────────────────────────────────
  const handleSave = useCallback(() => {
    // Basic validation
    if (!description.trim()) {
      setValidationError('Please enter a description.');
      return;
    }
    if (totalCents <= 0) {
      setValidationError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!selectedGroupId) {
      setValidationError('Please select a group.');
      return;
    }

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

    // Log result (no real backend yet)
    const expensePayload = {
      description,
      totalCents,
      currencyCode: 'USD',
      categoryId,
      groupId: selectedGroupId,
      payerId,
      splitMode,
      splits,
    };

    console.log('[AddExpenseModal] Expense saved:', expensePayload);
    console.table(
      splits.map((s) => ({
        user: memberName(s.userId),
        amountOwed: formatCents(s.amountOwed),
      })),
    );

    messageApi.success('Expense added successfully!');
    resetForm();
    onClose();
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
  ]);

  // ══════════════════════════════════════════════════════════════
  //  Render helpers
  // ══════════════════════════════════════════════════════════════

  /** Toggle a single participant in/out of equal split */
  const toggleParticipant = useCallback(
    (userId: string, checked: boolean) => {
      setSelectedUserIds((prev) =>
        checked ? [...prev, userId] : prev.filter((id) => id !== userId),
      );
    },
    [],
  );

  // ── Equal split panel ───────────────────────────────────────
  const renderEqualSplit = () => (
    <div className="space-y-2">
      {members.map((m) => (
        <div
          key={m.user_id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
        >
          <Checkbox
            checked={selectedUserIds.includes(m.user_id)}
            onChange={(e) => toggleParticipant(m.user_id, e.target.checked)}
          >
            <span className="text-sm font-medium">{memberName(m.user_id)}</span>
          </Checkbox>
          {selectedUserIds.includes(m.user_id) && totalCents > 0 && (
            <Text type="secondary" className="text-sm">
              {formatCents(equalPerPerson)}
            </Text>
          )}
        </div>
      ))}
    </div>
  );

  // ── Exact split panel ───────────────────────────────────────
  const renderExactSplit = () => (
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3">
          <span className="min-w-[120px] text-sm font-medium">{memberName(m.user_id)}</span>
          <InputNumber
            prefix="$"
            min={0}
            step={0.01}
            precision={2}
            className="flex-1"
            placeholder="0.00"
            value={exactAmounts[m.user_id]}
            onChange={(val) =>
              setExactAmounts((prev) => ({ ...prev, [m.user_id]: val }))
            }
          />
        </div>
      ))}

      <div
        className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ${
          exactRemaining === 0
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-orange-50 text-orange-700'
        }`}
      >
        {exactRemaining === 0
          ? '✓ Amounts add up perfectly'
          : exactRemaining > 0
            ? `${formatCents(exactRemaining)} remaining to assign`
            : `${formatCents(Math.abs(exactRemaining))} over the total`}
      </div>
    </div>
  );

  // ── Percentage split panel ──────────────────────────────────
  const renderPercentageSplit = () => (
    <div className="space-y-3">
      {members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3">
          <span className="min-w-[120px] text-sm font-medium">{memberName(m.user_id)}</span>
          <InputNumber
            suffix="%"
            min={0}
            max={100}
            step={1}
            precision={2}
            className="flex-1"
            placeholder="0"
            value={percentages[m.user_id]}
            onChange={(val) =>
              setPercentages((prev) => ({ ...prev, [m.user_id]: val }))
            }
          />
          {totalCents > 0 && percentages[m.user_id] != null && (
            <Text type="secondary" className="min-w-[70px] text-right text-xs">
              {formatCents(Math.round(((percentages[m.user_id] ?? 0) / 100) * totalCents))}
            </Text>
          )}
        </div>
      ))}

      <div
        className={`mt-2 rounded-md px-3 py-2 text-sm font-medium ${
          Math.abs(percentageSum - 100) < 0.01
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-orange-50 text-orange-700'
        }`}
      >
        {Math.abs(percentageSum - 100) < 0.01
          ? '✓ Percentages add up to 100%'
          : `Total: ${percentageSum.toFixed(2)}% — must equal 100%`}
      </div>
    </div>
  );

  // ── Shares split panel ──────────────────────────────────────
  const renderSharesSplit = () => (
    <div className="space-y-3">
      {members.map((m) => {
        const userShare = shares[m.user_id] ?? 0;
        const shareAmount =
          totalShares > 0 && totalCents > 0
            ? Math.floor((userShare / totalShares) * totalCents)
            : 0;

        return (
          <div key={m.user_id} className="flex items-center gap-3">
            <span className="min-w-[120px] text-sm font-medium">{memberName(m.user_id)}</span>
            <div className="flex items-center gap-1">
              <Button
                size="small"
                disabled={userShare <= 0}
                onClick={() =>
                  setShares((prev) => ({
                    ...prev,
                    [m.user_id]: Math.max(0, (prev[m.user_id] ?? 0) - 1),
                  }))
                }
              >
                −
              </Button>
              <InputNumber
                min={0}
                step={1}
                precision={0}
                className="w-16 text-center"
                value={userShare}
                onChange={(val) =>
                  setShares((prev) => ({ ...prev, [m.user_id]: val ?? 0 }))
                }
              />
              <Button
                size="small"
                onClick={() =>
                  setShares((prev) => ({
                    ...prev,
                    [m.user_id]: (prev[m.user_id] ?? 0) + 1,
                  }))
                }
              >
                +
              </Button>
            </div>
            {totalCents > 0 && (
              <Text type="secondary" className="min-w-[70px] text-right text-xs">
                {formatCents(shareAmount)}
              </Text>
            )}
          </div>
        );
      })}

      <Text type="secondary" className="mt-1 block text-xs">
        Total shares: {totalShares}
      </Text>
    </div>
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
        return renderEqualSplit();
      case 'exact':
        return renderExactSplit();
      case 'percentage':
        return renderPercentageSplit();
      case 'shares':
        return renderSharesSplit();
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
        title="Add Expense"
        open={open}
        onCancel={handleCancel}
        width={560}
        destroyOnClose
        footer={
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {validationError && (
                <Text type="danger" className="text-sm">
                  {validationError}
                </Text>
              )}
            </div>
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" onClick={handleSave}>
                Save Expense
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" className="space-y-4">
          {/* ── Header Section ─────────────────────────────────── */}
          <Form.Item label="Description" className="mb-3">
            <Input
              placeholder="e.g. Dinner at Ocean Drive"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </Form.Item>

          <div className="flex gap-3">
            <Form.Item label="Amount" className="mb-3 flex-1">
              <InputNumber
                prefix="$"
                placeholder="0.00"
                min={0}
                step={0.01}
                precision={2}
                className="w-full"
                value={amountValue}
                onChange={(val) => setAmountValue(val)}
              />
            </Form.Item>

            <Form.Item label="Category" className="mb-3 flex-1">
              <Select
                placeholder="Select category"
                allowClear
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={MOCK_CATEGORIES.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item label="Group" className="mb-3">
            <Select
              placeholder="Select group"
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              options={MOCK_GROUPS.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </Form.Item>

          <Divider className="my-2" />

          {/* ── Payer Section ──────────────────────────────────── */}
          <Form.Item label="Paid by" className="mb-3">
            <Select
              value={payerId}
              onChange={(val) => setPayerId(val)}
              options={
                members.length > 0
                  ? members.map((m) => ({
                      label: memberName(m.user_id),
                      value: m.user_id,
                    }))
                  : [{ label: MOCK_CURRENT_USER.full_name + ' (you)', value: MOCK_CURRENT_USER.id }]
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
