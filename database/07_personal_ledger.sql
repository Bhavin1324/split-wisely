-- ============================================================================
-- Centfolio Module: Personal Expense & Simple Accounting Ledger
-- ============================================================================

-- 1. PERSONAL BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.personal_budgets (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- Format: "YYYY-MM" (e.g. "2026-08")
  budget_amount BIGINT NOT NULL,   -- Stored in cents/paisa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_month_budget UNIQUE (user_id, month_year)
);

ALTER TABLE public.personal_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own personal budgets" ON public.personal_budgets;
CREATE POLICY "Users manage own personal budgets" 
  ON public.personal_budgets FOR ALL 
  USING (true);

-- 2. PERSONAL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.personal_transactions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount BIGINT NOT NULL,          -- Stored in cents/paisa
  category VARCHAR(50) NOT NULL,   -- e.g. 'Food', 'Salary', 'Rent', 'Bills', 'Transport', 'Shopping', 'Entertainment', 'Other'
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own personal transactions" ON public.personal_transactions;
CREATE POLICY "Users manage own personal transactions" 
  ON public.personal_transactions FOR ALL 
  USING (true);
