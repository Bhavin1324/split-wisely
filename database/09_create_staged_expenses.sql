-- ============================================================================
-- Centfolio Module: SMS Sync Companion Staged Expenses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staged_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents BIGINT NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('DEBIT', 'CREDIT')) NOT NULL,
  merchant_name TEXT NOT NULL,
  bank_short_code TEXT,
  account_last4 TEXT,
  upi_ref TEXT,
  raw_sms_hash TEXT NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'APPROVED_PERSONAL', 'APPROVED_GROUP', 'DISMISSED')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now(),
  transaction_date TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, raw_sms_hash)
);

-- Enable RLS
ALTER TABLE public.staged_expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert, select, update, and delete their own staged records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staged_expenses' AND policyname = 'Users can manage own staged expenses'
  ) THEN
    CREATE POLICY "Users can manage own staged expenses"
      ON public.staged_expenses FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
