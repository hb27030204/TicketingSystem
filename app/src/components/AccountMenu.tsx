import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

interface Profile {
  full_name: string | null
  phone: string
  email: string
}

export function AccountMenu() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  function toggleOpen() {
    setOpen((o) => !o)
    setRevealed(false)
  }

  function close() {
    setOpen(false)
    setRevealed(false)
  }

  const primaryLabel = profile?.full_name || profile?.phone || ''

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold"
        style={{ borderColor: 'var(--rd-gold)', color: 'var(--rd-gold-2)' }}
        aria-label="Account"
      >
        {session && primaryLabel ? primaryLabel.charAt(0).toUpperCase() : '👤'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className="absolute right-0 z-20 mt-2 w-64 rounded-xl border p-3 shadow-xl"
            style={{ borderColor: 'var(--rd-gold)', background: 'var(--rd-panel)' }}
          >
            {!session ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    navigate('/login')
                  }}
                  className="w-full rounded-lg py-2 text-sm font-semibold"
                  style={{ background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))', color: '#171216' }}
                >
                  Log in
                </button>

                <div className="my-2 h-px" style={{ background: 'var(--rd-line)' }} />

                {/* Not logged in yet - RequireAuth on /my-tickets sends
                    them to /login (preserving this as the redirect
                    target) rather than gating here too. */}
                <Link
                  to="/my-tickets"
                  onClick={close}
                  className="block rounded-lg px-2 py-2 text-sm"
                  style={{ color: 'var(--rd-muted)' }}
                >
                  My Tickets
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed((r) => !r)}
                  className="w-full rounded-lg px-2 py-2 text-left"
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--rd-text)' }}>
                    {primaryLabel || 'Your account'}
                  </p>
                  {revealed && (
                    <div className="mt-1 space-y-0.5 text-xs" style={{ color: 'var(--rd-muted)' }}>
                      {profile?.full_name && <p>+91 {profile.phone}</p>}
                      <p>{profile?.email}</p>
                    </div>
                  )}
                  {!revealed && (
                    <p className="text-xs" style={{ color: 'var(--rd-muted)' }}>
                      Tap to view details
                    </p>
                  )}
                </button>

                <div className="my-2 h-px" style={{ background: 'var(--rd-line)' }} />

                <Link
                  to="/my-tickets"
                  onClick={close}
                  className="block rounded-lg px-2 py-2 text-sm"
                  style={{ color: 'var(--rd-gold-2)' }}
                >
                  My Tickets
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    close()
                    signOut()
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm"
                  style={{ color: 'var(--rd-muted)' }}
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
