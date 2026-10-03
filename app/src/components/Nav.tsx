import { Link, useLocation } from 'react-router-dom'

import '../styles/nav.css'
import { AccountMenu } from './AccountMenu'

interface NavProps {
  // My Tickets hides this itself while the visitor has no tickets yet,
  // putting an equivalent button next to its own "no tickets" message
  // instead - showing both would be redundant on that page.
  hideBookCta?: boolean
}

export function Nav({ hideBookCta = false }: NavProps) {
  const location = useLocation()
  const onBookingPage = location.pathname === '/book'

  return (
    <nav className={`rd-nav${onBookingPage ? '' : ' rd-nav-sticky'}`}>
      <Link to="/" className="rd-nav-brand">
        RAAS GARBA <span>X DANDIYA 2.0</span>
      </Link>
      <div className="rd-nav-actions">
        {!onBookingPage && !hideBookCta && (
          <Link to="/book" className="rd-nav-book">
            Book a ticket
          </Link>
        )}
        <AccountMenu />
      </div>
    </nav>
  )
}
