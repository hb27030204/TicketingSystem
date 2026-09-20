import { createClient } from 'npm:@supabase/supabase-js@2'

// Service-role client: bypasses RLS. Only ever used inside Edge Functions,
// never exposed to the frontend. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided automatically to every Edge Function by the Supabase runtime.
export function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}
