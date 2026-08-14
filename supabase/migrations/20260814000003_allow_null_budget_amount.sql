-- ============================================================================
-- Migration: Allow NULL budget_amount in personal_budgets
-- ============================================================================

-- 1. Drop NOT NULL constraint on budget_amount in personal_budgets
ALTER TABLE public.personal_budgets 
ALTER COLUMN budget_amount DROP NOT NULL;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
