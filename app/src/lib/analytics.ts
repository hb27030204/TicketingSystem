const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

let loadPromise: Promise<void> | null = null

// Lazy-loads gtag.js and initializes it with send_page_view disabled -
// this is a client-rendered SPA (react-router, no full page reloads
// between routes), so GA's default on-load pageview would only ever
// fire once for "/" and never again as the user navigates. Pageviews
// are instead sent explicitly on every route change (see trackPageView,
// wired up in App.tsx via useLocation).
function loadGtag(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false })

    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google Analytics.'))
    document.head.appendChild(script)
  })

  return loadPromise
}

// No-ops (and never loads the script) when VITE_GA_MEASUREMENT_ID isn't
// set, e.g. in local dev - analytics is optional, not core functionality
// like Supabase/Razorpay, so it should never block or crash the app.
export function trackPageView(path: string): void {
  if (!MEASUREMENT_ID) return

  loadGtag()
    .then(() => window.gtag('event', 'page_view', { page_path: path }))
    .catch(() => {})
}
