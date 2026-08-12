import { useState, useMemo, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Button,
  message,
  Typography,
} from "antd";
import { MOCK_CURRENT_USER, MOCK_PROFILES } from "../lib/mockData";
import {
  formatCents,
  getStoredCurrency,
  getCurrencySymbol,
} from "../utils/currency";
import type { Profile } from "../types";
import { useAppData, DEMO_MODE } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../hooks/supabase/useProfileData";
import { createSettlement } from "../hooks/supabase/useMutations";
import { supabase } from "../lib/supabase";

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
  const userId = currentUser?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : "");

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [payerId, setPayerId] = useState<string>(userId);
  const [payeeId, setPayeeId] = useState<string | undefined>(defaultPayeeId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    defaultGroupId,
  );
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
    const friendsList = DEMO_MODE ? MOCK_PROFILES : liveFriends || [];
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

    const upiId = selectedPayeeObj.upi_id.trim();
    // BHIM BUG WORKAROUND: BHIM fails to decode %20 and will display "John%20Doe". 
    // Since literal spaces are illegal in URIs, we remove spaces entirely -> "JohnDoe"
    const payeeName = selectedPayeeObj.full_name.replace(/\s+/g, '');
    const note = "Settlement"; 
    const merchantCategoryCode = "0000";
    const initiationMode = "04";
    const selectedCurrency = getStoredCurrency();

    // Generate a stable transaction reference ID tied to this specific amount & payee.
    // This safely allows idempotent retries if the user clicks "Pay" multiple times.
    const transactionRefId = uuidv4().replace(/-/g, '');

    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: formattedAmount,
      cu: selectedCurrency,
      tn: note,
      mc: merchantCategoryCode,
      mode: initiationMode,
      tr: transactionRefId
    });

    const queryString = params.toString().replace(/\+/g, '%20');

    return `upi://pay?${queryString}`;
  }, [selectedPayeeObj, amountValue]);

  const handleSave = async (skipClose = false) => {
    if (!payeeId) {
      messageApi.error("Please select a person to settle with.");
      return;
    }
    if (totalCents <= 0) {
      messageApi.error("Please enter a valid amount.");
      return;
    }
    if (maxAmountCents !== undefined && totalCents > maxAmountCents) {
      messageApi.error(
        `You cannot settle more than you owe (${formatCents(maxAmountCents)}).`,
      );
      return;
    }

    const payer = DEMO_MODE
      ? (MOCK_PROFILES.find((p) => p.id === payerId)?.full_name ?? payerId)
      : payerId === userId
        ? (currentUser?.full_name ?? payerId)
        : payerId;

    const payee = DEMO_MODE
      ? (MOCK_PROFILES.find((p) => p.id === payeeId)?.full_name ?? payeeId)
      : (availablePayees.find((p) => p.id === payeeId)?.full_name ?? payeeId);

    if (DEMO_MODE) {
      console.log("[SettleUpModal] Settlement recorded:", {
        payerId,
        payeeId,
        groupId: selectedGroupId,
        amountCents: totalCents,
      });

      messageApi.success(
        `Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`,
      );
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
        messageApi.success(
          `Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`,
        );
        window.dispatchEvent(new Event("expenseAdded"));
        if (!skipClose) {
          onClose();
        }
      } catch (error: any) {
        messageApi.error(error.message || "Failed to record settlement");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpiClick = async () => {
    if (!upiIntent) return;
    
    if (user) {
      try {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          group_id: selectedGroupId || null,
          action_type: "UPI_REDIRECT_INITIATED",
          metadata: {
            upi_url: upiIntent,
            payee_id: selectedPayeeObj?.id,
            amount_cents: totalCents
          },
        });
      } catch (error) {
        console.error("Failed to log UPI redirect activity:", error);
      }
    }
    
    window.location.href = upiIntent;
    messageApi.info(
      'Opening UPI App. Please complete the payment there, then return here and click "Save Payment" to record it.',
      5,
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
              className="w-full"
              style={{ width: '100%' }}
              options={[
                {
                  label: `${currentUser?.full_name ?? (DEMO_MODE ? MOCK_CURRENT_USER.full_name : "You")} (You)`,
                  value: userId,
                },
              ]}
            />
          </Form.Item>

          <Form.Item label="Payee (Who received the money?)" className="mb-3">
            <Select
              placeholder="Select recipient"
              value={payeeId}
              onChange={(val) => setPayeeId(val)}
              className="w-full"
              style={{ width: '100%' }}
              options={[
                ...availablePayees.map((p: Profile) => ({
                  label: p.full_name,
                  value: p.id,
                })),
                ...(payeeId &&
                !availablePayees.some((p) => p.id === payeeId) &&
                defaultPayeeName
                  ? [{ label: defaultPayeeName, value: payeeId }]
                  : []),
              ]}
            />
          </Form.Item>

          <Form.Item label="Group (Optional)" className="mb-3">
            <Select
              placeholder="None (Direct 1-on-1 settlement)"
              allowClear
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              className="w-full"
              style={{ width: '100%' }}
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
              style={{ width: '100%' }}
              value={amountValue}
              onChange={(val) => setAmountValue(val)}
            />
          </Form.Item>

          {totalCents > 0 && (
            <div
              className={`rounded-lg p-3 text-sm border ${
                maxAmountCents !== undefined && totalCents > maxAmountCents
                  ? "bg-error-bg border-error-border text-error-text"
                  : maxAmountCents !== undefined && totalCents < maxAmountCents
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                    : "bg-primary-500/10 border-primary-500/20 text-primary-500"
              }`}
            >
              {maxAmountCents !== undefined && totalCents > maxAmountCents ? (
                <>
                  ⚠️ Cannot settle more than you owe (
                  {formatCents(maxAmountCents)})
                </>
              ) : maxAmountCents !== undefined &&
                totalCents < maxAmountCents ? (
                <>
                  ✨ Recording partial payment. Remaining balance:{" "}
                  <Text strong className="text-orange-500">
                    {formatCents(maxAmountCents - totalCents)}
                  </Text>
                </>
              ) : (
                <>
                  ✨ Recording payment:{" "}
                  <Text
                    strong
                    className={
                      maxAmountCents !== undefined ? "text-primary-500" : "text-primary-500"
                    }
                  >
                    {formatCents(totalCents)}
                  </Text>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border-base mt-6">
            <Button
              onClick={onClose}
              disabled={isSubmitting}
              size="large"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {upiIntent && (
              <Button
                type="primary"
                onClick={handleUpiClick}
                loading={isSubmitting}
                disabled={
                  isSubmitting ||
                  (maxAmountCents !== undefined && totalCents > maxAmountCents)
                }
                size="large"
                className="w-full sm:w-auto bg-[#1ea142] hover:bg-[#158032] font-semibold rounded-xl text-white border-none shadow-md"
              >
                Pay via UPI App
              </Button>
            )}
            <Button
              type="primary"
              onClick={() => handleSave()}
              loading={isSubmitting}
              disabled={
                isSubmitting ||
                (maxAmountCents !== undefined && totalCents > maxAmountCents)
              }
              size="large"
              className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 font-semibold rounded-xl text-white border-none shadow-md"
            >
              Save Payment
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
