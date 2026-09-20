import type { VercelRequest, VercelResponse } from '@vercel/node'

// Razorpay's *redirect* checkout mode (used for restricted iOS in-app
// browsers, see src/lib/razorpay.ts) POSTs form-encoded payment results
// here instead of calling a JS handler. Vercel serves static SPA routes
// for everything else, so this is the one bit of real backend surface
// that has to live outside Supabase: it just relays the POST into a GET
// redirect the SPA's /checkout/success route can read and verify.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const bookingCode = String(req.query.bookingCode || '')
  const body = req.body as Record<string, string>

  const params = new URLSearchParams({
    bookingCode,
    razorpay_payment_id: body.razorpay_payment_id || '',
    razorpay_order_id: body.razorpay_order_id || '',
    razorpay_signature: body.razorpay_signature || '',
  })

  res.writeHead(302, { Location: `/checkout/success?${params.toString()}` })
  res.end()
}
