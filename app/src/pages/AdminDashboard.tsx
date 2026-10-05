import { useEffect, useMemo, useState } from 'react'

import { CheckinDatesPanel } from '../components/CheckinDatesPanel'
import { StaffHeader } from '../components/StaffHeader'
import { StaffLoginForm } from '../components/StaffLoginForm'
import { useStaffSession } from '../hooks/useStaffSession'
import {
  fetchBookings,
  fetchCheckinLog,
  fetchStaffList,
  type Booking,
  type CheckinLogEvent,
  type StaffMember,
} from '../lib/staffApi'

type Tab = 'checkin' | 'bookings' | 'staff' | 'log'

const TABS: { id: Tab; label: string }[] = [
  { id: 'checkin', label: 'Check-in dates' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'staff', label: 'Staff' },
  { id: 'log', label: 'Check-in log' },
]

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const cellStyle = { color: 'var(--rd-text)', borderColor: 'var(--rd-line)' }
const mutedCellStyle = { color: 'var(--rd-muted)', borderColor: 'var(--rd-line)' }

const paymentBadgeStyle: Record<Booking['paymentStatus'], { background: string; color: string }> = {
  PAID: { background: 'rgba(85,212,138,0.15)', color: 'var(--rd-green)' },
  PENDING: { background: 'rgba(215,173,82,0.15)', color: 'var(--rd-gold-2)' },
  FAILED: { background: 'rgba(232,107,114,0.15)', color: 'var(--rd-red)' },
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
      style={
        active
          ? { borderColor: 'var(--rd-gold)', background: 'rgba(215,173,82,0.1)', color: 'var(--rd-gold-2)' }
          : { borderColor: 'var(--rd-line)', color: 'var(--rd-muted)' }
      }
    >
      {label}
    </button>
  )
}

function BookingsTab({ sessionToken }: { sessionToken: string }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [ticketTypeFilter, setTicketTypeFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')

  useEffect(() => {
    fetchBookings(sessionToken)
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load bookings.'))
  }, [sessionToken])

  const ticketTypes = useMemo(
    () => Array.from(new Set((bookings ?? []).map((b) => b.ticketType))).sort(),
    [bookings],
  )
  const eventDates = useMemo(
    () => Array.from(new Set((bookings ?? []).flatMap((b) => b.eventDates))).sort(),
    [bookings],
  )

  const filtered = useMemo(() => {
    if (!bookings) return []
    const q = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (paymentFilter !== 'ALL' && b.paymentStatus !== paymentFilter) return false
      if (ticketTypeFilter !== 'ALL' && b.ticketType !== ticketTypeFilter) return false
      if (dateFilter !== 'ALL' && !b.eventDates.includes(dateFilter)) return false
      if (sourceFilter === 'ONLINE' && b.isOffline) return false
      if (sourceFilter === 'OFFLINE' && !b.isOffline) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.bookingCode.toLowerCase().includes(q)
      )
    })
  }, [bookings, search, paymentFilter, ticketTypeFilter, dateFilter, sourceFilter])

  const totals = useMemo(() => {
    const summary = {
      count: filtered.length,
      total: 0,
      paid: 0,
      pending: 0,
      failed: 0,
    }
    for (const b of filtered) {
      summary.total += b.amount
      if (b.paymentStatus === 'PAID') summary.paid += b.amount
      else if (b.paymentStatus === 'PENDING') summary.pending += b.amount
      else summary.failed += b.amount
    }
    return summary
  }, [filtered])

  const selectStyle = {
    borderColor: 'var(--rd-line)',
    color: 'var(--rd-text)',
    background: 'var(--rd-panel)',
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search name, email, phone or booking code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
        />
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={selectStyle}>
          <option value="ALL">All payments</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <select value={ticketTypeFilter} onChange={(e) => setTicketTypeFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={selectStyle}>
          <option value="ALL">All ticket types</option>
          {ticketTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={selectStyle}>
          <option value="ALL">All dates</option>
          {eventDates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
          className="rounded-lg border px-3 py-2 text-sm"
          style={selectStyle}
        >
          <option value="ALL">Online + Offline</option>
          <option value="ONLINE">Online tickets only</option>
          <option value="OFFLINE">Offline tickets only</option>
        </select>
      </div>

      {!bookings && !error && <p style={{ color: 'var(--rd-muted)' }}>Loading bookings…</p>}

      {bookings && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs" style={{ color: 'var(--rd-muted)' }}>
              {filtered.length} of {bookings.length} booking(s)
            </p>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--rd-line)' }}>
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr style={{ background: 'var(--rd-panel)' }}>
                    {['Name', 'Email', 'Phone', 'Source', 'Ticket type', 'Qty', 'Amount', 'Dates', 'Payment', 'Booking code', 'Booked at'].map(
                      (h) => (
                        <th key={h} className="border-b px-3 py-2 font-semibold whitespace-nowrap" style={mutedCellStyle}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.orderId}>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.name}
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.email}
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.phone}
                      </td>
                      <td className="border-b px-3 py-2" style={mutedCellStyle}>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={
                            b.isOffline
                              ? { background: 'rgba(215,173,82,0.15)', color: 'var(--rd-gold-2)' }
                              : { background: 'rgba(255,255,255,0.06)', color: 'var(--rd-muted)' }
                          }
                        >
                          {b.isOffline ? 'Offline' : 'Online'}
                        </span>
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.ticketType}
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.quantity}
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        ₹{b.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="border-b px-3 py-2" style={cellStyle}>
                        {b.eventDates.join(', ')}
                      </td>
                      <td className="border-b px-3 py-2" style={mutedCellStyle}>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={paymentBadgeStyle[b.paymentStatus]}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="border-b px-3 py-2" style={mutedCellStyle}>
                        {b.bookingCode}
                      </td>
                      <td className="border-b px-3 py-2 whitespace-nowrap" style={{ ...mutedCellStyle, minWidth: '150px' }}>
                        {formatDateTime(b.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center" style={mutedCellStyle}>
                        No bookings match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="w-full shrink-0 rounded-xl border p-4 lg:w-72"
            style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              Totals for current filter
            </p>
            <div className="mb-4">
              <p className="text-xs" style={{ color: 'var(--rd-muted)' }}>
                Total amount
              </p>
              <p className="rd-heading text-2xl" style={{ color: 'var(--rd-text)' }}>
                ₹{totals.total.toLocaleString('en-IN')}
              </p>
              <p className="text-xs" style={{ color: 'var(--rd-muted)' }}>
                across {totals.count} booking(s)
              </p>
            </div>
            <div className="space-y-2 border-t pt-3 text-sm" style={{ borderColor: 'var(--rd-line)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--rd-green)' }}>Paid</span>
                <span style={cellStyle}>₹{totals.paid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--rd-gold-2)' }}>Pending</span>
                <span style={cellStyle}>₹{totals.pending.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--rd-red)' }}>Failed</span>
                <span style={cellStyle}>₹{totals.failed.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StaffTab({ sessionToken }: { sessionToken: string }) {
  const [staffList, setStaffList] = useState<StaffMember[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStaffList(sessionToken)
      .then(setStaffList)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load staff.'))
  }, [sessionToken])

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
          {error}
        </p>
      )}
      {!staffList && !error && <p style={{ color: 'var(--rd-muted)' }}>Loading staff…</p>}
      {staffList && (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--rd-line)' }}>
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead>
              <tr style={{ background: 'var(--rd-panel)' }}>
                {['Name', 'Code', 'Role', 'Status'].map((h) => (
                  <th key={h} className="border-b px-3 py-2 font-semibold" style={mutedCellStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id}>
                  <td className="border-b px-3 py-2" style={cellStyle}>
                    {s.staffName}
                  </td>
                  <td className="border-b px-3 py-2 tracking-widest" style={cellStyle}>
                    {s.code}
                  </td>
                  <td className="border-b px-3 py-2" style={mutedCellStyle}>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={
                        s.isAdmin
                          ? { background: 'rgba(215,173,82,0.15)', color: 'var(--rd-gold-2)' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'var(--rd-muted)' }
                      }
                    >
                      {s.isAdmin ? 'Admin' : 'Staff'}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2" style={mutedCellStyle}>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={
                        s.active
                          ? { background: 'rgba(85,212,138,0.15)', color: 'var(--rd-green)' }
                          : { background: 'rgba(232,107,114,0.15)', color: 'var(--rd-red)' }
                      }
                    >
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CheckinLogTab({ sessionToken }: { sessionToken: string }) {
  const [events, setEvents] = useState<CheckinLogEvent[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCheckinLog(sessionToken)
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the check-in log.'))
  }, [sessionToken])

  const filtered = useMemo(() => {
    if (!events) return []
    const q = search.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.guestName.toLowerCase().includes(q) ||
        e.guestPhone.toLowerCase().includes(q) ||
        e.staffName.toLowerCase().includes(q) ||
        e.bookingCode.toLowerCase().includes(q),
    )
  }, [events, search])

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
          {error}
        </p>
      )}

      <input
        placeholder="Search guest, phone, staff or booking code"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
        style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
      />

      {!events && !error && <p style={{ color: 'var(--rd-muted)' }}>Loading check-in log…</p>}

      {events && (
        <>
          <p className="mb-2 text-xs" style={{ color: 'var(--rd-muted)' }}>
            {filtered.length} of {events.length} check-in(s)
          </p>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--rd-line)' }}>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--rd-panel)' }}>
                  {['When', 'Event date', 'Guest', 'Phone', 'Ticket type', 'Booking code', 'Qty', 'Staff'].map((h) => (
                    <th key={h} className="border-b px-3 py-2 font-semibold" style={mutedCellStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="border-b px-3 py-2" style={mutedCellStyle}>
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="border-b px-3 py-2" style={cellStyle}>
                      {e.eventDate}
                    </td>
                    <td className="border-b px-3 py-2" style={cellStyle}>
                      {e.guestName}
                    </td>
                    <td className="border-b px-3 py-2" style={cellStyle}>
                      {e.guestPhone}
                    </td>
                    <td className="border-b px-3 py-2" style={cellStyle}>
                      {e.ticketType}
                    </td>
                    <td className="border-b px-3 py-2" style={mutedCellStyle}>
                      {e.bookingCode}
                    </td>
                    <td className="border-b px-3 py-2" style={cellStyle}>
                      {e.quantity}
                    </td>
                    <td className="border-b px-3 py-2" style={{ color: 'var(--rd-gold-2)' }}>
                      {e.staffName}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center" style={mutedCellStyle}>
                      No check-ins match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardContent() {
  const { staff, logout } = useStaffSession()
  const [tab, setTab] = useState<Tab>('checkin')

  if (!staff) return null

  return (
    <div className="rd-page">
      <StaffHeader staffName={staff.staffName} isAdmin={staff.isAdmin} onLogout={logout} />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="rd-heading mb-1 text-2xl" style={{ color: 'var(--rd-text)' }}>
          Admin dashboard
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--rd-muted)' }}>
          Check-in gates, staff codes, bookings and the check-in activity log, all in one place.
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <TabButton key={t.id} active={tab === t.id} label={t.label} onClick={() => setTab(t.id)} />
          ))}
        </div>

        {tab === 'checkin' && <CheckinDatesPanel />}
        {tab === 'bookings' && <BookingsTab sessionToken={staff.sessionToken} />}
        {tab === 'staff' && <StaffTab sessionToken={staff.sessionToken} />}
        {tab === 'log' && <CheckinLogTab sessionToken={staff.sessionToken} />}
      </div>
    </div>
  )
}

function NotAdmin() {
  return (
    <div className="rd-page flex min-h-screen items-center justify-center px-6 text-center">
      <p style={{ color: 'var(--rd-muted)' }}>Only an admin staff code can view this page.</p>
    </div>
  )
}

export function AdminDashboard() {
  const { staff } = useStaffSession()
  if (!staff) return <StaffLoginForm subtitle="Admin sign-in required." />
  if (!staff.isAdmin) return <NotAdmin />
  return <DashboardContent />
}
