import { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Button,
  message,
  Typography,
} from "antd";
import { QrCode } from "lucide-react";
import { MOCK_CURRENT_USER, MOCK_PROFILES, MOCK_EXPENSES, MOCK_SETTLEMENTS } from "../lib/mockData";
import {
  formatCents,
  getStoredCurrency,
} from "../utils/currency";
import { generateUpiUri } from "../utils/upi";
import type { Profile } from "../types";
import { useAppData, DEMO_MODE } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../hooks/supabase/useProfileData";
import { useAllExpenses } from "../hooks/supabase/useExpensesData";
import { useAllSettlements } from "../hooks/supabase/useSettlementsData";
import { createSettlementsBatch, type SettlementBatchItem } from "../hooks/supabase/useMutations";
import { DebtSimplifier } from "../core/domain/DebtSimplifier";
import { supabase } from "../lib/supabase";
import { HeroAmountInput } from "./ui/HeroAmountInput";
import { PaymentQrModal } from "./PaymentQrModal";

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
  const { currentUser, groups } = useAppData();
  const userId = user?.id || currentUser?.id || (DEMO_MODE ? MOCK_CURRENT_USER.id : "");

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
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const { data: liveFriends } = useFriends(user?.id);
  const { data: liveExpenses } = useAllExpenses(user?.id);
  const { data: liveSettlements } = useAllSettlements(user?.id);

  // Compute all open group debts (both directions) in shared groups between payerId and payeeId
  // Only computes when modal is open to avoid stealing CPU on initial page load
  const allGroupDebts = useMemo(() => {
    if (!open || !payerId || !payeeId || payerId === payeeId) return [];

    const expenses = DEMO_MODE ? (MOCK_EXPENSES as any) : liveExpenses || [];
    const settlements = DEMO_MODE ? (MOCK_SETTLEMENTS as any) : liveSettlements || [];

    // Pre-bucket expenses and settlements by group_id in a single O(E + S) pass
    const expensesByGroup = new Map<string, any[]>();
    for (const e of expenses) {
      if (!e.group_id) continue;
      let list = expensesByGroup.get(e.group_id);
      if (!list) {
        list = [];
        expensesByGroup.set(e.group_id, list);
      }
      list.push(e);
    }

    const settlementsByGroup = new Map<string, any[]>();
    for (const s of settlements) {
      if (!s.group_id) continue;
      let list = settlementsByGroup.get(s.group_id);
      if (!list) {
        list = [];
        settlementsByGroup.set(s.group_id, list);
      }
      list.push(s);
    }

    const results: GroupDebtDetail[] = [];

    groups.forEach((g) => {
      const gExp = expensesByGroup.get(g.id) || [];
      const gSett = settlementsByGroup.get(g.id) || [];
      if (gExp.length === 0 && gSett.length === 0) return;

      // Skip groups if neither payerId nor payeeId participated
      const isPayerInvolved =
        gExp.some((e: any) => e.payer_id === payerId || e.splits?.some((sp: any) => sp.user_id === payerId)) ||
        gSett.some((s: any) => s.payer_id === payerId || s.payee_id === payerId);
      const isPayeeInvolved =
        gExp.some((e: any) => e.payer_id === payeeId || e.splits?.some((sp: any) => sp.user_id === payeeId)) ||
        gSett.some((s: any) => s.payer_id === payeeId || s.payee_id === payeeId);

      if (!isPayerInvolved || !isPayeeInvolved) return;

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
  }, [open, payerId, payeeId, groups, liveExpenses, liveSettlements]);

  // Stable key preventing infinite or cascading render loops from array pointer recreation
  const debtGroupSummaryKey = useMemo(() => {
    return allGroupDebts.map((d) => `${d.group.id}:${d.debtorId}:${d.amountCents}`).join('|');
  }, [allGroupDebts]);

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
  }, [open, userId, defaultPayeeId, defaultGroupId, defaultAmountCents, debtGroupSummaryKey]);

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
    if (!selectedPayeeObj?.upi_id || !totalCents || totalCents <= 0) return null;

    const groupName = selectedGroupId && selectedGroupId !== "DIRECT" && selectedGroupId !== "AUTO_ALL"
      ? groups.find((g) => g.id === selectedGroupId)?.name
      : undefined;

    return generateUpiUri({
      vpa: selectedPayeeObj.upi_id,
      payeeName: selectedPayeeObj.full_name,
      amountCents: totalCents,
      note: groupName ? `Split ${groupName}` : "Settlement",
      currency: getStoredCurrency(),
    });
  }, [selectedPayeeObj, totalCents, selectedGroupId, groups]);

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

    const payerName = payerId === userId ? (currentUser?.full_name ?? payer) : payer;
    const itemsToInsert: SettlementBatchItem[] = [];

    try {
      if (selectedGroupId === "AUTO_ALL" && allGroupDebts.length > 0) {
        let remainingCents = totalCents;

        // Step 1: Clear Reciprocal Debts
        // For any group where the Payee owes the Payer, we automatically insert a reciprocal
        // settlement. This effectively increases the Payer's "purchasing power" to clear
        // the debts where they owe the Payee, ensuring True Cross-Group Clearing.
        for (const item of allGroupDebts) {
          if (item.debtorId === payeeId && item.creditorId === payerId) {
            itemsToInsert.push({
              payer_id: payeeId,
              payee_id: payerId,
              group_id: item.group.id,
              amount: item.amountCents,
              currency_code: getStoredCurrency(),
              payer_name: payee,
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
            itemsToInsert.push({
              payer_id: item.debtorId,
              payee_id: item.creditorId,
              group_id: item.group.id,
              amount: amountToSettle,
              currency_code: getStoredCurrency(),
              payer_name: payerName,
            });
            remainingCents -= amountToSettle;
          }
        }

        // Step 3: Handle Overpayment or Non-Group Debts
        if (remainingCents > 0) {
          itemsToInsert.push({
            payer_id: payerId,
            payee_id: payeeId,
            group_id: null,
            amount: remainingCents,
            currency_code: getStoredCurrency(),
            payer_name: payerName,
          });
        }
      } else {
        const targetGId =
          selectedGroupId && selectedGroupId !== "DIRECT" && selectedGroupId !== "AUTO_ALL"
            ? selectedGroupId
            : null;

        itemsToInsert.push({
          payer_id: payerId,
          payee_id: payeeId,
          group_id: targetGId,
          amount: totalCents,
          currency_code: getStoredCurrency(),
          payer_name: payerName,
        });
      }

      await createSettlementsBatch(itemsToInsert);

      messageApi.success(
        `Recorded payment of ${formatCents(totalCents)} from ${payer} to ${payee}`,
      );
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

  const handleUpiClick = () => {
    if (!upiIntent) return;

    if (user) {
      void (async () => {
        try {
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            group_id:
              selectedGroupId === "AUTO_ALL" || selectedGroupId === "DIRECT"
                ? null
                : selectedGroupId || null,
            action_type: "UPI_REDIRECT_INITIATED",
            metadata: {
              upi_url: upiIntent,
              payee_id: selectedPayeeObj?.id,
              amount_cents: totalCents,
            },
          });
        } catch (error: unknown) {
          console.error("Failed to log UPI redirect activity:", error);
        }
      })();
    }

    setQrModalOpen(true);
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

          <div className="mb-3">
            <HeroAmountInput
              value={amountValue}
              onChange={(val) => setAmountValue(val)}
              label="SETTLEMENT AMOUNT"
              badgeVariant="success"
              placeholder="0.00"
            />
          </div>

          {totalCents > 0 && (
            <div
              className={`rounded-lg p-3 text-sm border ${
                maxAmountCents !== undefined && totalCents > maxAmountCents
                  ? "bg-error-bg border-error-border text-error-text"
                  : maxAmountCents !== undefined && totalCents < maxAmountCents
                    ? "bg-warning-bg border-warning-border text-warning-500"
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
                  <Text strong className="text-warning-500">
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
                onClick={handleUpiClick}
                disabled={
                  isSubmitting ||
                  (maxAmountCents !== undefined && totalCents > maxAmountCents)
                }
                size="large"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 font-medium rounded-xl border-border-subtle hover:border-primary-500 text-text-main"
                icon={<QrCode className="w-4 h-4 text-primary-500" />}
              >
                Pay via UPI / QR
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

      <PaymentQrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        upiUri={upiIntent}
        vpa={selectedPayeeObj?.upi_id || ""}
        payeeName={selectedPayeeObj?.full_name || defaultPayeeName || "Friend"}
        amountCents={totalCents}
      />
    </>
  );
}
