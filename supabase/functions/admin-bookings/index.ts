import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { fetchAllRows } from '../_shared/fetchAll.ts'
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
  ticket_types: { label: string; unit_size: number } | null
  // orders.id is referenced by tickets.order_id, which is unique - so
  // PostgREST embeds this as a single object, not an array (same quirk
  // as app/src/lib/tickets.ts). checkin_events, in turn, is one-to-many
  // off that single ticket (one row per scan).
  tickets: {
    status: string
    email_status: string
    checkin_events: { event_date: string; quantity: number }[]
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

    const data = await fetchAllRows<OrderRow>((from, to) =>
      admin
        .from('orders')
        .select(
          'id, booking_code, event_dates, quantity, amount, payment_status, created_at, ' +
            'profiles(full_name, phone, email), ticket_types(label, unit_size), ' +
            'tickets(status, email_status, checkin_events(event_date, quantity))',
        )
        .order('created_at', { ascending: false })
        .range(from, to) as unknown as PromiseLike<{ data: OrderRow[] | null; error: { message: string } | null }>,
    )

    // The offline/walk-in batch (see Offline Tickets generation) all
    // shares one placeholder profile, phone 9999999999 - that's the only
    // signal distinguishing an offline-issued ticket from a real online
    // booking, since otherwise they're identical rows in this table.
    const OFFLINE_PLACEHOLDER_PHONE = '9999999999'

    const bookings = data.map((row) => {
      const unitSize = row.ticket_types?.unit_size ?? 1
      const totalGuests = row.quantity * unitSize

      // Capacity is tracked per event_date independently (see
      // perform_checkin) - a 2-day ticket can check in up to totalGuests
      // on EACH night separately, so summing across dates could read
      // past 100%. Taking the best single date's count instead stays
      // bounded by totalGuests (perform_checkin already refuses to let
      // any one date's sum exceed it) and answers the question an admin
      // actually has here: did this party's full group arrive.
      const perDate = new Map<string, number>()
      for (const ce of row.tickets?.checkin_events ?? []) {
        perDate.set(ce.event_date, (perDate.get(ce.event_date) ?? 0) + ce.quantity)
      }
      const checkedInCount = Math.max(0, ...perDate.values())

      return {
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
        totalGuests,
        checkedInCount,
      }
    })

    return jsonResponse({ success: true, bookings })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load bookings.' },
      400,
    )
  }
})
