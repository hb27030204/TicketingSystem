import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  phone: string
  name?: string
  email?: string
}

function normalizePhone(value: string): string {
  const phone = String(value || '').trim()
  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.')
  }
  return phone
}

function normalizeEmail(value: string): string {
  const email = String(value || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }
  return email
}

// Pure account-existence lookup now - MSG91's OTP Widget only actually
// delivers through its client-side JS flow (app/src/lib/msg91Widget.ts),
// which the browser calls directly, so there's no send-the-OTP step to
// do server-side at all anymore. This just tells the client whether to
// prompt for name+email before calling the widget's sendOtp.
Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const phone = normalizePhone(body.phone)

    const { data: existing, error: lookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existing) {
      return jsonResponse({ success: true, mode: 'login' })
    }

    if (!body.name?.trim() || !body.email) {
      return jsonResponse({ success: true, mode: 'needs_details' })
    }

    normalizeEmail(body.email) // validate only - not stored until verify-otp

    return jsonResponse({ success: true, mode: 'signup' })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not check this number.' },
      400,
    )
  }
})
