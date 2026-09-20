// MSG91's OTP Widget only actually delivers SMS through this client-side
// script - server-side REST calls to their plain OTP endpoints were
// confirmed this session to accept requests without ever sending a real
// message. `tokenAuth` here is the widget-specific token (safe to ship
// to the browser per MSG91's own docs - distinct from the account-wide
// MSG91_AUTH_KEY, which stays a backend-only secret used only for the
// server-side verifyAccessToken confirmation).

import { MSG91_WIDGET_ID, MSG91_WIDGET_TOKEN } from './env'

const WIDGET_SRC = 'https://verify.msg91.com/otp-provider.js'
const READY_TIMEOUT_MS = 10000
const READY_POLL_MS = 100

interface Msg91WidgetConfig {
  widgetId: string
  tokenAuth: string
  exposeMethods: boolean
  success?: (data: unknown) => void
  failure?: (error: unknown) => void
}

declare global {
  interface Window {
    initSendOTP: (config: Msg91WidgetConfig) => void
    sendOtp?: (
      identifier: string,
      onSuccess?: (data: unknown) => void,
      onFailure?: (error: unknown) => void,
    ) => void
    verifyOtp?: (
      otp: string,
      onSuccess?: (data: unknown) => void,
      onFailure?: (error: unknown) => void,
      reqId?: string,
    ) => void
  }
}

let loadPromise: Promise<void> | null = null

// initSendOTP() likely does its own async setup (fetching the widget's
// config from MSG91's servers) before actually attaching window.sendOtp/
// verifyOtp - calling initSendOTP and assuming those exist immediately
// afterward was the bug that caused sendOtp to silently no-op forever
// (optional chaining on an undefined function just does nothing, with
// no error). Polling for real readiness instead of assuming a timing.
function waitUntilReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') {
        resolve()
        return
      }
      if (Date.now() - start > READY_TIMEOUT_MS) {
        reject(new Error('The verification widget did not become ready in time. Please refresh and try again.'))
        return
      }
      setTimeout(check, READY_POLL_MS)
    }
    check()
  })
}

function loadWidget(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.onload = () => {
      window.initSendOTP({
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_WIDGET_TOKEN,
        exposeMethods: true,
        // The widget's own code unconditionally calls these even in
        // exposeMethods mode and throws "success callback function
        // missing !" if they're absent - confirmed live. We handle
        // success/failure via the per-call callbacks passed to
        // sendOtp/verifyOtp instead (per MSG91's own note on avoiding
        // duplicate events), so these just need to exist as no-ops.
        success: () => {},
        failure: () => {},
      })
      waitUntilReady().then(resolve, reject)
    }
    script.onerror = () => reject(new Error('Could not load the verification widget.'))
    document.body.appendChild(script)
  })

  return loadPromise
}

function widgetErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

export async function sendWidgetOtp(phone10Digit: string): Promise<void> {
  await loadWidget()
  return new Promise((resolve, reject) => {
    if (!window.sendOtp) {
      reject(new Error('The verification widget is not ready. Please refresh and try again.'))
      return
    }
    window.sendOtp(
      `91${phone10Digit}`,
      () => resolve(),
      (error) => reject(new Error(widgetErrorMessage(error, 'Could not send the code.'))),
    )
  })
}

// The exact field holding the access token in MSG91's success payload
// isn't confirmed yet (their docs page wouldn't render for fetching) -
// logging the raw response so the real shape is visible the first time
// this actually runs in a browser, and checking a few plausible field
// names defensively in the meantime.
export async function verifyWidgetOtp(otp: string): Promise<string> {
  await loadWidget()
  return new Promise((resolve, reject) => {
    if (!window.verifyOtp) {
      reject(new Error('The verification widget is not ready. Please refresh and try again.'))
      return
    }
    window.verifyOtp(
      otp,
      (data) => {
        console.log('MSG91 verifyOtp success payload:', data)
        const record = (data ?? {}) as Record<string, unknown>
        const accessToken =
          record['access-token'] ?? record.accessToken ?? record.token ?? record.message
        if (typeof accessToken !== 'string' || !accessToken) {
          reject(new Error('Verification succeeded but no access token was found in the response.'))
          return
        }
        resolve(accessToken)
      },
      (error) => reject(new Error(widgetErrorMessage(error, 'That code is invalid or has expired.'))),
    )
  })
}
