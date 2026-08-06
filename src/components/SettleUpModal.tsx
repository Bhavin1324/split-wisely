import { useState, useMemo } from 'react';
import { Modal, Form, InputNumber, Select, Button, message, Typography } from 'antd';
import {
  MOCK_CURRENT_USER,
  MOCK_PROFILES,
  MOCK_GROUPS,
} from '../lib/mockData';
import { formatCents } from '../utils/currency';
import type { Profile } from '../types';

const { Text } = Typography;

interface SettleUpModalProps {
  open: boolean;
  onClose: () => void;
  defaultPayeeId?: string;
  defaultGroupId?: string;
  defaultAmountCents?: number;
}

export function SettleUpModal({
  open,
  onClose,
  defaultPayeeId,
  defaultGroupId,
  defaultAmountCents,
}: SettleUpModalProps) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [payerId, setPayerId] = useState<string>(MOCK_CURRENT_USER.id);
  const [payeeId, setPayeeId] = useState<string | undefined>(defaultPayeeId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(defaultGroupId);
  const [amountValue, setAmountValue] = useState<number | null>(
    defaultAmountCents ? defaultAmountCents / 100 : null,
  );

  const availablePayees = useMemo(() => {
    return MOCK_PROFILES.filter((p) => p.id !== payerId);
  }, [payerId]);

  const totalCents = useMemo(() => {
    if (!amountValue || amountValue <= 0) return 0;
    return Math.round(amountValue * 100);
  }, [amountValue]);

  const handleSave = () => {
    if (!payeeId) {
      messageApi.error('Please select a person to settle with.');
      return;
    }
    if (totalCents <= 0) {
      messageApi.error('Please enter a valid amount.');
      return;
    }

    const payer = MOCK_PROFILES.find((p) => p.id === payerId)?.full_name ?? payerId;
    const payee = MOCK_PROFILES.find((p) => p.id === payeeId)?.full_name ?? payeeId;

    console.log('[SettleUpModal] Settlement recorded:', {
      payerId,
      payeeId,
      groupId: selectedGroupId,
      amountCents: totalCents,
    });

    messageApi.success(`Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`);
    onClose();
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
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSave} className="bg-emerald-600">
            Save Payment
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="space-y-4 pt-2">
          <Form.Item label="Payer (Who paid?)" className="mb-3">
            <Select
              value={payerId}
              onChange={(val) => setPayerId(val)}
              options={MOCK_PROFILES.map((p) => ({
                label: p.id === MOCK_CURRENT_USER.id ? `${p.full_name} (You)` : p.full_name,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Payee (Who received the money?)" className="mb-3">
            <Select
              placeholder="Select recipient"
              value={payeeId}
              onChange={(val) => setPayeeId(val)}
              options={availablePayees.map((p: Profile) => ({
                label: p.full_name,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Group (Optional)" className="mb-3">
            <Select
              placeholder="None (Direct 1-on-1 settlement)"
              allowClear
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              options={MOCK_GROUPS.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Amount" className="mb-3">
            <InputNumber
              prefix="$"
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
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-emerald-800 text-sm">
              ✨ Recording payment: <Text strong>{formatCents(totalCents)}</Text>
            </div>
          )}
        </Form>
      </Modal>
    </>
  );
}
