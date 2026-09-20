function requireEnv(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
export const RAZORPAY_KEY_ID = requireEnv('VITE_RAZORPAY_KEY_ID')

// Safe to ship to the browser - this is the whole point of MSG91's
// widget-specific token (distinct from the account-wide MSG91_AUTH_KEY,
// which stays a backend-only Edge Function secret).
export const MSG91_WIDGET_ID = requireEnv('VITE_MSG91_WIDGET_ID')
export const MSG91_WIDGET_TOKEN = requireEnv('VITE_MSG91_WIDGET_TOKEN')
