-- ============================================================================
-- Centfolio: Email Notification Trigger Functions
-- Run these in your Supabase SQL Editor after schema.sql
-- ============================================================================
-- These triggers fire when expenses or settlements are inserted,
-- and can be wired up to Supabase Edge Functions or webhook
-- integrations (Resend, SendGrid, etc.) for real SMTP delivery.
-- ============================================================================

-- 1. Trigger function: log expense notification events
-- This creates entries in a notifications queue table that an Edge Function polls
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'expense_added', 'settlement_recorded', 'group_invitation'
  subject TEXT NOT NULL,
  body_json JSONB NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own notifications" ON email_notifications;
CREATE POLICY "Read own notifications" ON email_notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insert notifications" ON email_notifications;
CREATE POLICY "Insert notifications" ON email_notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update notifications" ON email_notifications;
CREATE POLICY "Update notifications" ON email_notifications FOR UPDATE USING (true);

-- 2. Trigger: When an expense is created, notify all group members
CREATE OR REPLACE FUNCTION notify_expense_added()
RETURNS TRIGGER AS $$
DECLARE
  v_member RECORD;
  v_group_name TEXT;
  v_payer_name TEXT;
BEGIN
  -- Get group name
  SELECT name INTO v_group_name FROM groups WHERE id = NEW.group_id;
  -- Get payer name
  SELECT full_name INTO v_payer_name FROM profiles WHERE id = NEW.payer_id;

  -- Notify each group member (except the payer)
  FOR v_member IN
    SELECT gm.user_id, p.full_name, p.id AS profile_id
    FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = NEW.group_id
      AND gm.user_id != NEW.payer_id
  LOOP
    INSERT INTO email_notifications (
      recipient_user_id, recipient_email, notification_type, subject, body_json
    ) VALUES (
      v_member.profile_id,
      '', -- Email will be resolved by the Edge Function from auth.users
      'expense_added',
      v_payer_name || ' added "' || NEW.description || '" in ' || COALESCE(v_group_name, 'a group'),
      jsonb_build_object(
        'expense_id', NEW.id,
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'payer_name', v_payer_name,
        'description', NEW.description,
        'total_amount', NEW.total_amount,
        'currency_code', NEW.currency_code,
        'member_name', v_member.full_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_expense_created ON expenses;
CREATE TRIGGER on_expense_created
  AFTER INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION notify_expense_added();

-- 3. Trigger: When a settlement is recorded, notify the payee
CREATE OR REPLACE FUNCTION notify_settlement_recorded()
RETURNS TRIGGER AS $$
DECLARE
  v_payer_name TEXT;
  v_payee_name TEXT;
  v_group_name TEXT;
BEGIN
  SELECT full_name INTO v_payer_name FROM profiles WHERE id = NEW.payer_id;
  SELECT full_name INTO v_payee_name FROM profiles WHERE id = NEW.payee_id;
  IF NEW.group_id IS NOT NULL THEN
    SELECT name INTO v_group_name FROM groups WHERE id = NEW.group_id;
  END IF;

  INSERT INTO email_notifications (
    recipient_user_id, recipient_email, notification_type, subject, body_json
  ) VALUES (
    NEW.payee_id,
    '',
    'settlement_recorded',
    v_payer_name || ' settled up with you',
    jsonb_build_object(
      'settlement_id', NEW.id,
      'payer_name', v_payer_name,
      'payee_name', v_payee_name,
      'amount', NEW.amount,
      'currency_code', NEW.currency_code,
      'group_name', v_group_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_settlement_created ON settlements;
CREATE TRIGGER on_settlement_created
  AFTER INSERT ON settlements
  FOR EACH ROW EXECUTE FUNCTION notify_settlement_recorded();

-- 4. Trigger: When a group invitation is created, queue an email
CREATE OR REPLACE FUNCTION notify_group_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_inviter_name TEXT;
  v_group_name TEXT;
  v_app_name TEXT;
BEGIN
  SELECT full_name INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  SELECT name INTO v_group_name FROM groups WHERE id = NEW.group_id;

  BEGIN
    SELECT value INTO v_app_name FROM public.app_settings WHERE key = 'app_name' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_app_name := 'Centfolio';
  END;

  INSERT INTO email_notifications (
    recipient_email, notification_type, subject, body_json
  ) VALUES (
    NEW.email,
    'group_invitation',
    v_inviter_name || ' invited you to join "' || v_group_name || '" on ' || COALESCE(v_app_name, 'Centfolio'),
    jsonb_build_object(
      'invitation_id', NEW.id,
      'inviter_name', v_inviter_name,
      'group_name', v_group_name,
      'group_id', NEW.group_id,
      'token', NEW.token,
      'email', NEW.email
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_group_invitation_created ON group_invitations;
CREATE TRIGGER on_group_invitation_created
  AFTER INSERT ON group_invitations
  FOR EACH ROW EXECUTE FUNCTION notify_group_invitation();

-- ============================================================================
-- ENABLE SUPABASE REALTIME on key tables
-- This allows the React client to subscribe to postgres_changes events
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_invitations;
