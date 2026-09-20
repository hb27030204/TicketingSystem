import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Nav } from '../components/Nav'
import { TicketCard } from '../components/TicketCard'
import { useAuth } from '../hooks/useAuth'
import { fetchTicketByBookingCode } from '../lib/tickets'
import type { MyTicket } from '../types/db'

export function TicketView() {
  const { bookingCode = '' } = useParams()
  const { session } = useAuth()
  const [ticket, setTicket] = useState<MyTicket | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    setTicket(undefined)
    setError('')
    fetchTicketByBookingCode(bookingCode)
      .then(setTicket)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load ticket.'))
    // Same reasoning as MyTickets.tsx: re-fetch if the logged-in user
    // changes, not just when the URL's booking code changes.
  }, [bookingCode, session?.user.id])

  return (
    <div className="rd-page">
      <Nav />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link to="/my-tickets" className="mb-6 inline-block text-sm underline" style={{ color: 'var(--rd-muted)' }}>
          ← Back to My Tickets
        </Link>

        <h1 className="rd-heading mb-6 text-3xl" style={{ color: 'var(--rd-text)' }}>
          Your Ticket
        </h1>

        {error && (
          <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
            {error}
          </p>
        )}

        {ticket === undefined && !error && <p style={{ color: 'var(--rd-muted)' }}>Loading your ticket…</p>}

        {ticket === null && (
          <div
            className="rounded-xl border border-dashed p-8 text-center"
            style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-muted)' }}
          >
            <p>We couldn&rsquo;t find a paid booking {bookingCode} on this account.</p>
          </div>
        )}

        {ticket && (
          <div className="flex justify-center">
            <TicketCard {...ticket} />
          </div>
        )}
      </div>
    </div>
  )
}
