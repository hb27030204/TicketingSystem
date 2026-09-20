import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

import { sendTicketLinkEmail } from './msg91Email.ts'

function siteUrl(): string {
  const url = Deno.env.get('SITE_URL')
  if (!url) throw new Error('SITE_URL is not configured.')
  return url.replace(/\/$/, '')
}

// Shared by verify-payment (fires right after a successful payment) and
// the standalone send-ticket-email function (manual resend). Mirrors the
// old sendTicketEmail_/resendTicketEmail split from the Apps Script
// version: one delivery routine, two callers.
export async function sendTicketEmailForTicket(
  admin: SupabaseClient,
  ticketId: string,
): Promise<void> {
  const { data: ticket, error: ticketError } = await admin
    .from('tickets')
    .select('id, user_id, order_id, orders(booking_code), profiles(email, full_name)')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    throw new Error('Ticket not found.')
  }

  const bookingCode = (ticket.orders as unknown as { booking_code: string }).booking_code
  const profile = ticket.profiles as unknown as { email: string; full_name: string | null }
  const link = `${siteUrl()}/ticket/${bookingCode}`

  try {
    await sendTicketLinkEmail(profile.email, profile.full_name || 'Guest', link)
    await admin
      .from('tickets')
      .update({ email_status: 'SENT', email_sent_at: new Date().toISOString(), email_error: null })
      .eq('id', ticketId)
  } catch (err) {
    await admin
      .from('tickets')
      .update({
        email_status: 'FAILED',
        email_error: err instanceof Error ? err.message : String(err),
      })
      .eq('id', ticketId)
    throw err
  }
}
