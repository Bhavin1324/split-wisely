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
import { MOCK_CURRENT_USER, MOCK_PROFILES, MOCK_EXPENSES, MOCK_SETTLEMENTS } from "../lib/mockData";
import {
  formatCents,
  getStoredCurrency,
  getCurrencySymbol,
} from "../utils/currency";
import type { Profile } from "../types";
import { useAppData, DEMO_MODE } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../hooks/supabase/useProfileData";
import { useAllExpenses } from "../hooks/supabase/useExpensesData";
import { useAllSettlements } from "../hooks/supabase/useSettlementsData";
import { createSettlement } from "../hooks/supabase/useMutations";
import { DebtSimplifier } from "../core/domain/DebtSimplifier";
import { supabase } from "../lib/supabase";

const { Text } = Typography;

interface SettleUpModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
  defaultPayeeId?: string;
  defaultPayeeName?: string;
  defaultGroupId?: string;
  defaultAmountCents?: number;
  maxAmountCents?: number;
}

interface GroupDebtDetail {
  group: any;
  debtorId: string;
  creditorId: string;
  amountCents: number;
}

export function SettleUpModal({
  open,
  onClose,
  onSuccess,
  defaultPayeeId,
  defaultPayeeName,
  defaultGroupId,
  defaultAmountCents,
  maxAmountCents,
}: SettleUpModalProps) {
  const { user } = useAuth();
  const { currentUser, groups, refetchData } = useAppData();
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

  const { data: liveFriends } = useFriends(user?.id);
  const { data: liveExpenses } = useAllExpenses(user?.id);
  const { data: liveSettlements } = useAllSettlements(user?.id);

  // Compute all open group debts (both directions) in shared groups between payerId and payeeId
  const allGroupDebts = useMemo(() => {
    if (!payerId || !payeeId || payerId === payeeId) return [];

    const expenses = DEMO_MODE ? (MOCK_EXPENSES as any) : liveExpenses || [];
    const settlements = DEMO_MODE ? (MOCK_SETTLEMENTS as any) : liveSettlements || [];

    const results: GroupDebtDetail[] = [];

    groups.forEach((g) => {
      const gExp = expenses.filter((e: any) => e.group_id === g.id);
      const gSett = settlements.filter((s: any) => s.group_id === g.id);
      const pairwiseDebts = DebtSimplifier.calculateIndividualDebts(gExp, gSett, []);

      const debtPayerToPayee = pairwiseDebts.find(
        (d: any) => d.from === payerId && d.to === payeeId,
      );
      const debtPayeeToPayer = pairwiseDebts.find(
        (d: any) => d.from === payeeId && d.to === payerId,
      );

      if (debtPayerToPayee && debtPayerToPayee.amount > 0) {
        results.push({
          group: g,
          debtorId: payerId,
          creditorId: payeeId,
          amountCents: debtPayerToPayee.amount,
        });
      }
      if (debtPayeeToPayer && debtPayeeToPayer.amount > 0) {
        results.push({
          group: g,
          debtorId: payeeId,
          creditorId: payerId,
          amountCents: debtPayeeToPayer.amount,
        });
      }
    });

    return results;
  }, [payerId, payeeId, groups, liveExpenses, liveSettlements]);

  useEffect(() => {
    if (open) {
      if (userId) setPayerId(userId);
      setPayeeId(defaultPayeeId);
      setAmountValue(defaultAmountCents ? defaultAmountCents / 100 : null);

      if (defaultGroupId) {
        setSelectedGroupId(defaultGroupId);
      } else if (allGroupDebts.length > 1) {
        setSelectedGroupId("AUTO_ALL");
      } else if (allGroupDebts.length === 1) {
        setSelectedGroupId(allGroupDebts[0].group.id);
      } else {
        setSelectedGroupId(undefined);
      }
    }
  }, [open, userId, defaultPayeeId, defaultGroupId, defaultAmountCents, allGroupDebts]);

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

    const formattedAmount = amountValue.toFixed(2);
    const upiId = selectedPayeeObj.upi_id.trim();
    const payeeName = selectedPayeeObj.full_name.replace(/\s+/g, '');
    const note = "Settlement"; 
    const merchantCategoryCode = "0000";
    const initiationMode = "04";
    const selectedCurrency = getStoredCurrency();
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
    if (isSubmitting) return;

    if (!payeeId) {
      messageApi.error("Please select a person to settle with.");
      return;
    }
    if (payerId === payeeId) {
      messageApi.error("Payer and recipient cannot be the same person.");
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

    setIsSubmitting(true);

    const payer = DEMO_MODE
      ? (MOCK_PROFILES.find((p) => p.id === payerId)?.full_name ?? payerId)
      : payerId === userId
        ? (currentUser?.full_name ?? payerId)
        : payerId;

    const payee = DEMO_MODE
      ? (MOCK_PROFILES.find((p) => p.id === payeeId)?.full_name ?? payeeId)
      : (availablePayees.find((p) => p.id === payeeId)?.full_name ?? payeeId);

    const recordSingleSettlement = async (params: {
      payer_id: string;
      payee_id: string;
      group_id: string | null;
      amount: number;
      currency_code: string;
    }) => {
      if (DEMO_MODE) {
        MOCK_SETTLEMENTS.push({
          id: uuidv4(),
          group_id: params.group_id,
          payer_id: params.payer_id,
          payee_id: params.payee_id,
          amount: params.amount,
          currency_code: params.currency_code,
          created_at: new Date().toISOString(),
        });
      } else {
        await createSettlement(params);
      }
    };

    try {
      if (selectedGroupId === "AUTO_ALL" && allGroupDebts.length > 0) {
        let remainingCents = totalCents;
        
        // Step 1: Clear Reciprocal Debts
        // For any group where the Payee owes the Payer, we automatically insert a reciprocal
        // settlement. This effectively increases the Payer's "purchasing power" to clear
        // the debts where they owe the Payee, ensuring True Cross-Group Clearing.
        for (const item of allGroupDebts) {
          if (item.debtorId === payeeId && item.creditorId === payerId) {
            await recordSingleSettlement({
              payer_id: payeeId,
              payee_id: payerId,
              group_id: item.group.id,
              amount: item.amountCents,
              currency_code: getStoredCurrency(),
            });
            remainingCents += item.amountCents;
          }
        }

        // Step 2: Clear Payer Debts
        // Now use the combined pool (physical cash + reciprocal credits) to pay off
        // the groups where the Payer owes the Payee.
        for (const item of allGroupDebts) {
          if (remainingCents <= 0) break;
          
          if (item.debtorId === payerId && item.creditorId === payeeId) {
            const amountToSettle = Math.min(item.amountCents, remainingCents);
            await recordSingleSettlement({
              payer_id: item.debtorId,
              payee_id: item.creditorId,
              group_id: item.group.id,
              amount: amountToSettle,
              currency_code: getStoredCurrency(),
            });
            remainingCents -= amountToSettle;
          }
        }
        
        // Step 3: Handle Overpayment or Non-Group Debts
        if (remainingCents > 0) {
          await recordSingleSettlement({
            payer_id: payerId,
            payee_id: payeeId,
            group_id: null,
            amount: remainingCents,
            currency_code: getStoredCurrency(),
          });
        }
      } else {
        const targetGId = selectedGroupId && selectedGroupId !== "DIRECT" && selectedGroupId !== "AUTO_ALL"
          ? selectedGroupId
          : null;

        await recordSingleSettlement({
          payer_id: payerId,
          payee_id: payeeId,
          group_id: targetGId,
          amount: totalCents,
          currency_code: getStoredCurrency(),
        });
      }

      messageApi.success(
        `Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`,
      );
      await refetchData();
      if (onSuccess) {
        await onSuccess();
      }
      if (!skipClose) {
        onClose();
      }
    } catch (error: any) {
      messageApi.error(error.message || "Failed to record settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpiClick = async () => {
    if (!upiIntent) return;
    
    if (user) {
      try {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          group_id: selectedGroupId === "AUTO_ALL" || selectedGroupId === "DIRECT" ? null : selectedGroupId || null,
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

          <Form.Item label="Apply Settlement To" className="mb-2">
            <Select
              placeholder="Select group or direct payment"
              allowClear
              value={selectedGroupId}
              onChange={(val) => setSelectedGroupId(val)}
              className="w-full"
              style={{ width: '100%' }}
              options={[
                ...(allGroupDebts.length > 1
                  ? [
                      {
                        label: "✨ True Cross-Group Clearing (Clears All Shared Groups)",
                        value: "AUTO_ALL",
                      },
                    ]
                  : []),
                ...groups.map((g) => {
                  const debtItem = allGroupDebts.find((item) => item.group.id === g.id);
                  let debtLabel = "";
                  if (debtItem) {
                    debtLabel = debtItem.debtorId === payerId
                      ? ` (${formatCents(debtItem.amountCents)} Owed)`
                      : ` (${formatCents(debtItem.amountCents)} Owed to Friend)`;
                  }
                  return {
                    label: `${g.name}${debtLabel}`,
                    value: g.id,
                  };
                }),
                {
                  label: "Direct Payment (Outside any group)",
                  value: "DIRECT",
                },
              ]}
            />
          </Form.Item>

          <div className="text-xs text-text-muted bg-bg-subtle p-2.5 rounded-lg border border-border-base mb-3">
            {selectedGroupId === "AUTO_ALL" ? (
              <span className="text-primary-500 font-medium">
                ✨ <strong>True Cross-Group Clearing:</strong> Automatically creates group-linked settlements across all open groups to bring <strong>every group ledger to ₹0.00</strong>.
              </span>
            ) : selectedGroupId && selectedGroupId !== "DIRECT" ? (
              <span className="text-primary-500 font-medium">
                📌 <strong>Group Settlement:</strong> This payment will be recorded directly in the <strong>{groups.find((g) => g.id === selectedGroupId)?.name}</strong> ledger.
              </span>
            ) : (
              <span>
                🌐 <strong>Direct 1-on-1 Settlement:</strong> Applies to your overall balance with {selectedPayeeObj?.full_name ?? defaultPayeeName ?? "this friend"} (outside a specific group ledger).
              </span>
            )}
          </div>

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

          {!selectedGroupId && totalCents > 0 && (
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-xs text-primary-500 flex items-start gap-2.5 mt-3">
              <span className="text-base shrink-0">ℹ️</span>
              <div>
                <strong>Direct Settlement Notice:</strong> This payment of{" "}
                <strong className="underline">{formatCents(totalCents)}</strong> will be recorded directly between you and{" "}
                <strong>{selectedPayeeObj?.full_name ?? defaultPayeeName ?? "this friend"}</strong>. It will update your global friend balance but will not alter individual group ledgers.
              </div>
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
