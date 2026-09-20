import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { verifyPayment } from '../lib/booking'

// Landing point for the Razorpay *redirect* checkout flow used on restricted
// iOS in-app browsers (see lib/razorpay.ts). Razorpay POSTs the payment
// result to /api/razorpay-callback (a Vercel function), which 302-redirects
// here as a GET with the same params so this SPA route can read them.
export function CheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

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
      .then(() => navigate('/my-tickets', { replace: true }))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : `Payment was received, but the ticket could not be confirmed. Booking ${bookingCode}.`,
        ),
      )
  }, [searchParams, navigate])

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={() => navigate('/my-tickets')}
            className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Go to My Tickets
          </button>
        </>
      ) : (
        <p className="text-neutral-500">Confirming your payment…</p>
      )}
    </div>
  )
}
