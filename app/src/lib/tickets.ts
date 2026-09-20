import { supabase } from './supabaseClient'
import type { MyTicket, Order, Ticket, TicketType } from '../types/db'

const QR_BUCKET = 'qr-codes'

export function qrPublicUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(QR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// PostgREST embeds `tickets` as a single object, not an array, because
// tickets.order_id is UNIQUE - it detects a one-to-one relationship
// rather than the usual one-to-many. (Confirmed against a real response:
// "tickets": {...}, not "tickets": [...].)
type OrderWithTicket = Order & { tickets: Ticket | null }

export async function fetchMyTickets(): Promise<MyTicket[]> {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, tickets(*)')
    .eq('payment_status', 'PAID')
    .order('created_at', { ascending: false })

  if (ordersError) throw ordersError
  if (!orders || orders.length === 0) return []

  const rows = orders as unknown as OrderWithTicket[]
  const ticketTypeIds = [...new Set(rows.map((o) => o.ticket_type_id))]

  const { data: ticketTypes, error: typesError } = await supabase
    .from('ticket_types')
    .select('*')
    .in('id', ticketTypeIds)

  if (typesError) throw typesError

  const typeById = new Map<string, TicketType>((ticketTypes ?? []).map((t) => [t.id, t]))

  return rows
    .filter((order) => order.tickets != null)
    .map((order) => {
      const ticket = order.tickets!
      const ticketType = typeById.get(order.ticket_type_id)!
      return {
        order,
        ticket,
        ticketType,
        qrImageUrl: qrPublicUrl(ticket.qr_image_path),
      }
    })
}

export async function fetchTicketByBookingCode(bookingCode: string): Promise<MyTicket | null> {
  const tickets = await fetchMyTickets()
  return tickets.find((t) => t.order.booking_code === bookingCode) ?? null
}
