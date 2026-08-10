import { useState, useMemo, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, Button, message, Typography } from 'antd';
import {
  MOCK_CURRENT_USER,
  MOCK_PROFILES,
} from '../lib/mockData';
import { formatCents, getStoredCurrency, getCurrencySymbol } from '../utils/currency';
import type { Profile } from '../types';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/supabase/useProfileData';
import { createSettlement } from '../hooks/supabase/useMutations';

const { Text } = Typography;

interface SettleUpModalProps {
  open: boolean;
  onClose: () => void;
  defaultPayeeId?: string;
  defaultPayeeName?: string;
  defaultGroupId?: string;
  defaultAmountCents?: number;
  maxAmountCents?: number;
}

export function SettleUpModal({
  open,
  onClose,
  defaultPayeeId,
  defaultPayeeName,
  defaultGroupId,
  defaultAmountCents,
  maxAmountCents,
}: SettleUpModalProps) {
  const { user } = useAuth();
  const { currentUser, groups } = useAppData();
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [payerId, setPayerId] = useState<string>(userId);
  const [payeeId, setPayeeId] = useState<string | undefined>(defaultPayeeId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(defaultGroupId);
  const [amountValue, setAmountValue] = useState<number | null>(
    defaultAmountCents ? defaultAmountCents / 100 : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (userId) setPayerId(userId);
      setPayeeId(defaultPayeeId);
      setSelectedGroupId(defaultGroupId);
      setAmountValue(defaultAmountCents ? defaultAmountCents / 100 : null);
    }
  }, [open, userId, defaultPayeeId, defaultGroupId, defaultAmountCents]);

  const { data: liveFriends } = useFriends(user?.id);

  const availablePayees = useMemo(() => {
    const friendsList = DEMO_MODE ? MOCK_PROFILES : (liveFriends || []);
    return friendsList.filter((p) => p.id !== payerId);
  }, [payerId, liveFriends]);

  const totalCents = useMemo(() => {
    if (!amountValue || amountValue <= 0) return 0;
    return Math.round(amountValue * 100);
  }, [amountValue]);

  const selectedPayeeObj = useMemo(() => {
    return availablePayees.find((p) => p.id === payeeId);
  }, [availablePayees, payeeId]);

  const upiIntent = useMemo(() => {
    if (!selectedPayeeObj?.upi_id || !amountValue) return null;
    
    // Ensure amount is formatted strictly to 2 decimal places (e.g., 10.00)
    // as some strict UPI apps will reject or drop the amount otherwise.
    const formattedAmount = amountValue.toFixed(2);
    const payeeName = encodeURIComponent(selectedPayeeObj.full_name);
    const note = encodeURIComponent('Expense Settlement via Split Wisely');
    
    return `upi://pay?pa=${selectedPayeeObj.upi_id}&pn=${payeeName}&am=${formattedAmount}&cu=INR&tn=${note}`;
  }, [selectedPayeeObj, amountValue]);

  const handleSave = async (skipClose = false) => {
    if (!payeeId) {
      messageApi.error('Please select a person to settle with.');
      return;
    }
    if (totalCents <= 0) {
      messageApi.error('Please enter a valid amount.');
      return;
    }
    if (maxAmountCents !== undefined && totalCents > maxAmountCents) {
      messageApi.error(`You cannot settle more than you owe (${formatCents(maxAmountCents)}).`);
      return;
    }

    const payer = DEMO_MODE 
      ? (MOCK_PROFILES.find((p) => p.id === payerId)?.full_name ?? payerId)
      : (payerId === userId ? (currentUser?.full_name ?? payerId) : payerId);

    const payee = DEMO_MODE
      ? (MOCK_PROFILES.find((p) => p.id === payeeId)?.full_name ?? payeeId)
      : (availablePayees.find((p) => p.id === payeeId)?.full_name ?? payeeId);

    if (DEMO_MODE) {
      console.log('[SettleUpModal] Settlement recorded:', {
        payerId,
        payeeId,
        groupId: selectedGroupId,
        amountCents: totalCents,
      });

      messageApi.success(`Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`);
      onClose();
    } else {
      setIsSubmitting(true);
      try {
        await createSettlement({
          payer_id: payerId,
          payee_id: payeeId,
          group_id: selectedGroupId ?? null,
          amount: totalCents,
          currency_code: getStoredCurrency(),
        });
        messageApi.success(`Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`);
        window.dispatchEvent(new Event('expenseAdded'));
        if (!skipClose) {
          onClose();
        }
      } catch (error: any) {
        messageApi.error(error.message || 'Failed to record settlement');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpiClick = async () => {
    if (!upiIntent) return;
    window.location.href = upiIntent;
    messageApi.info(
      'Opening UPI App. Please complete the payment there, then return here and click "Save Payment" to record it.',
      5
    );
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="Settle Up — Record a Payment"
        open={open}
        onCancel={onClose}
        width={480}
        destroyOnClose
        style={{ top: 20 }}
        footer={null}
      >
        <Form form={form} layout="vertical" className="space-y-4 pt-2">
          <Form.Item label="Payer (Who paid?)" className="mb-3">
            <Select
              value={payerId}
              onChange={(val) => setPayerId(val)}
              options={[{
                label: `${currentUser?.full_name ?? (DEMO_MODE ? MOCK_CURRENT_USER.full_name : 'You')} (You)`,
                value: userId,
              }]}
            />
          </Form.Item>

          <Form.Item label="Payee (Who received the money?)" className="mb-3">
            <Select
              placeholder="Select recipient"
              value={payeeId}
              onChange={(val) => setPayeeId(val)}
              options={[
                ...availablePayees.map((p: Profile) => ({
                  label: p.full_name,
                  value: p.id,
                })),
                ...(payeeId && !availablePayees.some(p => p.id === payeeId) && defaultPayeeName
                  ? [{ label: defaultPayeeName, value: payeeId }]
                  : [])
              ]}
            />
          </Form.Item>

          <Form.Item label="Group (Optional)" className="mb-3">
            <Select
              placeholder="None (Direct 1-on-1 settlement)"
              allowClear
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              options={groups.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Amount" className="mb-3">
            <InputNumber
              prefix={getCurrencySymbol()}
              placeholder="0.00"
              min={0}
              step={0.01}
              precision={2}
              className="w-full text-lg"
              value={amountValue}
              onChange={(val) => setAmountValue(val)}
            />
          </Form.Item>

          {totalCents > 0 && (
            <div className="rounded-lg bg-primary-50 border border-primary-100 p-3 text-primary-800 text-sm">
              ✨ Recording payment: <Text strong>{formatCents(totalCents)}</Text>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button onClick={onClose} disabled={isSubmitting} size="large" className="w-full sm:w-auto">
              Cancel
            </Button>
            {upiIntent && (
              <Button type="primary" onClick={handleUpiClick} loading={isSubmitting} size="large" className="w-full sm:w-auto bg-[#1ea142] hover:bg-[#158032] font-semibold rounded-xl text-white border-none shadow-md">
                Pay via UPI App
              </Button>
            )}
            <Button type="primary" onClick={() => handleSave()} loading={isSubmitting} size="large" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-white border-none shadow-md">
              Save Payment
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
