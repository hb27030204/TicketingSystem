import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { StaffHeader } from '../components/StaffHeader'
import { StaffLoginForm } from '../components/StaffLoginForm'
import { useStaffSession } from '../hooks/useStaffSession'
import { getTicketForCheckin, performCheckin, type TicketForCheckin } from '../lib/staffApi'

function CheckinPanel({ token }: { token: string }) {
  const { staff, logout } = useStaffSession()
  const [data, setData] = useState<TicketForCheckin | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!staff) return
    setError('')
    try {
      const result = await getTicketForCheckin(staff.sessionToken, token)
      if (!result.success || result.result !== 'READY' || !result.ticket) {
        setError(result.message || 'This ticket cannot be checked in.')
        setData(null)
        return
      }
      setData(result)
      const firstOpenAllowed = result.ticket.days.find((d) => d.enabled && d.allowed && !d.complete)
      setSelectedDate(firstOpenAllowed?.eventDate || result.ticket.days[0]?.eventDate || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this ticket.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, token])

  const currentDay = data?.ticket?.days.find((d) => d.eventDate === selectedDate)
  const maxQty = currentDay ? currentDay.remaining : 1

  async function handleCheckin() {
    if (!staff || !selectedDate) return
    setBusy(true)
    setStatus('')
    setError('')
    try {
      const result = await performCheckin(staff.sessionToken, token, selectedDate, quantity)

      if (result.result === 'VALID') {
        setStatus(`${quantity} guest(s) checked in. ${result.remaining} remaining for ${selectedDate}.`)
        await load()
        setQuantity(1)
        return
      }

      if (result.result === 'CHECKIN_CLOSED') {
        setError(`Check-in is closed for ${selectedDate}.`)
      } else if (result.result === 'TOO_MANY') {
        setError(`Only ${result.remaining} guest(s) remain for ${selectedDate}.`)
      } else if (result.result === 'ALREADY_USED') {
        setError('All guests for this date have already been checked in.')
      } else {
        setError(result.message || 'Check-in failed.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rd-page">
      <StaffHeader staffName={staff?.staffName} isAdmin={staff?.isAdmin} onLogout={logout} />

      <div className="mx-auto max-w-md px-4 py-10">
        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgba(232,107,114,0.1)', color: 'var(--rd-red)' }}
          >
            {error}
          </div>
        )}
        {status && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgba(85,212,138,0.1)', color: 'var(--rd-green)' }}
          >
            {status}
          </div>
        )}

        {data?.ticket && (
          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}>
            <h2 className="rd-heading text-lg" style={{ color: 'var(--rd-text)' }}>
              {data.ticket.name}
            </h2>
            <p className="mb-4 text-sm" style={{ color: 'var(--rd-muted)' }}>
              {data.ticket.ticketTypeLabel} · Band {data.ticket.bandColour} · {data.ticket.totalGuests} guest(s) total
            </p>

            <div className="mb-4 space-y-2">
              {data.ticket.days.map((d, i) => (
                <button
                  key={d.eventDate}
                  type="button"
                  disabled={!d.enabled || !d.allowed || d.complete}
                  onClick={() => setSelectedDate(d.eventDate)}
                  className="w-full rounded-lg border px-4 py-3 text-left disabled:opacity-40"
                  style={
                    selectedDate === d.eventDate
                      ? {
                          borderColor: i === 1 ? 'var(--rd-purple)' : 'var(--rd-gold)',
                          background: 'rgba(255,255,255,0.05)',
                        }
                      : { borderColor: 'var(--rd-line)' }
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: 'var(--rd-text)' }}>
                      {d.eventDate}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--rd-muted)' }}>
                      {d.checkedIn}/{d.checkedIn + d.remaining} in
                    </span>
                  </div>
                  {!d.enabled && (
                    <span className="text-xs" style={{ color: 'var(--rd-red)' }}>
                      Check-in closed
                    </span>
                  )}
                  {d.enabled && d.complete && (
                    <span className="text-xs" style={{ color: 'var(--rd-muted)' }}>
                      All guests checked in
                    </span>
                  )}
                </button>
              ))}
            </div>

            {currentDay && currentDay.enabled && !currentDay.complete && (
              <>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
                  Guests entering now (max {maxQty})
                </label>
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-10 w-10 rounded-lg border text-lg"
                    style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-lg font-semibold" style={{ color: 'var(--rd-text)' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="h-10 w-10 rounded-lg border text-lg"
                    style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleCheckin}
                  disabled={busy}
                  className="w-full rounded-lg py-3 font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))', color: '#171216' }}
                >
                  {busy ? 'Confirming…' : `Check in ${quantity} guest(s)`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Checkin() {
  const { staff } = useStaffSession()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  if (!token) {
    return (
      <div className="rd-page flex min-h-screen items-center justify-center px-6 text-center">
        <p style={{ color: 'var(--rd-muted)' }}>No ticket QR token was supplied.</p>
      </div>
    )
  }

  return staff ? <CheckinPanel token={token} /> : <StaffLoginForm subtitle="Sign in to check this guest in." />
}
