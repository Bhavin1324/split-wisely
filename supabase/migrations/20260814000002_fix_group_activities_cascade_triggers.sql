-- ============================================================================
-- Migration: Fix Group Activities Cascade Deletion Triggers (Prevent Error 23503)
-- ============================================================================

-- 1. Guard Expense Activity Logging Trigger Function
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
        IF EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id) THEN
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
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id) THEN
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
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- CRITICAL: Only log if the parent group still exists (not undergoing cascade delete)
        IF EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
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
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Guard Group Member Activity Logging Trigger Function
CREATE OR REPLACE FUNCTION public.log_group_member_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_actor_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id) THEN
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
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- CRITICAL: Only log if the parent group still exists (not undergoing cascade delete)
        IF EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
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
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Guard Settlement Activity Logging Trigger Function
CREATE OR REPLACE FUNCTION public.log_settlement_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_payer_name TEXT;
    v_payee_name TEXT;
BEGIN
    IF NEW.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups WHERE id = NEW.group_id) THEN
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
