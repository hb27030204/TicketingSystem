import { getAuthedUser } from '../_shared/auth.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { sendTicketEmailForTicket } from '../_shared/ticketEmail.ts'

// Manual resend, e.g. a "Resend ticket email" button on My Tickets if the
// automatic send from verify-payment failed. Callable by the ticket's
// owner only.
interface Body {
  booking_code: string
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const user = await getAuthedUser(req, admin)
    const body = (await req.json()) as Body
    const bookingCode = String(body.booking_code || '').trim()

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, payment_status, tickets(id)')
      .eq('booking_code', bookingCode)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return jsonResponse({ success: false, message: 'Booking not found.' }, 404)
    }

    if (order.payment_status !== 'PAID') {
      return jsonResponse({ success: false, message: 'This booking is not paid.' }, 400)
    }

    // tickets.order_id is UNIQUE, so PostgREST embeds this as a single
    // object, not an array - confirmed against a real API response.
    const ticket = order.tickets as unknown as { id: string } | null
    if (!ticket) {
      return jsonResponse({ success: false, message: 'No ticket found for this booking.' }, 404)
    }

    await sendTicketEmailForTicket(admin, ticket.id)

    return jsonResponse({ success: true })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not send ticket email.' },
      400,
    )
  }
})
