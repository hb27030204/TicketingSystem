// MSG91's OTP Widget only actually delivers SMS through its client-side
// JS flow (see app/src/lib/msg91Widget.ts) - server-side calls to the
// plain /api/v5/otp endpoints were confirmed this session to accept
// requests ("type":"success") without ever sending a real message or
// even appearing in MSG91's own delivery logs. The browser verifies the
// code directly with MSG91 and hands us an access token; this function
// is the one server-side call we still make, confirming that token is
// genuine before we trust it and mint a session.
//
// Endpoint + auth confirmed against a real working implementation
// (control.msg91.com/api/v5/widget/verifyAccessToken, server-only
// authkey). The exact request body field name for the token itself is
// NOT yet confirmed - MSG91's docs page wouldn't render for fetching.
// This uses `access-token` as a best guess; if verification fails with a
// real token, checking the actual field name (e.g. via the network tab
// of MSG91's own dashboard, or their support) is the first thing to fix.

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  const authKey = requiredEnv('MSG91_AUTH_KEY')

  const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'access-token': accessToken }),
  })

  const data = (await response.json().catch(() => ({}))) as { type?: string; message?: string }
  // Matching the confirmed pattern from the other two OTP Widget
  // endpoints (both return HTTP 200 regardless, encoding success/failure
  // only in `type`) rather than trusting the HTTP status alone.
  return data.type === 'success'
}
