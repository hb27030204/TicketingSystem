import { Link, useLocation } from 'react-router-dom'

import { PRIMARY_CONTACT_NUMBER } from '../lib/venue'
import '../styles/nav.css'
import { AccountMenu } from './AccountMenu'
import { PhoneIcon } from './PhoneIcon'

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
        RAAS <span>GARBA</span>
      </Link>
      <div className="rd-nav-actions">
        <a href={`tel:+91${PRIMARY_CONTACT_NUMBER}`} className="rd-nav-call" aria-label="Call us">
          <PhoneIcon size={15} />
        </a>
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
