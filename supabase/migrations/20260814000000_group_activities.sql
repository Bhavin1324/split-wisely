-- ============================================================================
-- Migration: Group Activities & Append-Only Audit Trail
-- ============================================================================

-- 1. Action Type Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_action_type') THEN
        CREATE TYPE activity_action_type AS ENUM (
            'EXPENSE_CREATED',
            'EXPENSE_UPDATED',
            'EXPENSE_DELETED',
            'SETTLEMENT_RECORDED',
            'MEMBER_ADDED',
            'MEMBER_REMOVED',
            'GROUP_UPDATED'
        );
    END IF;
END $$;

-- 2. Group Activities Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.group_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type activity_action_type NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Indexes for fast chronological lookups
CREATE INDEX IF NOT EXISTS idx_group_activities_group_date 
    ON public.group_activities(group_id, created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.group_activities ENABLE ROW LEVEL SECURITY;

-- 5. Strict Read-Only / Append-Only Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_activities' AND policyname = 'Group members can view group activity'
    ) THEN
        CREATE POLICY "Group members can view group activity"
            ON public.group_activities
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.group_members gm 
                    WHERE gm.group_id = public.group_activities.group_id 
                      AND gm.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_activities' AND policyname = 'Authenticated users can insert activity'
    ) THEN
        CREATE POLICY "Authenticated users can insert activity"
            ON public.group_activities
            FOR INSERT
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_activities' AND policyname = 'Strictly prohibit updates to activity logs'
    ) THEN
        CREATE POLICY "Strictly prohibit updates to activity logs"
            ON public.group_activities
            FOR UPDATE
            USING (false);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_activities' AND policyname = 'Strictly prohibit deletes to activity logs'
    ) THEN
        CREATE POLICY "Strictly prohibit deletes to activity logs"
            ON public.group_activities
            FOR DELETE
            USING (false);
    END IF;
END $$;

-- 6. Trigger Functions for Automatic Activity Logging

-- Expense Activity Trigger
CREATE OR REPLACE FUNCTION public.log_expense_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_name TEXT;
    v_group_id UUID;
BEGIN
    v_group_id := COALESCE(NEW.group_id, OLD.group_id);
    IF v_group_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.created_by;
        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            NEW.group_id,
            NEW.created_by,
            'EXPENSE_CREATED',
            COALESCE(v_actor_name, 'A member') || ' added expense "' || NEW.description || '"',
            jsonb_build_object(
                'expense_id', NEW.id,
                'amount', NEW.total_amount,
                'description', NEW.description,
                'payer_id', NEW.payer_id
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            NEW.group_id,
            auth.uid(),
            'EXPENSE_UPDATED',
            COALESCE(v_actor_name, 'A member') || ' updated expense "' || NEW.description || '"',
            jsonb_build_object(
                'expense_id', NEW.id,
                'amount', NEW.total_amount,
                'description', NEW.description,
                'payer_id', NEW.payer_id
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            OLD.group_id,
            auth.uid(),
            'EXPENSE_DELETED',
            COALESCE(v_actor_name, 'A member') || ' deleted expense "' || OLD.description || '"',
            jsonb_build_object(
                'expense_id', OLD.id,
                'amount', OLD.total_amount,
                'description', OLD.description
            ),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_expense_activity ON public.expenses;
CREATE TRIGGER tr_log_expense_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.log_expense_activity();

-- Settlement Activity Trigger
CREATE OR REPLACE FUNCTION public.log_settlement_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_payer_name TEXT;
    v_payee_name TEXT;
BEGIN
    IF NEW.group_id IS NOT NULL THEN
        SELECT full_name INTO v_payer_name FROM public.profiles WHERE id = NEW.payer_id;
        SELECT full_name INTO v_payee_name FROM public.profiles WHERE id = NEW.payee_id;

        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            NEW.group_id,
            NEW.payer_id,
            'SETTLEMENT_RECORDED',
            COALESCE(v_payer_name, 'Someone') || ' paid ' || COALESCE(v_payee_name, 'someone'),
            jsonb_build_object(
                'settlement_id', NEW.id,
                'amount', NEW.amount,
                'payer_id', NEW.payer_id,
                'payee_id', NEW.payee_id,
                'payer_name', v_payer_name,
                'payee_name', v_payee_name
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_settlement_activity ON public.settlements;
CREATE TRIGGER tr_log_settlement_activity
    AFTER INSERT ON public.settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.log_settlement_activity();

-- Group Member Activity Trigger
CREATE OR REPLACE FUNCTION public.log_group_member_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_actor_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            NEW.group_id,
            NEW.user_id,
            'MEMBER_ADDED',
            COALESCE(v_user_name, 'A new member') || ' joined the group',
            jsonb_build_object('user_id', NEW.user_id, 'user_name', v_user_name),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = OLD.user_id;
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
        INSERT INTO public.group_activities (group_id, actor_id, action_type, description, metadata, created_at)
        VALUES (
            OLD.group_id,
            auth.uid(),
            'MEMBER_REMOVED',
            COALESCE(v_user_name, 'A member') || ' was removed from the group',
            jsonb_build_object('user_id', OLD.user_id, 'user_name', v_user_name),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_group_member_activity ON public.group_members;
CREATE TRIGGER tr_log_group_member_activity
    AFTER INSERT OR DELETE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.log_group_member_activity();

-- Enable Realtime for group_activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_activities;
