import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
  event_date: string
  enabled: boolean
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const staff = await requireStaffSession(admin, body.session_token)

    if (!staff.isAdmin) {
      return jsonResponse({ success: false, message: 'Only an admin staff code can do this.' }, 403)
    }

    const { error } = await admin
      .from('event_settings')
      .update({ checkin_enabled: Boolean(body.enabled) })
      .eq('event_date', body.event_date)

    if (error) throw error

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not update check-in status.' },
      400,
    )
  }
})
