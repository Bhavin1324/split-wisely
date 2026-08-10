import { useState, useMemo, useEffect, useCallback } from 'react';
import { Form } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { SplitMode } from '../types';
import type { Expense } from '../types';
import { MOCK_GROUP_MEMBERS } from '../lib/mockData';
import { DEMO_MODE } from '../context/AppDataContext';
import { useGroupMembers } from './supabase/useGroupsData';

export function useExpenseForm(
  groupId: string | undefined,
  existingExpense: Expense | undefined,
  open: boolean,
  userId: string,
  _categories: any[],
) {
  const [form] = Form.useForm();

  const [description, setDescription] = useState('');
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(groupId);
  const [expenseDate, setExpenseDate] = useState<Dayjs>(dayjs());
  const [payerId, setPayerId] = useState(userId);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, number | null>>({});
  const [percentages, setPercentages] = useState<Record<string, number | null>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: liveMembers } = useGroupMembers(selectedGroupId || '');

  const members = useMemo(() => {
    if (!selectedGroupId) return [];
    return DEMO_MODE 
      ? MOCK_GROUP_MEMBERS.filter((gm) => gm.group_id === selectedGroupId)
      : (liveMembers || []);
  }, [selectedGroupId, liveMembers]);

  useEffect(() => {
    if (!existingExpense) {
      const allIds = members.map((m) => m.user_id);
      setSelectedUserIds(allIds);
      setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
      setPercentages(Object.fromEntries(allIds.map((id) => [id, null])));
      setShares(Object.fromEntries(allIds.map((id) => [id, 1])));
      setValidationError(null);
    }
  }, [members, splitMode, existingExpense]);

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
        if (groupId) setSelectedGroupId(groupId);
        if (userId) setPayerId(userId);
        
        const allIds = members.map((m) => m.user_id);
        setSelectedUserIds(allIds);
        setExactAmounts(Object.fromEntries(allIds.map((id) => [id, null])));
        setPercentages(Object.fromEntries(allIds.map((id) => [id, null])));
        setShares(Object.fromEntries(allIds.map((id) => [id, 1])));
      }
    }
  }, [open, existingExpense, groupId, userId, members]);

  const totalCents = useMemo(() => {
    if (amountValue == null || amountValue <= 0) return 0;
    return Math.round(amountValue * 100);
  }, [amountValue]);

  const equalPerPerson = useMemo(() => {
    if (selectedUserIds.length === 0 || totalCents === 0) return 0;
    return Math.floor(totalCents / selectedUserIds.length);
  }, [totalCents, selectedUserIds]);

  const exactSum = useMemo(() => {
    return Object.values(exactAmounts).reduce<number>(
      (acc, val) => acc + Math.round((val ?? 0) * 100),
      0,
    );
  }, [exactAmounts]);

  const exactRemaining = totalCents - exactSum;

  const percentageSum = useMemo(() => {
    return Object.values(percentages).reduce<number>((acc, val) => acc + (val ?? 0), 0);
  }, [percentages]);

  const totalShares = useMemo(() => {
    return Object.values(shares).reduce<number>((acc, val) => acc + val, 0);
  }, [shares]);

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

  return {
    form,
    description, setDescription,
    amountValue, setAmountValue,
    categoryId, setCategoryId,
    selectedGroupId, setSelectedGroupId,
    expenseDate, setExpenseDate,
    payerId, setPayerId,
    splitMode, setSplitMode,
    selectedUserIds, setSelectedUserIds,
    exactAmounts, setExactAmounts,
    percentages, setPercentages,
    shares, setShares,
    validationError, setValidationError,
    isSubmitting, setIsSubmitting,
    fieldErrors, setFieldErrors,
    members,
    totalCents,
    equalPerPerson,
    exactRemaining,
    percentageSum,
    totalShares,
    resetForm,
  };
}
