import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { invokeFunction } from '../lib/functions'
import { supabase } from '../lib/supabaseClient'

export type RequestOtpMode = 'login' | 'signup' | 'needs_details'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  requestOtp: (phone: string, name?: string, email?: string) => Promise<RequestOtpMode>
  verifyOtp: (phone: string, accessToken: string, name?: string, email?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function isValidIndianMobile(phoneDigits: string): boolean {
  return /^[6-9]\d{9}$/.test(phoneDigits)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,

      // Phone-only login: request-otp is just an account-existence lookup
      // now - the actual OTP send/verify happens client-side via MSG91's
      // widget (see lib/msg91Widget.ts, called from Login.tsx), since
      // that's the only path that actually delivers real SMS for this
      // product. This only tells the UI whether to ask for name+email.
      async requestOtp(phone, name, email) {
        const data = await invokeFunction<{ success: boolean; mode?: RequestOtpMode; message?: string }>(
          'request-otp',
          { phone, name, email },
        )
        if (!data.success) throw new Error(data.message || 'Could not check this number.')
        return data.mode ?? 'login'
      },

      // accessToken comes from the widget's verifyOtp callback (already
      // confirmed correct by MSG91 client-side) - this just has our
      // backend confirm that token server-side before minting a session.
      async verifyOtp(phone, accessToken, name, email) {
        const data = await invokeFunction<{
          success: boolean
          session?: { access_token: string; refresh_token: string }
          message?: string
        }>('verify-otp', { phone, accessToken, name, email })

        if (!data.success || !data.session) {
          throw new Error(data.message || 'That code is invalid or has expired.')
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (setSessionError) throw setSessionError
      },

      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
