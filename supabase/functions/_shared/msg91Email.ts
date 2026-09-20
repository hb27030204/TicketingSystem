// MSG91's templated Email API - used for the ticket-link email. OTP
// emails don't go through here at all (they go via Supabase's own
// email-OTP engine over MSG91 SMTP, see supabase/config.toml's
// [auth.email.smtp]); this is only for the one custom-branded email we
// send ourselves.
const MSG91_EMAIL_SEND_URL = 'https://control.msg91.com/api/v5/email/send'

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export async function sendTicketLinkEmail(
  toEmail: string,
  toName: string,
  link: string,
): Promise<void> {
  const authKey = requiredEnv('MSG91_AUTH_KEY')
  const templateId = requiredEnv('MSG91_TICKET_EMAIL_TEMPLATE_ID')
  const domain = requiredEnv('MSG91_TICKET_EMAIL_DOMAIN')
  const fromEmail = requiredEnv('MSG91_TICKET_EMAIL_FROM')

  const response = await fetch(MSG91_EMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipients: [
        {
          to: [{ email: toEmail, name: toName }],
          // The template body has the placeholder written as {{link}},
          // but MSG91 matches it by the bare variable name - sending the
          // key with braces included left it unmatched and blank.
          // Confirmed live: braces included rendered an empty link,
          // dropping the braces rendered the real URL correctly.
          variables: { link },
        },
      ],
      from: { email: fromEmail },
      domain,
      template_id: templateId,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MSG91 email send failed (${response.status}): ${text}`)
  }
}
