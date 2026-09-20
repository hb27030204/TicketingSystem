import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
  ticket_token: string
  event_date: string
  quantity: number
}

function normalizeToken(value: string): string {
  const token = String(value || '').trim().toUpperCase()
  if (!/^[A-F0-9]{32}$/.test(token)) {
    throw new Error('Invalid ticket QR.')
  }
  return token
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const staff = await requireStaffSession(admin, body.session_token)
    const token = normalizeToken(body.ticket_token)

    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return jsonResponse({ success: false, message: 'Please select a valid number of guests.' }, 400)
    }

    const { data, error } = await admin.rpc('perform_checkin', {
      p_ticket_token: token,
      p_event_date: body.event_date,
      p_quantity: quantity,
      p_staff_code_id: staff.staffCodeId,
    })

    if (error) throw error

    return jsonResponse({ success: data.result === 'VALID', ...data })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Check-in failed.' },
      400,
    )
  }
})
