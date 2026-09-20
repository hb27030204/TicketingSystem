import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

import { generateQrPng, verifyQrDecodesTo } from './qr.ts'

const QR_BUCKET = 'qr-codes'

function siteUrl(): string {
  const url = Deno.env.get('SITE_URL')
  if (!url) throw new Error('SITE_URL is not configured.')
  return url.replace(/\/$/, '')
}

function generateTicketToken(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase()
}

// Creates the ticket row for a just-PAID order: a secure token, a
// self-verified QR PNG (generated, then decoded back to confirm it
// actually reads as the expected URL before anyone ever sees it), and
// the file uploaded to public storage so it can be embedded directly in
// <img> tags and the ticket-link page.
export async function issueTicketForOrder(
  admin: SupabaseClient,
  order: { id: string; user_id: string; quantity: number },
  unitSize: number,
): Promise<string> {
  const ticketToken = generateTicketToken()
  const checkinUrl = `${siteUrl()}/checkin?token=${ticketToken}`

  const qrPng = await generateQrPng(checkinUrl)
  if (!verifyQrDecodesTo(qrPng, checkinUrl)) {
    throw new Error('Generated QR failed its own readability check.')
  }

  const qrPath = `${ticketToken}.png`
  const { error: uploadError } = await admin.storage
    .from(QR_BUCKET)
    .upload(qrPath, qrPng, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    throw new Error(`Could not store QR image: ${uploadError.message}`)
  }

  const qrType = unitSize > 1 ? 'GROUP' : 'NORMAL'

  const { data: ticket, error: insertError } = await admin
    .from('tickets')
    .insert({
      order_id: order.id,
      user_id: order.user_id,
      ticket_token: ticketToken,
      qr_type: qrType,
      qr_image_path: qrPath,
      status: 'READY',
    })
    .select('id')
    .single()

  if (insertError || !ticket) {
    throw new Error(`Could not create ticket: ${insertError?.message}`)
  }

  return ticket.id as string
}
