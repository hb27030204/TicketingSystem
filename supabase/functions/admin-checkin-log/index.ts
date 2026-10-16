import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { fetchAllRows } from '../_shared/fetchAll.ts'
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
      id: string
      booking_code: string
      amount: number
      profiles: { full_name: string; phone: string } | null
      ticket_types: { label: string } | null
    } | null
  } | null
}

// Same marker used by admin-bookings: the offline batch all shares one
// placeholder profile, phone 9999999999.
const OFFLINE_PLACEHOLDER_PHONE = '9999999999'

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

    const data = await fetchAllRows<CheckinRow>((from, to) =>
      admin
        .from('checkin_events')
        .select(
          'id, event_date, quantity, created_at, staff_codes(staff_name), ' +
            'tickets(ticket_token, orders(id, booking_code, amount, profiles(full_name, phone), ticket_types(label)))',
        )
        .order('created_at', { ascending: false })
        .range(from, to) as unknown as PromiseLike<{ data: CheckinRow[] | null; error: { message: string } | null }>,
    )

    const events = data.map((row) => {
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
        orderId: order?.id ?? '',
        amount: order?.amount ?? 0,
        isOffline: order?.profiles?.phone === OFFLINE_PLACEHOLDER_PHONE,
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
