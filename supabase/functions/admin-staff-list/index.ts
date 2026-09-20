import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
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

    const { data, error } = await admin
      .from('staff_codes')
      .select('id, code, staff_name, is_admin, active, created_at')
      .order('staff_name')

    if (error) throw error

    const staffList = (data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      staffName: row.staff_name,
      isAdmin: row.is_admin,
      active: row.active,
      createdAt: row.created_at,
    }))

    return jsonResponse({ success: true, staff: staffList })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load staff.' },
      400,
    )
  }
})
