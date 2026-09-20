import { getAuthedUser } from '../_shared/auth.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createRazorpayOrder } from '../_shared/razorpay.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface CreateOrderBody {
  ticket_type_id: string
  event_dates: string[]
  quantity: number
}

function generateBookingCode(): string {
  return 'BKG-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const user = await getAuthedUser(req, admin)
    const body = (await req.json()) as CreateOrderBody

    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 30) {
      return jsonResponse({ success: false, message: 'Quantity must be between 1 and 30.' }, 400)
    }

    const eventDates = Array.isArray(body.event_dates) ? body.event_dates : []
    if (eventDates.length === 0) {
      return jsonResponse({ success: false, message: 'Please select a valid event date.' }, 400)
    }

    const { data: ticketType, error: typeError } = await admin
      .from('ticket_types')
      .select('*')
      .eq('id', body.ticket_type_id)
      .eq('active', true)
      .single()

    if (typeError || !ticketType) {
      return jsonResponse({ success: false, message: 'Ticket type not recognized.' }, 400)
    }

    let expectedDates: string[]
    if (ticketType.is_multi_day) {
      // Multi-day tickets always cover every date they're valid for -
      // ignore whatever the client sent and use the type's own dates.
      expectedDates = ticketType.valid_dates
    } else {
      const isSingleValidDate = eventDates.length === 1 && ticketType.valid_dates.includes(eventDates[0])
      if (!isSingleValidDate) {
        return jsonResponse({ success: false, message: 'Please select a valid event date.' }, 400)
      }
      expectedDates = eventDates
    }

    const bookingCode = generateBookingCode()
    const amount = ticketType.price * quantity

    const { data: reserveResult, error: reserveError } = await admin.rpc('reserve_order', {
      p_booking_code: bookingCode,
      p_user_id: user.id,
      p_ticket_type_id: ticketType.id,
      p_event_dates: expectedDates,
      p_quantity: quantity,
      p_amount: amount,
    })

    if (reserveError) throw reserveError
    if (!reserveResult?.success) {
      return jsonResponse({ success: false, message: reserveResult?.message || 'Could not reserve this booking.' }, 409)
    }

    const orderId = reserveResult.order_id as string

    let razorpayOrder
    try {
      razorpayOrder = await createRazorpayOrder({
        amountPaise: amount * 100,
        receipt: bookingCode,
        notes: { booking_code: bookingCode, ticket_type: ticketType.label, quantity: String(quantity) },
      })
    } catch (err) {
      await admin.from('orders').update({ payment_status: 'FAILED' }).eq('id', orderId)
      throw err
    }

    await admin
      .from('orders')
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq('id', orderId)

    return jsonResponse({
      success: true,
      keyId: razorpayOrder.keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: amount * 100,
      bookingCode,
    })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not create booking.' },
      400,
    )
  }
})
