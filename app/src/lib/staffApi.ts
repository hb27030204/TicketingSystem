import { invokeFunction } from './functions'

export interface CheckInSummary {
  success: boolean
  message?: string
  dates: {
    eventDate: string
    paid: number
    checkedIn: number
    capacity: number
    checkinEnabled: boolean
  }[]
}

export async function fetchStaffSummary(sessionToken: string): Promise<CheckInSummary> {
  const data = await invokeFunction<CheckInSummary>('staff-summary', { session_token: sessionToken })
  if (!data.success) throw new Error(data.message || 'Could not load the dashboard.')
  return data
}

export async function setCheckinEnabled(
  sessionToken: string,
  eventDate: string,
  enabled: boolean,
): Promise<void> {
  const data = await invokeFunction<{ success: boolean; message?: string }>('set-checkin-enabled', {
    session_token: sessionToken,
    event_date: eventDate,
    enabled,
  })
  if (!data.success) throw new Error(data.message || 'Could not update check-in status.')
}

export interface TicketForCheckin {
  success: boolean
  result: 'READY' | 'NOT_PAID' | 'INVALID'
  message?: string
  ticket?: {
    bookingCode: string
    name: string
    ticketTypeLabel: string
    bandColour: string
    totalGuests: number
    unitSize: number
    days: {
      eventDate: string
      checkedIn: number
      remaining: number
      complete: boolean
      enabled: boolean
      allowed: boolean
    }[]
  }
}

export async function getTicketForCheckin(
  sessionToken: string,
  ticketToken: string,
): Promise<TicketForCheckin> {
  return invokeFunction<TicketForCheckin>('get-ticket-for-checkin', {
    session_token: sessionToken,
    ticket_token: ticketToken,
  })
}

export interface CheckinResult {
  success: boolean
  result: 'VALID' | 'TOO_MANY' | 'ALREADY_USED' | 'WRONG_DATE' | 'NOT_PAID' | 'INVALID' | 'CHECKIN_CLOSED'
  message?: string
  checkedIn?: number
  remaining?: number
  totalGuests?: number
}

export async function performCheckin(
  sessionToken: string,
  ticketToken: string,
  eventDate: string,
  quantity: number,
): Promise<CheckinResult> {
  return invokeFunction<CheckinResult>('checkin', {
    session_token: sessionToken,
    ticket_token: ticketToken,
    event_date: eventDate,
    quantity,
  })
}

export interface Booking {
  orderId: string
  bookingCode: string
  name: string
  email: string
  phone: string
  isOffline: boolean
  ticketType: string
  quantity: number
  amount: number
  eventDates: string[]
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  ticketStatus: string | null
  emailStatus: string | null
  createdAt: string
}

export async function fetchBookings(sessionToken: string): Promise<Booking[]> {
  const data = await invokeFunction<{ success: boolean; bookings: Booking[]; message?: string }>(
    'admin-bookings',
    { session_token: sessionToken },
  )
  if (!data.success) throw new Error(data.message || 'Could not load bookings.')
  return data.bookings
}

export interface StaffMember {
  id: string
  code: string
  staffName: string
  isAdmin: boolean
  active: boolean
  createdAt: string
}

export async function fetchStaffList(sessionToken: string): Promise<StaffMember[]> {
  const data = await invokeFunction<{ success: boolean; staff: StaffMember[]; message?: string }>(
    'admin-staff-list',
    { session_token: sessionToken },
  )
  if (!data.success) throw new Error(data.message || 'Could not load staff.')
  return data.staff
}

export interface CheckinLogEvent {
  id: string
  eventDate: string
  quantity: number
  createdAt: string
  staffName: string
  guestName: string
  guestPhone: string
  bookingCode: string
  ticketType: string
}

export async function fetchCheckinLog(sessionToken: string): Promise<CheckinLogEvent[]> {
  const data = await invokeFunction<{ success: boolean; events: CheckinLogEvent[]; message?: string }>(
    'admin-checkin-log',
    { session_token: sessionToken },
  )
  if (!data.success) throw new Error(data.message || 'Could not load the check-in log.')
  return data.events
}
