import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { invokeFunction } from '../lib/functions'

const STORAGE_KEY = 'ticketing_staff_session'

interface StaffSession {
  sessionToken: string
  staffName: string
  isAdmin: boolean
  expiresAt: string
}

interface StaffSessionContextValue {
  staff: StaffSession | null
  login: (code: string) => Promise<void>
  logout: () => void
}

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null)

function readStoredSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StaffSession
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffSession | null>(() => readStoredSession())

  useEffect(() => {
    if (!staff) return
    const msUntilExpiry = new Date(staff.expiresAt).getTime() - Date.now()
    if (msUntilExpiry <= 0) {
      setStaff(null)
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const timer = setTimeout(() => {
      setStaff(null)
      localStorage.removeItem(STORAGE_KEY)
    }, msUntilExpiry)
    return () => clearTimeout(timer)
  }, [staff])

  const value = useMemo<StaffSessionContextValue>(
    () => ({
      staff,
      async login(code) {
        const data = await invokeFunction<{
          success: boolean
          sessionToken: string
          staffName: string
          isAdmin: boolean
          expiresAt: string
          message?: string
        }>('staff-login', { code })

        if (!data.success) throw new Error(data.message || 'Login failed.')

        const session: StaffSession = {
          sessionToken: data.sessionToken,
          staffName: data.staffName,
          isAdmin: data.isAdmin,
          expiresAt: data.expiresAt,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        setStaff(session)
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY)
        setStaff(null)
      },
    }),
    [staff],
  )

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>
}

export function useStaffSession(): StaffSessionContextValue {
  const ctx = useContext(StaffSessionContext)
  if (!ctx) throw new Error('useStaffSession must be used within StaffSessionProvider')
  return ctx
}
