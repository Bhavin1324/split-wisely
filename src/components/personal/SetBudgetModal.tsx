import { useState, useEffect } from "react";
import { Modal, Form, InputNumber, Button, Switch, App } from "antd";
import { getCurrencySymbol, formatCents } from "../../utils/currency";

interface SetBudgetModalProps {
  open: boolean;
  onClose: () => void;
  currentBudgetCents: number | null;
  currentOpeningBalanceCents?: number | null;
  currentDynamicBudgetEnabled?: boolean;
  onSave: (
    amountCents: number | null,
    openingBalanceCents: number | null,
    isManual: boolean,
    dynamicBudgetEnabled: boolean
  ) => Promise<void> | void;
}

export function SetBudgetModal({
  open,
  onClose,
  currentBudgetCents,
  currentOpeningBalanceCents,
  currentDynamicBudgetEnabled = false,
  onSave,
}: SetBudgetModalProps) {
  const { message } = App.useApp();
  const [amountValue, setAmountValue] = useState<number | null>(
    currentBudgetCents ? currentBudgetCents / 100 : null
  );
  const [openingBalanceValue, setOpeningBalanceValue] = useState<number | null>(
    currentOpeningBalanceCents !== null && currentOpeningBalanceCents !== undefined
      ? currentOpeningBalanceCents / 100
      : null
  );
  const [dynamicBudget, setDynamicBudget] = useState<boolean>(currentDynamicBudgetEnabled);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountValue(currentBudgetCents ? currentBudgetCents / 100 : null);
      setOpeningBalanceValue(
        currentOpeningBalanceCents !== null && currentOpeningBalanceCents !== undefined
          ? currentOpeningBalanceCents / 100
          : null
      );
      setDynamicBudget(currentDynamicBudgetEnabled);
    }
  }, [open, currentBudgetCents, currentOpeningBalanceCents, currentDynamicBudgetEnabled]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const cents = amountValue && amountValue > 0 ? Math.round(amountValue * 100) : null;
      const openingBalanceCents =
        openingBalanceValue !== null && !isNaN(openingBalanceValue)
          ? Math.round(openingBalanceValue * 100)
          : null;
      const isManual = openingBalanceCents !== null;
      await onSave(cents, openingBalanceCents, isManual, dynamicBudget);
      message.success(cents ? `Monthly budget set to ${formatCents(cents)}` : "Monthly budget updated");
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
      const openingBalanceCents =
        openingBalanceValue !== null && !isNaN(openingBalanceValue)
          ? Math.round(openingBalanceValue * 100)
          : null;
      const isManual = openingBalanceCents !== null;
      await onSave(null, openingBalanceCents, isManual, false);
      message.success("Budget removed successfully");
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
            size="large"
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

        <Form.Item label="Opening Balance (start of month)">
          <InputNumber
            size="large"
            controls={false}
            prefix={<span className="font-financial">{getCurrencySymbol()}</span>}
            placeholder="e.g. 18685.59"
            min={0}
            precision={2}
            style={{ width: "100%" }}
            className="w-full text-lg font-financial"
            value={openingBalanceValue}
            onChange={(val) => setOpeningBalanceValue(val)}
          />
          <p className="text-xs text-text-muted mt-1">
            Set your starting balance for the month. Once set, historical computation is bypassed.
          </p>
        </Form.Item>

        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle/70 border border-border-subtle">
          <div className="space-y-0.5 pr-3">
            <div className="text-xs font-semibold text-text-main">Dynamic Budgeting</div>
            <div className="text-[11px] text-text-muted">
              Offset income and refunds directly against spending budget
            </div>
          </div>
          <Switch checked={dynamicBudget} onChange={setDynamicBudget} size="default" />
        </div>

        <p className="text-xs text-text-muted">
          Setting a target budget will calculate your daily safe spending limit and progress bar for the selected month.
        </p>

        <div className="flex justify-end gap-2 pt-4 border-t border-border-base">
          {currentBudgetCents !== null && (
            <Button size="large" danger onClick={handleClear} loading={submitting}>
              Remove
            </Button>
          )}
          <Button size="large" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="large" type="primary" onClick={handleSubmit} loading={submitting}>
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
