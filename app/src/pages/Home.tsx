import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import venueQr from '../assets/venue-location-qr.png'
import { Footer } from '../components/Footer'
import { Hero } from '../components/Hero'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { createOrder, verifyPayment } from '../lib/booking'
import {
  isRestrictedRazorpayBrowser,
  openRazorpayCheckout,
  type RazorpayHandlerResponse,
} from '../lib/razorpay'
import { RAZORPAY_KEY_ID } from '../lib/env'
import { supabase } from '../lib/supabaseClient'
import { VENUE_MAPS_URL, VENUE_NAME } from '../lib/venue'
import type { EventSetting, TicketType } from '../types/db'

const PENDING_KEY = 'ticketing_pending_selection'

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Grouped by category (each one's 1-day variant immediately followed by
// its 2-day variant) instead of sorted by price, which interleaved them
// - e.g. Stag, Stag - 2 Days, Couple, Couple - 2 Days, rather than
// Stag, Couple, Stag - 2 Days, Couple - 2 Days.
const TICKET_CATEGORY_ORDER = ['Kids (5 years below)', 'Stag', 'Couple', 'Group of 5']

function sortTicketTypes(types: TicketType[]): TicketType[] {
  return [...types].sort((a, b) => {
    const categoryA = a.label.replace(/ — 2 Days$/, '')
    const categoryB = b.label.replace(/ — 2 Days$/, '')
    const rankA = TICKET_CATEGORY_ORDER.indexOf(categoryA)
    const rankB = TICKET_CATEGORY_ORDER.indexOf(categoryB)
    if (rankA !== rankB) return rankA - rankB
    return Number(a.is_multi_day) - Number(b.is_multi_day)
  })
}

interface PendingSelection {
  ticketTypeId: string
  eventDate: string
  quantity: number
}

export function Home() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [dates, setDates] = useState<EventSetting[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [profilePhone, setProfilePhone] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .then(({ data }) => {
        const sorted = sortTicketTypes(data ?? [])
        setTicketTypes(sorted)
        if (sorted.length > 0) setSelectedTypeId(sorted[0].id)
      })

    supabase
      .from('event_settings')
      .select('*')
      .order('event_date')
      .then(({ data }) => {
        setDates(data ?? [])
        if (data && data.length > 0) setSelectedDate(data[0].event_date)
      })
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfilePhone(data?.phone ?? ''))
  }, [session])

  // Resume a booking that was interrupted by a login redirect.
  useEffect(() => {
    if (!session) return
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return
    sessionStorage.removeItem(PENDING_KEY)
    try {
      const pending = JSON.parse(raw) as PendingSelection
      setSelectedTypeId(pending.ticketTypeId)
      setSelectedDate(pending.eventDate)
      setQuantity(pending.quantity)
    } catch {
      // ignore malformed pending selection
    }
  }, [session])

  const selectedType = useMemo(
    () => ticketTypes.find((t) => t.id === selectedTypeId),
    [ticketTypes, selectedTypeId],
  )

  const isMultiDay = selectedType?.is_multi_day ?? false

  const eventDates = useMemo(() => {
    if (!selectedType) return []
    return isMultiDay ? selectedType.valid_dates : [selectedDate]
  }, [selectedType, isMultiDay, selectedDate])

  const total = (selectedType?.price ?? 0) * quantity

  async function handlePay() {
    setError('')

    if (!selectedType) {
      setError('Please choose a ticket.')
      return
    }

    if (!session) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ ticketTypeId: selectedTypeId, eventDate: selectedDate, quantity }),
      )
      navigate('/login?redirect=/book')
      return
    }

    setBusy(true)
    try {
      const order = await createOrder({
        ticketTypeId: selectedType.id,
        eventDates,
        quantity,
      })

      const restricted = isRestrictedRazorpayBrowser()

      await openRazorpayCheckout({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'Raas Garba X Dandiya 2.0',
        description: selectedType.label,
        order_id: order.razorpayOrderId,
        prefill: { contact: profilePhone },
        notes: { booking_code: order.bookingCode },
        theme: { color: '#d7ad52' },
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            await verifyPayment({
              bookingCode: order.bookingCode,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            })
            navigate('/my-tickets?success=1')
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : `Payment was received, but the ticket could not be confirmed. Booking ${order.bookingCode}.`,
            )
          } finally {
            setBusy(false)
          }
        },
        modal: { ondismiss: () => setBusy(false) },
        ...(restricted
          ? {
              redirect: true,
              callback_url: `${window.location.origin}/api/razorpay-callback?bookingCode=${encodeURIComponent(
                order.bookingCode,
              )}`,
            }
          : {}),
      })
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not start payment.')
    }
  }

  return (
    <div className="rd-page">
      <Nav />

      <Hero />

      <main id="booking" className="mx-auto max-w-xl px-4 pb-16">
        <p
          className="mb-1 text-center text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: 'var(--rd-gold)' }}
        >
          Your night starts here
        </p>
        <h2 className="rd-heading mb-2 text-center text-3xl" style={{ color: 'var(--rd-text)' }}>
          Pick your night.
        </h2>
        <p className="mb-3 text-center text-sm" style={{ color: 'var(--rd-muted)' }}>
          Two nights. Different energy. Same Raas spirit.
        </p>

        <div
          className="mb-8 rounded-2xl border p-4 text-left"
          style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
        >
          <div
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: 'var(--rd-line)' }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              Event Timing
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--rd-text)' }}>
              5:00 PM – 10:00 PM
            </span>
          </div>

          <div className="flex items-center gap-4 pt-3">
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
                Venue
              </p>
              <p className="font-medium" style={{ color: 'var(--rd-text)' }}>
                {VENUE_NAME}
              </p>
              <p className="text-xs" style={{ color: 'var(--rd-muted)' }}>
                Vijayapura · Scan or Tap the QR for directions
              </p>
            </div>
            <a
              href={VENUE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block flex-shrink-0 rounded-md bg-white p-1"
              aria-label={`Open ${VENUE_NAME} in Google Maps`}
            >
              <img src={venueQr} alt="" width={48} height={48} className="block" />
            </a>
          </div>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
        >
          {dates.length > 0 && (
            <div className="mb-6">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
                Date
              </label>
              <div className="flex gap-2">
                {dates.map((d, i) => (
                  <button
                    key={d.event_date}
                    type="button"
                    onClick={() => setSelectedDate(d.event_date)}
                    disabled={isMultiDay}
                    className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
                    style={
                      selectedDate === d.event_date
                        ? {
                            borderColor: i === 1 ? 'var(--rd-purple)' : 'var(--rd-gold)',
                            background: 'rgba(255,255,255,0.05)',
                            color: i === 1 ? 'var(--rd-purple)' : 'var(--rd-gold-2)',
                          }
                        : { borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }
                    }
                  >
                    {formatDate(d.event_date)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              Ticket
            </label>
            <div className="grid gap-2">
              {ticketTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTypeId(t.id)}
                  className="rounded-lg border px-4 py-3 text-left"
                  style={
                    selectedTypeId === t.id
                      ? {
                          borderColor: 'var(--rd-gold)',
                          borderLeftWidth: 4,
                          background: 'rgba(215,173,82,0.08)',
                        }
                      : { borderColor: 'var(--rd-line)' }
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: 'var(--rd-text)' }}>
                      {t.label}
                    </span>
                    <span style={{ color: 'var(--rd-gold-2)' }}>₹{t.price.toLocaleString('en-IN')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              Quantity
            </label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} style={{ color: '#000' }}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div
            className="mb-6 flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="text-sm" style={{ color: 'var(--rd-muted)' }}>
              Total
            </span>
            <span className="text-2xl font-bold" style={{ color: 'var(--rd-gold-2)' }}>
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>

          {error && (
            <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
              {error}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={busy || !selectedType}
            className="w-full rounded-lg py-3 font-semibold disabled:opacity-50"
            style={{
              background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))',
              color: '#171216',
            }}
          >
            {busy ? 'Processing…' : session ? 'Proceed to secure payment' : 'Log in & pay'}
          </button>
          <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--rd-muted)' }}>
            Payments are securely processed by Razorpay.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
