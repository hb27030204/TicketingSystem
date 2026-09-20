import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const STAFF_SESSION_HOURS = 12

export interface StaffSession {
  staffCodeId: string
  staffName: string
  isAdmin: boolean
}

// Staff are not Supabase Auth users - they log in with a fixed per-staff
// code (see staff-login/index.ts), which issues an opaque session token
// stored in staff_sessions. This validates that token and, like the old
// Apps Script CacheService session, slides the expiry forward on each use
// so an active staff device stays logged in through the event.
export async function requireStaffSession(
  admin: SupabaseClient,
  sessionToken: string | undefined | null,
): Promise<StaffSession> {
  if (!sessionToken) {
    throw new Error('Staff session expired. Please sign in again.')
  }

  const { data: session, error } = await admin
    .from('staff_sessions')
    .select('staff_code_id, expires_at, staff_codes(staff_name, is_admin, active)')
    .eq('token', sessionToken)
    .maybeSingle()

  if (error || !session) {
    throw new Error('Staff session expired. Please sign in again.')
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw new Error('Staff session expired. Please sign in again.')
  }

  const staffCode = session.staff_codes as unknown as {
    staff_name: string
    is_admin: boolean
    active: boolean
  } | null

  if (!staffCode || !staffCode.active) {
    throw new Error('Staff session expired. Please sign in again.')
  }

  const newExpiry = new Date(Date.now() + STAFF_SESSION_HOURS * 60 * 60 * 1000).toISOString()
  await admin.from('staff_sessions').update({ expires_at: newExpiry }).eq('token', sessionToken)

  return {
    staffCodeId: session.staff_code_id,
    staffName: staffCode.staff_name,
    isAdmin: staffCode.is_admin,
  }
}
