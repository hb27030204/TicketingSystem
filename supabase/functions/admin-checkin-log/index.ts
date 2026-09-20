import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
}

interface CheckinRow {
  id: string
  event_date: string
  quantity: number
  created_at: string
  // Each of these embeds is the "child embeds its parent" direction
  // (the FK column lives on this row), which PostgREST always returns
  // as a single object regardless of uniqueness.
  staff_codes: { staff_name: string } | null
  tickets: {
    ticket_token: string
    orders: {
      booking_code: string
      profiles: { full_name: string; phone: string } | null
      ticket_types: { label: string } | null
    } | null
  } | null
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
      .from('checkin_events')
      .select(
        'id, event_date, quantity, created_at, staff_codes(staff_name), ' +
          'tickets(ticket_token, orders(booking_code, profiles(full_name, phone), ticket_types(label)))',
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    const events = ((data ?? []) as unknown as CheckinRow[]).map((row) => {
      const order = row.tickets?.orders ?? null
      return {
        id: row.id,
        eventDate: row.event_date,
        quantity: row.quantity,
        createdAt: row.created_at,
        staffName: row.staff_codes?.staff_name ?? '',
        guestName: order?.profiles?.full_name ?? '',
        guestPhone: order?.profiles?.phone ?? '',
        bookingCode: order?.booking_code ?? '',
        ticketType: order?.ticket_types?.label ?? '',
      }
    })

    return jsonResponse({ success: true, events })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load check-in log.' },
      400,
    )
  }
})
