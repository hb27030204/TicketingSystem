function keys() {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured.')
  }
  return { keyId, keySecret }
}

export interface RazorpayOrder {
  id: string
}

export async function createRazorpayOrder(input: {
  amountPaise: number
  receipt: string
  notes: Record<string, string>
}): Promise<RazorpayOrder & { keyId: string }> {
  const { keyId, keySecret } = keys()

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to create Razorpay order.')
  }

  const order = (await response.json()) as RazorpayOrder
  if (!order.id) {
    throw new Error('Razorpay did not return an order ID.')
  }

  return { ...order, keyId }
}

export async function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<boolean> {
  const { keySecret } = keys()

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${razorpayOrderId}|${razorpayPaymentId}`),
  )

  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return expected.toLowerCase() === signature.toLowerCase()
}
