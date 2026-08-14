-- Table 1: personal_budgets
CREATE TABLE IF NOT EXISTS public.personal_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month_year TEXT NOT NULL, -- Format: "YYYY-MM" (e.g., "2026-08")
    budget_amount BIGINT NULL, -- Stored in cents/paisa
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, month_year)
);

-- Table 2: personal_transactions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.personal_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL, -- Stored in cents/paisa
    category TEXT NOT NULL, -- 'Food', 'Salary', 'Rent', 'Bills', 'Transport', 'Other'
    description TEXT DEFAULT '',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.personal_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'personal_budgets' AND policyname = 'Users can manage their own personal budgets'
    ) THEN
        CREATE POLICY "Users can manage their own personal budgets" 
            ON public.personal_budgets FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'personal_transactions' AND policyname = 'Users can manage their own personal transactions'
    ) THEN
        CREATE POLICY "Users can manage their own personal transactions" 
            ON public.personal_transactions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
