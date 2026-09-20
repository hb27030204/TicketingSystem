export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'

export interface TicketType {
  id: string
  label: string
  price: number
  unit_size: number
  band_colour: string
  valid_dates: string[]
  is_multi_day: boolean
  active: boolean
}

export interface EventSetting {
  event_date: string
  checkin_enabled: boolean
  capacity: number
}

export interface Order {
  id: string
  booking_code: string
  user_id: string
  ticket_type_id: string
  event_dates: string[]
  quantity: number
  amount: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  payment_status: PaymentStatus
  created_at: string
}

export interface Ticket {
  id: string
  order_id: string
  user_id: string
  ticket_token: string
  qr_type: 'NORMAL' | 'GROUP'
  qr_image_path: string | null
  status: string
  email_status: string
  email_sent_at: string | null
  email_error: string | null
  created_at: string
}

export interface MyTicket {
  order: Order
  ticket: Ticket
  ticketType: TicketType
  qrImageUrl: string | null
}
