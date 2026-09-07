export type StagedExpenseStatus = 'PENDING' | 'APPROVED_PERSONAL' | 'APPROVED_GROUP' | 'DISMISSED';

export interface StagedExpense {
  id: string;
  user_id: string;
  amount_cents: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  merchant_name: string;
  bank_short_code: string | null;
  account_last4: string | null;
  upi_ref: string | null;
  raw_sms_hash: string;
  status: StagedExpenseStatus;
  created_at: string;
  transaction_date: string;
}
