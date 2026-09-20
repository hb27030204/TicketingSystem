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
    await requireStaffSession(admin, body.session_token)

    const [{ data: eventSettings }, { data: paidOrders }, { data: checkinRows }] = await Promise.all([
      admin.from('event_settings').select('event_date, checkin_enabled, capacity').order('event_date'),
      admin.from('orders').select('quantity, event_dates').eq('payment_status', 'PAID'),
      admin.from('checkin_events').select('event_date, quantity'),
    ])

    const paidByDate = new Map<string, number>()
    for (const order of paidOrders ?? []) {
      for (const date of order.event_dates) {
        paidByDate.set(date, (paidByDate.get(date) ?? 0) + order.quantity)
      }
    }

    const checkedByDate = new Map<string, number>()
    for (const row of checkinRows ?? []) {
      checkedByDate.set(row.event_date, (checkedByDate.get(row.event_date) ?? 0) + row.quantity)
    }

    const dates = (eventSettings ?? []).map((setting) => ({
      eventDate: setting.event_date,
      paid: paidByDate.get(setting.event_date) ?? 0,
      checkedIn: checkedByDate.get(setting.event_date) ?? 0,
      capacity: setting.capacity,
      checkinEnabled: setting.checkin_enabled,
    }))

    return jsonResponse({ success: true, dates })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load the dashboard.' },
      400,
    )
  }
})
