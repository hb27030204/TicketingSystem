import { fetchFirstCapturedPayment, fetchRazorpayOrderStatus } from '../_shared/razorpay.ts'
import { handleOptions, jsonResponse } from '../_shared/cors.ts'
import { requireStaffSession } from '../_shared/staffAuth.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

interface Body {
  session_token: string
}

interface CandidateRow {
  id: string
  booking_code: string
  amount: number
  razorpay_order_id: string
  created_at: string
  profiles: { full_name: string; phone: string; email: string } | null
  ticket_types: { label: string } | null
}

// Limits how many Razorpay requests run at once - these PENDING orders
// only grow over time (most are normal abandoned carts that will never
// change), so this needs to stay safe to run against a few hundred rows
// without bursting past Razorpay's rate limits.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const admin = supabaseAdmin()

  try {
    const body = (await req.json()) as Body
    const staff = await requireStaffSession(admin, body.session_token)

    if (!staff.isAdmin) {
      return jsonResponse({ success: false, message: 'Only an admin staff code can do this.' }, 403)
    }

    const { data, error } = await admin
      .from('orders')
      .select(
        'id, booking_code, amount, razorpay_order_id, created_at, ' +
          'profiles(full_name, phone, email), ticket_types(label)',
      )
      .eq('payment_status', 'PENDING')
      .is('razorpay_payment_id', null)
      .not('razorpay_order_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    const candidates = (data ?? []) as unknown as CandidateRow[]

    const checked = await mapWithConcurrency(candidates, 8, async (order) => {
      try {
        const rzpStatus = await fetchRazorpayOrderStatus(order.razorpay_order_id)
        return { order, rzpStatus, error: null as string | null }
      } catch (err) {
        return { order, rzpStatus: null, error: err instanceof Error ? err.message : 'Lookup failed.' }
      }
    })

    const paidButUnlinked = checked.filter((row) => row.rzpStatus?.status === 'paid')

    const withPaymentDetails = await mapWithConcurrency(paidButUnlinked, 8, async ({ order, rzpStatus }) => {
      const payment = await fetchFirstCapturedPayment(order.razorpay_order_id).catch(() => null)
      return {
        orderId: order.id,
        bookingCode: order.booking_code,
        name: order.profiles?.full_name ?? '',
        phone: order.profiles?.phone ?? '',
        email: order.profiles?.email ?? '',
        ticketType: order.ticket_types?.label ?? '',
        amount: order.amount,
        amountPaidOnRazorpay: rzpStatus!.amountPaid,
        razorpayOrderId: order.razorpay_order_id,
        razorpayPaymentId: payment?.id ?? null,
        paymentMethod: payment?.method ?? null,
        createdAt: order.created_at,
      }
    })

    const lookupErrors = checked.filter((row) => row.error).length

    return jsonResponse({
      success: true,
      checkedCount: candidates.length,
      lookupErrors,
      mismatches: withPaymentDetails,
    })
  } catch (err) {
    return jsonResponse(
      { success: false, message: err instanceof Error ? err.message : 'Could not check for unlinked payments.' },
      400,
    )
  }
})
