import '../styles/bookingConfirmOverlay.css'

export type ConfirmState = 'confirming' | 'success'

// Shown for the gap between Razorpay reporting a successful payment and
// our own verify-payment call finishing (creating the ticket). Razorpay's
// own modal closes the instant payment succeeds, so without this a guest
// can easily think they're done and close the tab mid-confirmation - the
// exact cause behind every "paid on Razorpay but never linked" booking
// found this week. Making the wait (and the "don't close this" ask)
// visually unmissable is the fix.
export function BookingConfirmOverlay({ state }: { state: ConfirmState }) {
  return (
    <div className="rd-confirm-overlay" role="status" aria-live="polite">
      <div className="rd-confirm-card">
        {state === 'confirming' ? (
          <>
            <div className="rd-confirm-spinner" aria-hidden="true" />
            <p className="rd-confirm-title">Confirming your booking…</p>
            <p className="rd-confirm-sub">Please don&rsquo;t close this page</p>
          </>
        ) : (
          <>
            <svg className="rd-confirm-check" viewBox="0 0 52 52" width="56" height="56" aria-hidden="true">
              <circle className="rd-confirm-check-circle" cx="26" cy="26" r="24" fill="none" />
              <path className="rd-confirm-check-mark" fill="none" d="M14 27l7 7 16-16" />
            </svg>
            <p className="rd-confirm-title">Booking confirmed!</p>
            <p className="rd-confirm-sub">Taking you to your ticket…</p>
          </>
        )}
      </div>
    </div>
  )
}
