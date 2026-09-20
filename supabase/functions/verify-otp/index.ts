import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { internalAuthEmail, mintSession } from '../_shared/authSession.ts'
import { verifyAccessToken } from '../_shared/msg91Otp.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  phone: string
  accessToken: string
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

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const phone = normalizePhone(body.phone)
    const accessToken = String(body.accessToken || '').trim()

    if (!accessToken) {
      return jsonResponse({ success: false, message: 'Missing verification token.' }, 400)
    }

    // The browser already verified the code directly with MSG91's widget
    // (see app/src/lib/msg91Widget.ts) - this confirms that verification
    // is genuine before we trust it.
    const verified = await verifyAccessToken(accessToken)
    if (!verified) {
      return jsonResponse({ success: false, message: 'That code is invalid or has expired.' }, 401)
    }

    const { data: existing, error: lookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!existing) {
      // First time this phone has completed a code - create the account
      // now (not in request-otp), so an abandoned attempt never leaves
      // a partial record.
      const name = body.name?.trim()
      if (!name || !body.email) {
        return jsonResponse(
          { success: false, message: 'Enter your name and email to finish creating your account.' },
          400,
        )
      }
      const email = normalizeEmail(body.email)

      const { error: createError } = await admin.auth.admin.createUser({
        phone: `+91${phone}`,
        phone_confirm: true,
        email: internalAuthEmail(phone),
        email_confirm: true,
        user_metadata: { full_name: name, real_email: email },
      })

      if (createError) {
        throw new Error(createError.message || 'Could not create your account.')
      }
    }

    const session = await mintSession(admin, internalAuthEmail(phone))

    return jsonResponse({
      success: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not verify the code.' },
      400,
    )
  }
})
