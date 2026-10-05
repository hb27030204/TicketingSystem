import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
}

interface OrderRow {
  id: string
  booking_code: string
  event_dates: string[]
  quantity: number
  amount: number
  payment_status: string
  created_at: string
  profiles: { full_name: string; phone: string; email: string } | null
  ticket_types: { label: string } | null
  // orders.id is referenced by tickets.order_id, which is unique - so
  // PostgREST embeds this as a single object, not an array (same quirk
  // as app/src/lib/tickets.ts).
  tickets: { status: string; email_status: string } | null
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
      .from('orders')
      .select(
        'id, booking_code, event_dates, quantity, amount, payment_status, created_at, ' +
          'profiles(full_name, phone, email), ticket_types(label), tickets(status, email_status)',
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    // The offline/walk-in batch (see Offline Tickets generation) all
    // shares one placeholder profile, phone 9999999999 - that's the only
    // signal distinguishing an offline-issued ticket from a real online
    // booking, since otherwise they're identical rows in this table.
    const OFFLINE_PLACEHOLDER_PHONE = '9999999999'

    const bookings = ((data ?? []) as unknown as OrderRow[]).map((row) => ({
      orderId: row.id,
      bookingCode: row.booking_code,
      name: row.profiles?.full_name ?? '',
      email: row.profiles?.email ?? '',
      phone: row.profiles?.phone ?? '',
      isOffline: row.profiles?.phone === OFFLINE_PLACEHOLDER_PHONE,
      ticketType: row.ticket_types?.label ?? '',
      quantity: row.quantity,
      amount: row.amount,
      eventDates: row.event_dates,
      paymentStatus: row.payment_status,
      ticketStatus: row.tickets?.status ?? null,
      emailStatus: row.tickets?.email_status ?? null,
      createdAt: row.created_at,
    }))

    return jsonResponse({ success: true, bookings })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load bookings.' },
      400,
    )
  }
})
