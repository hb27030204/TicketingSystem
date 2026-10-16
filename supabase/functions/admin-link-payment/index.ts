import { fetchFirstCapturedPayment, fetchRazorpayOrderStatus } from '../_shared/razorpay.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { issueTicketForOrder } from '../_shared/issueTicket.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { sendTicketEmailForTicket } from '../_shared/ticketEmail.ts'

interface Body {
  session_token: string
  booking_code: string
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

    const bookingCode = String(body.booking_code || '').trim()
    if (!bookingCode) {
      return jsonResponse({ success: false, message: 'Missing booking code.' }, 400)
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, user_id, quantity, payment_status, razorpay_order_id, razorpay_payment_id, ticket_types(unit_size)')
      .eq('booking_code', bookingCode)
      .single()

    if (orderError || !order) {
      return jsonResponse({ success: false, message: 'Booking not found.' }, 404)
    }

    // Idempotent: if this was already linked (e.g. a second admin click,
    // or it resolved itself since the list was last checked), just
    // report success instead of erroring or risking a duplicate ticket.
    if (order.payment_status === 'PAID') {
      const { data: ticket } = await admin
        .from('tickets')
        .select('id, ticket_token')
        .eq('order_id', order.id)
        .maybeSingle()
      return jsonResponse({ success: true, alreadyLinked: true, ticket })
    }

    if (!order.razorpay_order_id) {
      return jsonResponse({ success: false, message: 'This order has no Razorpay order ID to check.' }, 400)
    }

    // Never trust the admin dashboard's cached list for this - re-verify
    // against Razorpay directly right before writing anything, in case
    // the list is stale (e.g. refunded since, or somehow never paid).
    const rzpStatus = await fetchRazorpayOrderStatus(order.razorpay_order_id)
    if (rzpStatus.status !== 'paid') {
      return jsonResponse(
        { success: false, message: `Razorpay shows this order as "${rzpStatus.status}", not paid. Refusing to link.` },
        400,
      )
    }

    const payment = await fetchFirstCapturedPayment(order.razorpay_order_id)
    if (!payment) {
      return jsonResponse({ success: false, message: 'Razorpay shows this order as paid, but no captured payment was found.' }, 400)
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ payment_status: 'PAID', razorpay_payment_id: payment.id })
      .eq('id', order.id)

    if (updateError) throw updateError

    const unitSize = (order.ticket_types as unknown as { unit_size: number }).unit_size
    const ticketId = await issueTicketForOrder(admin, order, unitSize)

    try {
      await sendTicketEmailForTicket(admin, ticketId)
    } catch (emailError) {
      console.error('Ticket email failed:', emailError)
    }

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, ticket_token, email_status')
      .eq('id', ticketId)
      .single()

    return jsonResponse({ success: true, alreadyLinked: false, ticket })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not link this payment.' },
      400,
    )
  }
})
