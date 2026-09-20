import { useEffect, useState } from 'react'

import { useStaffSession } from '../hooks/useStaffSession'
import { fetchStaffSummary, setCheckinEnabled, type CheckInSummary } from '../lib/staffApi'

// Used both on the plain /staff welcome screen and as a tab inside
// /staff/dashboard - same data, same admin-only toggle.
export function CheckinDatesPanel() {
  const { staff } = useStaffSession()
  const [summary, setSummary] = useState<CheckInSummary | null>(null)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  async function refresh() {
    if (!staff) return
    try {
      const data = await fetchStaffSummary(staff.sessionToken)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard.')
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff])

  async function toggle(eventDate: string, enabled: boolean) {
    if (!staff) return
    setToggling(eventDate)
    setError('')
    try {
      await setCheckinEnabled(staff.sessionToken, eventDate, enabled)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update check-in status.')
    } finally {
      setToggling(null)
    }
  }

  if (!staff) return null

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--rd-red)' }}>
          {error}
        </p>
      )}

      <div className="space-y-4">
        {summary?.dates.map((d) => (
          <div
            key={d.eventDate}
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: 'var(--rd-text)' }}>
                {d.eventDate}
              </h2>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={
                  d.checkinEnabled
                    ? { background: 'rgba(85,212,138,0.15)', color: 'var(--rd-green)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--rd-muted)' }
                }
              >
                {d.checkinEnabled ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="mb-3 text-sm" style={{ color: 'var(--rd-muted)' }}>
              {d.checkedIn} checked in of {d.paid} paid ({d.capacity} capacity)
            </p>
            {staff.isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(d.eventDate, true)}
                  disabled={toggling === d.eventDate || d.checkinEnabled}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                  style={{ background: 'var(--rd-green)', color: '#062015' }}
                >
                  Open
                </button>
                <button
                  onClick={() => toggle(d.eventDate, false)}
                  disabled={toggling === d.eventDate || !d.checkinEnabled}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                  style={{ background: 'var(--rd-red)', color: '#2b0b0d' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
