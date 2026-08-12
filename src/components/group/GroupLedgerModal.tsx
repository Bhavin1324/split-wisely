import { useState } from "react";
import { Modal, Button, Avatar, Tooltip } from "antd";
import { Calculator, ChevronDown, Info } from "lucide-react";
import { formatCents } from "../../utils/currency";

const UserLedgerCard = ({ l, userId }: { l: any; userId: string }) => {
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
  const [isPaymentsExpanded, setIsPaymentsExpanded] = useState(false);

  return (
    <div className="bg-bg-base rounded-xl p-4 border border-border-base shadow-sm">
      {/* Header: Avatar, Name, Final Balance */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-base/50">
        <div className="flex items-center gap-3">
          <Avatar size="small" className="bg-primary-500/20 text-primary-500 font-bold border border-primary-500/20">
            {l.avatarChar}
          </Avatar>
          <span className="font-semibold text-text-base">
            {l.userId === userId ? `${l.name} (You)` : l.name}
          </span>
        </div>
        <div
          className={`font-financial font-bold text-lg ${l.netBalance > 0 ? "text-success-text" : l.netBalance < 0 ? "text-error-text" : "text-text-muted"}`}
        >
          {l.netBalance > 0 ? "+" : ""}
          {formatCents(l.netBalance)}
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1: Net Expenses */}
        <div className="bg-bg-surface rounded-lg border border-border-base overflow-hidden transition-colors">
          <div 
            onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm p-2.5 cursor-pointer hover:bg-bg-subtle/50"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpensesExpanded ? "rotate-180" : ""}`} />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-base">Net Expenses</span>
                <Tooltip title="Total Paid minus Their Share (Consumed)">
                  <Info className="w-3.5 h-3.5 text-text-muted opacity-70 hover:opacity-100" onClick={e => e.stopPropagation()} />
                </Tooltip>
              </div>
            </div>
            <div className="font-financial font-medium text-text-muted ml-6 sm:ml-0">
              {formatCents(l.expensesPaid)} - {formatCents(l.expenseShare)} = <strong className={l.expensesPaid - l.expenseShare > 0 ? "text-success-text" : l.expensesPaid - l.expenseShare < 0 ? "text-error-text" : "text-text-base"}>{formatCents(l.expensesPaid - l.expenseShare)}</strong>
            </div>
          </div>
          
          {/* Expanded Expenses Itemized Breakdown */}
          {isExpensesExpanded && (
            <div className="p-3 pt-4 border-t border-border-base/50 bg-bg-subtle/30 space-y-4">
              {/* Paid List */}
              {l.expensesPaidList?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex justify-between">
                    <span>Expenses Paid</span>
                    <span>{formatCents(l.expensesPaid)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {l.expensesPaidList.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-text-base truncate mr-2">{item.description}</span>
                        <span className="text-success-text font-financial font-medium shrink-0">+{formatCents(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Share (Consumed) List */}
              {l.expenseShareList?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex justify-between">
                    <span>Their Share (Consumed)</span>
                    <span>{formatCents(l.expenseShare)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {l.expenseShareList.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-text-base truncate mr-2">{item.description}</span>
                        <span className="text-error-text font-financial font-medium shrink-0">-{formatCents(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {l.expensesPaidList?.length === 0 && l.expenseShareList?.length === 0 && (
                <div className="text-xs text-text-muted italic text-center py-2">No expenses recorded</div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Net Payments */}
        <div className="bg-bg-surface rounded-lg border border-border-base overflow-hidden transition-colors">
          <div 
            onClick={() => setIsPaymentsExpanded(!isPaymentsExpanded)}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm p-2.5 cursor-pointer hover:bg-bg-subtle/50"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isPaymentsExpanded ? "rotate-180" : ""}`} />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-base">Net Payments</span>
                <Tooltip title="Payments Sent minus Payments Received">
                  <Info className="w-3.5 h-3.5 text-text-muted opacity-70 hover:opacity-100" onClick={e => e.stopPropagation()} />
                </Tooltip>
              </div>
            </div>
            <div className="font-financial font-medium text-text-muted ml-6 sm:ml-0">
              {formatCents(l.paymentsSent)} - {formatCents(l.paymentsReceived)} = <strong className={l.paymentsSent - l.paymentsReceived > 0 ? "text-success-text" : l.paymentsSent - l.paymentsReceived < 0 ? "text-error-text" : "text-text-base"}>{formatCents(l.paymentsSent - l.paymentsReceived)}</strong>
            </div>
          </div>

          {/* Expanded Payments Itemized Breakdown */}
          {isPaymentsExpanded && (
            <div className="p-3 pt-4 border-t border-border-base/50 bg-bg-subtle/30 space-y-4">
              {/* Sent List */}
              {l.paymentsSentList?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex justify-between">
                    <span>Payments Sent</span>
                    <span>{formatCents(l.paymentsSent)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {l.paymentsSentList.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-text-base truncate mr-2">{item.description}</span>
                        <span className="text-success-text font-financial font-medium shrink-0">+{formatCents(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Received List */}
              {l.paymentsReceivedList?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex justify-between">
                    <span>Payments Received</span>
                    <span>{formatCents(l.paymentsReceived)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {l.paymentsReceivedList.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-text-base truncate mr-2">{item.description}</span>
                        <span className="text-error-text font-financial font-medium shrink-0">-{formatCents(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {l.paymentsSentList?.length === 0 && l.paymentsReceivedList?.length === 0 && (
                <div className="text-xs text-text-muted italic text-center py-2">No payments recorded</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function GroupLedgerModal({
  isOpen,
  onClose,
  memberLedgers,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  memberLedgers: any[];
  userId: string;
}) {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary-500" />
          <span>Calculation Breakdown</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <div className="my-4 space-y-4">
        <p className="text-sm text-text-muted">
          This breakdown fully explains your current balance by separating
          your group expenses from the payments you've sent and received.
        </p>
        <div className="space-y-3 mt-4 max-h-[85vh] overflow-y-auto pr-2">
          {memberLedgers.map((l) => (
            <UserLedgerCard key={l.userId} l={l} userId={userId} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
