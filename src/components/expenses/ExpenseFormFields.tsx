import React from 'react';
import {
  Form,
  Input,
  Select,
  Segmented,
  Alert,
  DatePicker,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { SplitMode } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { HeroAmountInput } from '../ui/HeroAmountInput';
import { EqualSplitTab } from './EqualSplitTab';
import { ExactSplitTab } from './ExactSplitTab';
import { PercentageSplitTab } from './PercentageSplitTab';
import { SharesSplitTab } from './SharesSplitTab';

const { Text } = Typography;

export interface ExpenseFormFieldsProps {
  form: FormInstance;
  description: string;
  onDescriptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  amountValue: number | null;
  setAmountValue: (val: number | null) => void;
  categoryId: string | undefined;
  setCategoryId: (val: string | undefined) => void;
  categories: { id: string; name: string }[];
  expenseDate: Dayjs;
  setExpenseDate: (val: Dayjs) => void;
  selectedGroupId: string | undefined;
  setSelectedGroupId: (val: string | undefined) => void;
  groups: { id: string; name: string }[];
  payerId: string;
  setPayerId: (val: string) => void;
  members: { user_id: string; profile?: { full_name: string } }[];
  memberName: (uid: string) => string;
  splitMode: SplitMode;
  setSplitMode: (val: SplitMode) => void;
  selectedUserIds: string[];
  toggleParticipant: (uid: string, checked: boolean) => void;
  exactAmounts: Record<string, number | null>;
  setExactAmounts: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  percentages: Record<string, number | null>;
  setPercentages: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  shares: Record<string, number>;
  setShares: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  totalCents: number;
  equalPerPerson: number;
  exactRemaining: number;
  percentageSum: number;
  totalShares: number;
  fieldErrors: Record<string, string>;
  validationError: string | null;
  existingExpense?: boolean;
  isMobile: boolean;
  currentUserName: string;
  currentUserId: string;
}

export function ExpenseFormFields({
  form,
  description,
  onDescriptionChange,
  amountValue,
  setAmountValue,
  categoryId,
  setCategoryId,
  categories,
  expenseDate,
  setExpenseDate,
  selectedGroupId,
  setSelectedGroupId,
  groups,
  payerId,
  setPayerId,
  members,
  memberName,
  splitMode,
  setSplitMode,
  selectedUserIds,
  toggleParticipant,
  exactAmounts,
  setExactAmounts,
  percentages,
  setPercentages,
  shares,
  setShares,
  totalCents,
  equalPerPerson,
  exactRemaining,
  percentageSum,
  totalShares,
  fieldErrors,
  validationError,
  existingExpense,
  isMobile,
  currentUserName,
  currentUserId,
}: ExpenseFormFieldsProps) {
  const splitOptions = [
    { label: isMobile ? '= Equal' : 'Equal', value: 'equal' },
    { label: isMobile ? `${getCurrencySymbol()} Exact` : 'Exact', value: 'exact' },
    { label: isMobile ? '% Split' : 'Percentage', value: 'percentage' },
    { label: isMobile ? '½ Shares' : 'Shares', value: 'shares' },
  ];

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
        return (
          <EqualSplitTab
            members={members}
            selectedUserIds={selectedUserIds}
            totalCents={totalCents}
            equalPerPerson={equalPerPerson}
            memberName={memberName}
            toggleParticipant={toggleParticipant}
          />
        );
      case 'exact':
        return (
          <ExactSplitTab
            members={members}
            exactAmounts={exactAmounts}
            exactRemaining={exactRemaining}
            memberName={memberName}
            setExactAmounts={setExactAmounts}
          />
        );
      case 'percentage':
        return (
          <PercentageSplitTab
            members={members}
            percentages={percentages}
            percentageSum={percentageSum}
            totalCents={totalCents}
            memberName={memberName}
            setPercentages={setPercentages}
          />
        );
      case 'shares':
        return (
          <SharesSplitTab
            members={members}
            shares={shares}
            totalShares={totalShares}
            totalCents={totalCents}
            memberName={memberName}
            setShares={setShares}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Form form={form} layout="vertical" className="space-y-3">
      {/* ── 1. Hero Amount & Description Block ────────────────── */}
      <div className="space-y-2.5 pt-1 pb-1">
        <HeroAmountInput
          value={amountValue}
          onChange={(val) => setAmountValue(val)}
          label={existingExpense ? 'EDIT AMOUNT' : 'ENTER AMOUNT'}
          error={fieldErrors.amount}
          autoFocus={!existingExpense && !isMobile}
          placeholder="0.00"
        />

        <div className="w-full">
          <Input
            size="large"
            placeholder="What was this for? (e.g. Dinner, Uber, Groceries)"
            value={description}
            onChange={onDescriptionChange}
            maxLength={120}
            className="w-full rounded-xl bg-bg-subtle/60 border border-border-subtle hover:border-border-base focus:border-primary-500 text-sm font-medium px-3.5 py-2.5"
          />
          {fieldErrors.description && (
            <span className="text-xs text-danger-500 font-medium mt-1 block px-1">
              {fieldErrors.description}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Compact 2-Column Metadata Grid ─────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 my-2">
        {/* Category Select */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Category
          </label>
          <Select
            size="large"
            placeholder="Select category"
            allowClear
            className="w-full rounded-xl"
            status={fieldErrors.categoryId ? 'error' : undefined}
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            options={categories.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
          {fieldErrors.categoryId && (
            <span className="text-[11px] text-danger-500 font-medium block mt-0.5">
              {fieldErrors.categoryId}
            </span>
          )}
        </div>

        {/* Date Picker */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Date
          </label>
          <DatePicker
            size="large"
            className="w-full rounded-xl"
            status={fieldErrors.expenseDate ? 'error' : undefined}
            value={expenseDate}
            onChange={(val) => setExpenseDate(val || dayjs())}
            allowClear={false}
          />
          {fieldErrors.expenseDate && (
            <span className="text-[11px] text-danger-500 font-medium block mt-0.5">
              {fieldErrors.expenseDate}
            </span>
          )}
        </div>

        {/* Group Select */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Group
          </label>
          <Select
            size="large"
            placeholder="Select group"
            className="w-full rounded-xl"
            status={fieldErrors.groupId ? 'error' : undefined}
            value={selectedGroupId}
            onChange={(val) => setSelectedGroupId(val)}
            options={groups.map((g) => ({
              label: g.name,
              value: g.id,
            }))}
          />
          {fieldErrors.groupId && (
            <span className="text-[11px] text-danger-500 font-medium block mt-0.5">
              {fieldErrors.groupId}
            </span>
          )}
        </div>

        {/* Paid By Select */}
        <div>
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Paid By
          </label>
          <Select
            size="large"
            className="w-full rounded-xl"
            value={payerId}
            onChange={(val) => setPayerId(val)}
            options={
              members.length > 0
                ? members.map((m) => ({
                    label: memberName(m.user_id),
                    value: m.user_id,
                  }))
                : [{ label: `${currentUserName} (you)`, value: currentUserId }]
            }
          />
        </div>
      </div>

      {/* ── 3. Split Method Segmented Tabs ────────────────────── */}
      <div className="my-2 space-y-1.5">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
          Split Method
        </span>
        <Segmented
          block
          value={splitMode}
          onChange={(val) => setSplitMode(val as SplitMode)}
          options={splitOptions}
          className="bg-bg-subtle p-1 rounded-xl border border-border-subtle w-full text-xs font-semibold"
        />
      </div>

      {/* ── 4. Split Details Panel ───────────────────────────── */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-3 sm:p-4 my-2">
        {renderSplitDetails()}
      </div>

      {/* ── 5. Validation Alert ──────────────────────────────── */}
      {validationError && (
        <Alert message={validationError} type="error" showIcon className="my-2 rounded-xl text-xs" />
      )}
    </Form>
  );
}
