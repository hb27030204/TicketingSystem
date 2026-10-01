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

  // Sliding the expiry forward is pure housekeeping - nothing in the
  // response depends on it, so it shouldn't block every single
  // staff-authenticated request on an extra DB round trip. waitUntil
  // (Supabase's Deno runtime global) lets it finish after the response
  // is already sent, instead of either blocking or risking the isolate
  // freezing mid-write the way a bare un-awaited call would. Falls back
  // to awaiting when running somewhere that global isn't present (e.g.
  // local type-checking).
  const newExpiry = new Date(Date.now() + STAFF_SESSION_HOURS * 60 * 60 * 1000).toISOString()
  // Supabase's query builder is thenable (awaitable) but isn't an actual
  // Promise instance, so it needs wrapping to satisfy waitUntil's signature.
  const expiryUpdate = Promise.resolve(
    admin.from('staff_sessions').update({ expires_at: newExpiry }).eq('token', sessionToken),
  )
  const waitUntil = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil
  if (waitUntil) {
    waitUntil(expiryUpdate)
  } else {
    await expiryUpdate
  }

  return {
    staffCodeId: session.staff_code_id,
    staffName: staffCode.staff_name,
    isAdmin: staffCode.is_admin,
  }
}
