import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { trackPageView } from '../lib/analytics'

// Renders nothing - just fires a GA pageview on every route change.
// Must live inside <BrowserRouter> to read the current location.
export function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}
