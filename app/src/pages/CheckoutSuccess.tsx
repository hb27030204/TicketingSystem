import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BookingConfirmOverlay, type ConfirmState } from '../components/BookingConfirmOverlay'
import { verifyPayment } from '../lib/booking'

// Landing point for the Razorpay *redirect* checkout flow used on restricted
// iOS in-app browsers (see lib/razorpay.ts). Razorpay POSTs the payment
// result to /api/razorpay-callback (a Vercel function), which 302-redirects
// here as a GET with the same params so this SPA route can read them.
export function CheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>('confirming')

  useEffect(() => {
    const bookingCode = searchParams.get('bookingCode') || ''
    const paymentId = searchParams.get('razorpay_payment_id') || ''
    const orderId = searchParams.get('razorpay_order_id') || ''
    const signature = searchParams.get('razorpay_signature') || ''

    if (!bookingCode || !paymentId || !orderId || !signature) {
      setError('Missing payment details. If money was deducted, check My Tickets in a few minutes.')
      return
    }

    verifyPayment({
      bookingCode,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      razorpaySignature: signature,
    })
      .then(() => {
        setConfirmState('success')
        setTimeout(() => navigate('/my-tickets', { replace: true }), 1100)
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : `Payment was received, but the ticket could not be confirmed. Booking ${bookingCode}.`,
        ),
      )
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="rd-page mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
          {error}
        </p>
        <button
          onClick={() => navigate('/my-tickets')}
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
          style={{ background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))', color: '#171216' }}
        >
          Go to My Tickets
        </button>
      </div>
    )
  }

  return (
    <div className="rd-page min-h-screen">
      <BookingConfirmOverlay state={confirmState} />
    </div>
  )
}
