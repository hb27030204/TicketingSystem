import { CheckinDatesPanel } from '../components/CheckinDatesPanel'
import { StaffHeader } from '../components/StaffHeader'
import { StaffLoginForm } from '../components/StaffLoginForm'
import { useStaffSession } from '../hooks/useStaffSession'

function Dashboard() {
  const { staff, logout } = useStaffSession()
  if (!staff) return null

  return (
    <div className="rd-page">
      <StaffHeader staffName={staff.staffName} isAdmin={staff.isAdmin} onLogout={logout} />

      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="rd-heading mb-1 text-2xl" style={{ color: 'var(--rd-text)' }}>
          Welcome, {staff.staffName}
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--rd-muted)' }}>
          Guests scanning their ticket QR will land on the check-in page automatically.
        </p>

        <CheckinDatesPanel />

        <p className="mt-8 text-center text-xs" style={{ color: 'var(--rd-muted)' }}>
          QR scanning is handled by your phone&rsquo;s normal camera — scan a ticket to open the check-in page.
        </p>
      </div>
    </div>
  )
}

export function Staff() {
  const { staff } = useStaffSession()
  return staff ? <Dashboard /> : <StaffLoginForm />
}
