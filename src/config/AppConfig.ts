/**
 * Global Centfolio Web / PWA Application Configuration.
 * Single source of truth for remote Supabase endpoints and companion APK configurations.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (
  import.meta.env.DEV &&
  (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)
) {
  console.warn(
    '[Centfolio AppConfig] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in environment variables. Falling back to placeholders.'
  );
}

export const AppConfig = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  companion: {
    apkUrl: (import.meta.env.VITE_COMPANION_APK_URL as string | undefined)?.trim() || '',
  },
} as const;
