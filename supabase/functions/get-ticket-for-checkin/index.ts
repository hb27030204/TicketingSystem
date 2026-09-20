import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
  ticket_token: string
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
    await requireStaffSession(admin, body.session_token)
    const token = normalizeToken(body.ticket_token)

    const { data: ticket, error: ticketError } = await admin
      .from('tickets')
      .select(
        'id, order_id, orders(booking_code, payment_status, quantity, event_dates, user_id, ticket_type_id)',
      )
      .eq('ticket_token', token)
      .maybeSingle()

    if (ticketError || !ticket) {
      return jsonResponse({ success: true, result: 'INVALID', message: 'No matching ticket was found.' })
    }

    const order = ticket.orders as unknown as {
      booking_code: string
      payment_status: string
      quantity: number
      event_dates: string[]
      user_id: string
      ticket_type_id: string
    }

    if (order.payment_status !== 'PAID') {
      return jsonResponse({
        success: true,
        result: 'NOT_PAID',
        message: 'This ticket has not been marked as paid.',
      })
    }

    const [{ data: ticketType }, { data: profile }, { data: eventSettings }, { data: checkinRows }] =
      await Promise.all([
        admin.from('ticket_types').select('label, unit_size, band_colour').eq('id', order.ticket_type_id).single(),
        admin.from('profiles').select('full_name').eq('id', order.user_id).single(),
        admin.from('event_settings').select('event_date, checkin_enabled').order('event_date'),
        admin.from('checkin_events').select('event_date, quantity').eq('ticket_id', ticket.id),
      ])

    const totalGuests = order.quantity * (ticketType?.unit_size ?? 1)

    const checkedByDate = new Map<string, number>()
    for (const row of checkinRows ?? []) {
      checkedByDate.set(row.event_date, (checkedByDate.get(row.event_date) ?? 0) + row.quantity)
    }

    const days = (eventSettings ?? []).map((setting) => {
      const checkedIn = checkedByDate.get(setting.event_date) ?? 0
      return {
        eventDate: setting.event_date,
        checkedIn,
        remaining: Math.max(0, totalGuests - checkedIn),
        complete: checkedIn >= totalGuests,
        enabled: setting.checkin_enabled,
        allowed: order.event_dates.includes(setting.event_date),
      }
    })

    return jsonResponse({
      success: true,
      result: 'READY',
      ticket: {
        bookingCode: order.booking_code,
        name: profile?.full_name || 'Guest',
        ticketTypeLabel: ticketType?.label || '',
        bandColour: ticketType?.band_colour || 'Standard',
        totalGuests,
        unitSize: ticketType?.unit_size ?? 1,
        days,
      },
    })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not load ticket.' },
      400,
    )
  }
})
