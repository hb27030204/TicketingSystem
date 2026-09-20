import { invokeFunction } from './functions'

export interface CreateOrderResult {
  success: boolean
  keyId: string
  razorpayOrderId: string
  amount: number
  bookingCode: string
  message?: string
}

export async function createOrder(input: {
  ticketTypeId: string
  eventDates: string[]
  quantity: number
}): Promise<CreateOrderResult> {
  const data = await invokeFunction<CreateOrderResult>('create-order', {
    ticket_type_id: input.ticketTypeId,
    event_dates: input.eventDates,
    quantity: input.quantity,
  })

  if (!data.success) throw new Error(data.message || 'Could not create the booking.')
  return data
}

export interface VerifyPaymentResult {
  success: boolean
  alreadyPaid?: boolean
  // Minimal record only - the full ticket (with its QR image URL) is
  // reloaded from fetchMyTickets() after redirecting, not from this response.
  ticket?: { id: string; ticket_token: string; qr_image_path: string | null }
  message?: string
}

export async function verifyPayment(input: {
  bookingCode: string
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
}): Promise<VerifyPaymentResult> {
  const data = await invokeFunction<VerifyPaymentResult>('verify-payment', {
    booking_code: input.bookingCode,
    razorpay_payment_id: input.razorpayPaymentId,
    razorpay_order_id: input.razorpayOrderId,
    razorpay_signature: input.razorpaySignature,
  })

  if (!data.success) throw new Error(data.message || 'Payment verification failed.')
  return data
}
