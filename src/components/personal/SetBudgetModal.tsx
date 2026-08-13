import { useState, useEffect } from "react";
import { Modal, Form, InputNumber, Button, App } from "antd";
import { getCurrencySymbol, formatCents } from "../../utils/currency";

interface SetBudgetModalProps {
  open: boolean;
  onClose: () => void;
  currentBudgetCents: number | null;
  onSave: (amountCents: number | null) => Promise<void> | void;
}

export function SetBudgetModal({
  open,
  onClose,
  currentBudgetCents,
  onSave,
}: SetBudgetModalProps) {
  const { message } = App.useApp();
  const [amountValue, setAmountValue] = useState<number | null>(
    currentBudgetCents ? currentBudgetCents / 100 : null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountValue(currentBudgetCents ? currentBudgetCents / 100 : null);
    }
  }, [open, currentBudgetCents]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const cents = amountValue && amountValue > 0 ? Math.round(amountValue * 100) : null;
      await onSave(cents);
      message.success(cents ? `Monthly budget set to ${formatCents(cents)}` : "Monthly budget cleared");
      onClose();
    } catch (e: any) {
      message.error(e.message || "Failed to update budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    setSubmitting(true);
    try {
      await onSave(null);
      message.success("Budget cleared");
      onClose();
    } catch (e: any) {
      message.error(e.message || "Failed to clear budget");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Set Monthly Target Budget"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={420}
    >
      <Form layout="vertical" className="space-y-4 pt-3">
        <Form.Item label="Target Spending Budget for this Month">
          <InputNumber
            controls={false}
            prefix={<span className="font-financial">{getCurrencySymbol()}</span>}
            placeholder="e.g. 50000"
            min={0}
            step={100}
            precision={2}
            style={{ width: "100%" }}
            className="w-full text-lg font-financial"
            value={amountValue}
            onChange={(val) => setAmountValue(val)}
          />
        </Form.Item>

        <p className="text-xs text-text-muted">
          Setting a target budget will calculate your daily safe spending limit and progress bar for the selected month.
        </p>

        <div className="flex justify-end gap-2 pt-4 border-t border-border-base">
          {currentBudgetCents !== null && (
            <Button danger onClick={handleClear} loading={submitting}>
              Remove Budget
            </Button>
          )}
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={submitting}>
            Save Budget
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
