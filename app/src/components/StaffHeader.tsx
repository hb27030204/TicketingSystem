import { Link, useLocation } from 'react-router-dom'

// A lighter cousin of Nav for the staff/admin surface - staff sign in with
// a shared code rather than a Supabase Auth session, so this can't reuse
// Nav/AccountMenu (which are wired to the customer auth context). Kept
// visually consistent with it instead: same brand mark, same rd-* tokens.
export function StaffHeader({
  staffName,
  isAdmin,
  onLogout,
}: {
  staffName?: string
  isAdmin?: boolean
  onLogout?: () => void
}) {
  const location = useLocation()
  const onDashboard = location.pathname === '/staff/dashboard'

  return (
    <div className="flex items-center justify-between border-b px-4 py-4 sm:px-8" style={{ borderColor: 'var(--rd-line)' }}>
      <span className="text-xs font-extrabold uppercase tracking-[2.4px]" style={{ color: 'var(--rd-text)' }}>
        RAAS <span style={{ color: 'var(--rd-gold-2)' }}>DANDYA</span>
      </span>
      {staffName && (
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to={onDashboard ? '/staff' : '/staff/dashboard'}
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--rd-gold-2)' }}
            >
              {onDashboard ? '← Check-in' : 'Dashboard'}
            </Link>
          )}
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
            {staffName}
          </span>
          {onLogout && (
            <button type="button" onClick={onLogout} className="text-xs underline" style={{ color: 'var(--rd-muted)' }}>
              Log out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
