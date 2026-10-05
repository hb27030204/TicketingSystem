import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { isValidIndianMobile, useAuth } from '../hooks/useAuth'
import { sendWidgetOtp, verifyWidgetOtp } from '../lib/msg91Widget'

type Step = 'phone' | 'details' | 'otp'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/my-tickets'

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }

    setBusy(true)
    try {
      const mode = await requestOtp(phone)
      if (mode === 'needs_details') {
        setStep('details')
        return
      }
      // Returning user - the widget is what actually sends the SMS.
      await sendWidgetOtp(phone)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Enter your full name.')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.')
      return
    }

    setBusy(true)
    try {
      // Confirms this is a valid new signup server-side, then the widget
      // actually sends the SMS.
      await requestOtp(phone, name.trim(), email)
      await sendWidgetOtp(phone)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally {
      setBusy(false)
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^\d{4,6}$/.test(otp)) {
      setError('Enter the code you received by SMS.')
      return
    }

    setBusy(true)
    try {
      // The widget verifies the code directly with MSG91 and hands back
      // an access token, which our backend then confirms server-side
      // before minting a session - see supabase/functions/verify-otp.
      const accessToken = await verifyWidgetOtp(otp)
      // name/email only matter the first time (verify-otp uses them to
      // create the account) - harmless to pass always.
      await verifyOtp(phone, accessToken, name.trim() || undefined, email || undefined)
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is invalid or has expired.')
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Step, string> = {
    phone: 'Log in with your phone',
    details: 'First time here?',
    otp: 'Enter the code',
  }

  const subtitles: Record<Step, string> = {
    phone: "We'll text you a one-time code.",
    details: 'Tell us your name and email to create your account.',
    otp: 'Check your SMS for a code.',
  }

  const inputStyle = { borderColor: 'var(--rd-line)', color: 'var(--rd-text)' }
  const buttonStyle = {
    background: 'linear-gradient(120deg, var(--rd-gold), var(--rd-gold-2))',
    color: '#171216',
  }

  return (
    <div className="rd-page flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[3px]" style={{ color: 'var(--rd-gold)' }}>
          Raas Garba
        </p>
        <h1 className="rd-heading mb-1 text-center text-2xl" style={{ color: 'var(--rd-text)' }}>
          {titles[step]}
        </h1>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--rd-muted)' }}>
          {subtitles[step]}
        </p>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="flex items-center rounded-lg border" style={inputStyle}>
              <span className="px-3" style={{ color: 'var(--rd-muted)' }}>
                +91
              </span>
              <input
                inputMode="numeric"
                maxLength={10}
                autoFocus
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full rounded-r-lg bg-transparent py-3 pr-3 outline-none"
              />
            </div>
            {error && (
              <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="w-full rounded-lg py-3 font-semibold disabled:opacity-50" style={buttonStyle}>
              {busy ? 'Sending…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <input
              autoFocus
              autoComplete="name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-3 outline-none"
              style={inputStyle}
            />
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-3 outline-none"
              style={inputStyle}
            />
            {error && (
              <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="w-full rounded-lg py-3 font-semibold disabled:opacity-50" style={buttonStyle}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setError('')
              }}
              className="w-full text-sm underline"
              style={{ color: 'var(--rd-muted)' }}
            >
              Change number
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <input
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="Enter code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border bg-transparent px-3 py-3 text-center text-lg tracking-widest outline-none"
              style={inputStyle}
            />
            {error && (
              <p className="text-sm" style={{ color: 'var(--rd-red)' }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="w-full rounded-lg py-3 font-semibold disabled:opacity-50" style={buttonStyle}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setError('')
              }}
              className="w-full text-sm underline"
              style={{ color: 'var(--rd-muted)' }}
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
