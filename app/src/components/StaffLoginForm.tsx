import { useState } from 'react'
import type { FormEvent } from 'react'

import { useStaffSession } from '../hooks/useStaffSession'

// Shared by /staff, /checkin and /staff/dashboard - all three gate on the
// same staff_codes-backed session, they just differ in what they show
// once signed in.
export function StaffLoginForm({ subtitle = 'Enter your staff or admin code to continue.' }: { subtitle?: string }) {
  const { login } = useStaffSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(code.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rd-page flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[3px]" style={{ color: 'var(--rd-gold)' }}>
          Raas Garba
        </p>
        <h1 className="rd-heading mb-1 text-center text-2xl" style={{ color: 'var(--rd-text)' }}>
          Staff access
        </h1>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--rd-muted)' }}>
          {subtitle}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            inputMode="numeric"
            placeholder="Staff code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border bg-transparent px-3 py-3 text-center tracking-widest outline-none"
            style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }}
          />
          {error && (
            <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-3 font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))', color: '#171216' }}
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
