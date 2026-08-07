-- ==============================================================================
-- EDGE FUNCTION INVOCATION SETUP
-- Run this in your Supabase SQL Editor to automate your Edge Function
-- ==============================================================================

-- Ensure pg_net is enabled (required for making external HTTP requests from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net;


-- OPTION 1: TRIGGER VIA WEBHOOK (Recommended for instant emails)
-- This calls the edge function instantly whenever a new notification is queued.

CREATE OR REPLACE FUNCTION trigger_email_notifier()
RETURNS TRIGGER AS $$
BEGIN
  -- Fires an async HTTP POST request to your Edge Function
  -- NOTE: Replace <YOUR_ANON_KEY> with your actual Supabase anon key!
  PERFORM net.http_post(
      url:='https://kvddxuxnyhqxmmmfetvn.supabase.co/functions/v1/email-notifier',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZGR4dXhueWhxeG1tbWZldHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMTk1NDIsImV4cCI6MjEwMTU5NTU0Mn0.tApWxsyEfqRPHawyt35BpqFK-OnLyQ7ShRx0OK5dCzM"}'::jsonb,
      body:='{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the webhook trigger to the notifications table
DROP TRIGGER IF EXISTS on_notification_queued ON email_notifications;
CREATE TRIGGER on_notification_queued
  AFTER INSERT ON email_notifications
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_email_notifier();



-- OPTION 2: CRON JOB (Fallback / Batching)
-- If you'd rather process emails in batches every minute, use pg_cron instead of a trigger.
-- (Do not run both Option 1 and Option 2, pick one)

/*
SELECT cron.schedule(
  'invoke-email-notifier',
  '* * * * *', -- Runs every 1 minute
  $$
    SELECT net.http_post(
        url:='https://kvddxuxnyhqxmmmfetvn.supabase.co/functions/v1/email-notifier',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb,
        body:='{}'::jsonb
    );
  $$
);
*/
