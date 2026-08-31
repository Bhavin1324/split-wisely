-- ============================================================================
-- Centfolio Module: Dynamic Application Settings Table
-- Allows dynamic configuration of app branding (name, domain, support email)
-- without hardcoding string literals inside triggers or Edge functions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to application settings
CREATE POLICY "Allow public read-only access to app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Insert default seed configurations
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('app_name', 'Centfolio', 'Global branding name used in transactional emails and push notifications'),
  ('app_url', 'https://bsplit-wisely.vercel.app', 'Base web application URL'),
  ('support_email', 'support@centfolio.app', 'Contact and VAPID notification email')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = NOW();
