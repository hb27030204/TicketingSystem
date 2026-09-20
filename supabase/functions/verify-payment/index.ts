import { getAuthedUser } from '../_shared/auth.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { issueTicketForOrder } from '../_shared/issueTicket.ts'
import { verifyRazorpaySignature } from '../_shared/razorpay.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { sendTicketEmailForTicket } from '../_shared/ticketEmail.ts'

interface VerifyPaymentBody {
  booking_code: string
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const user = await getAuthedUser(req, admin)
    const body = (await req.json()) as VerifyPaymentBody

    const bookingCode = String(body.booking_code || '').trim()
    const paymentId = String(body.razorpay_payment_id || '').trim()
    const clientOrderId = String(body.razorpay_order_id || '').trim()
    const signature = String(body.razorpay_signature || '').trim()

    if (!bookingCode || !paymentId || !clientOrderId || !signature) {
      return jsonResponse({ success: false, message: 'Incomplete payment information.' }, 400)
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*, ticket_types(unit_size)')
      .eq('booking_code', bookingCode)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return jsonResponse({ success: false, message: 'Booking not found.' }, 404)
    }

    // Idempotent: if this booking is already confirmed (e.g. the client
    // retried after a network hiccup), just return its existing ticket
    // instead of erroring or double-charging any side effects.
    if (order.payment_status === 'PAID') {
      const { data: ticket } = await admin
        .from('tickets')
        .select('id, ticket_token, qr_image_path')
        .eq('order_id', order.id)
        .maybeSingle()

      return jsonResponse({ success: true, alreadyPaid: true, ticket })
    }

    if (order.razorpay_order_id !== clientOrderId) {
      return jsonResponse({ success: false, message: 'Razorpay order ID mismatch.' }, 400)
    }

    const validSignature = await verifyRazorpaySignature(clientOrderId, paymentId, signature)
    if (!validSignature) {
      return jsonResponse({ success: false, message: 'Payment signature verification failed.' }, 400)
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ payment_status: 'PAID', razorpay_payment_id: paymentId })
      .eq('id', order.id)

    if (updateError) throw updateError

    const unitSize = (order.ticket_types as unknown as { unit_size: number }).unit_size
    const ticketId = await issueTicketForOrder(admin, order, unitSize)

    // Ticket is confirmed and visible in My Tickets even if the email
    // provider hiccups - payment success must never hinge on email delivery.
    try {
      await sendTicketEmailForTicket(admin, ticketId)
    } catch (emailError) {
      console.error('Ticket email failed:', emailError)
    }

    const { data: ticket } = await admin
      .from('tickets')
      .select('id, ticket_token, qr_image_path')
      .eq('id', ticketId)
      .single()

    return jsonResponse({ success: true, alreadyPaid: false, ticket })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Payment verification failed.' },
      400,
    )
  }
})
