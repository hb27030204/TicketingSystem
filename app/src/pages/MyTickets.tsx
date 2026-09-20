import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Nav } from '../components/Nav'
import { TicketCard } from '../components/TicketCard'
import { useAuth } from '../hooks/useAuth'
import { fetchMyTickets } from '../lib/tickets'
import '../styles/nav.css'
import type { MyTicket } from '../types/db'

function formatDates(dates: string[]): string {
  return dates
    .map((d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
    .join(' & ')
}

export function MyTickets() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const justPaid = searchParams.get('success') === '1'
  const [tickets, setTickets] = useState<MyTicket[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setTickets(null)
    setError('')
    fetchMyTickets()
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load tickets.'))
    // Re-fetch whenever the logged-in user actually changes (not just on
    // first mount) - otherwise switching accounts without a full page
    // reload leaves this showing whatever the previous session saw.
  }, [session?.user.id])

  const hasTickets = tickets !== null && tickets.length > 0

  return (
    <div className="rd-page">
      <Nav hideBookCta={!hasTickets} />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="rd-heading mb-6 text-3xl" style={{ color: 'var(--rd-text)' }}>
          My Tickets
        </h1>

        {justPaid && tickets && tickets.length > 0 && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-5 py-4"
            style={{ borderColor: 'rgba(85,212,138,0.35)', background: 'rgba(85,212,138,0.08)' }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: 'var(--rd-green)', color: '#062015' }}
            >
              ✓
            </span>
            <div>
              <p className="font-semibold" style={{ color: 'var(--rd-green)' }}>
                Payment successful
              </p>
              <p className="text-sm" style={{ color: 'var(--rd-muted)' }}>
                Booking {tickets[0].order.booking_code} — your festival pass is ready below.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
            {error}
          </p>
        )}

        {!tickets && !error && <p style={{ color: 'var(--rd-muted)' }}>Loading your tickets…</p>}

        {tickets && tickets.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-8 text-center"
            style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-muted)' }}
          >
            <p className="mb-4">You don&rsquo;t have any paid tickets yet.</p>
            <Link to="/book" className="rd-nav-book inline-block">
              Book a ticket
            </Link>
          </div>
        )}

        {/* Exactly one ticket: show it directly. More than one: show a
            picker list, and the detail view lives at /ticket/:bookingCode
            (TicketView), which links back here. */}
        {tickets && tickets.length === 1 && (
          <div className="flex justify-center">
            <TicketCard {...tickets[0]} />
          </div>
        )}

        {tickets && tickets.length > 1 && (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link
                key={t.order.id}
                to={`/ticket/${t.order.booking_code}`}
                className="flex items-center justify-between rounded-xl border px-5 py-4"
                style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
              >
                <div>
                  <p className="font-semibold" style={{ color: 'var(--rd-text)' }}>
                    {t.ticketType.label}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--rd-muted)' }}>
                    {formatDates(t.order.event_dates)} · Booking {t.order.booking_code}
                  </p>
                </div>
                <span style={{ color: 'var(--rd-gold-2)' }}>View →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
