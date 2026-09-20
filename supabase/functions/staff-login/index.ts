import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { STAFF_SESSION_HOURS } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  code: string
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const code = String(body.code || '').trim()

    if (!code) {
      return jsonResponse({ success: false, message: 'Enter your staff code.' }, 400)
    }

    const { data: staffCode, error } = await admin
      .from('staff_codes')
      .select('id, staff_name, is_admin, active')
      .eq('code', code)
      .maybeSingle()

    if (error || !staffCode || !staffCode.active) {
      return jsonResponse({ success: false, message: 'Incorrect or inactive staff code.' }, 401)
    }

    const sessionToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + STAFF_SESSION_HOURS * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await admin.from('staff_sessions').insert({
      token: sessionToken,
      staff_code_id: staffCode.id,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    return jsonResponse({
      success: true,
      sessionToken,
      staffName: staffCode.staff_name,
      isAdmin: staffCode.is_admin,
      expiresAt,
    })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Login failed.' },
      400,
    )
  }
})
