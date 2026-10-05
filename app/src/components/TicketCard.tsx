import venueQr from '../assets/venue-location-qr.png'
import { VENUE_MAPS_URL, VENUE_NAME } from '../lib/venue'
import type { MyTicket, TicketType } from '../types/db'

type Theme = 'garba' | 'dj' | 'kids'

const NIGHT_NAMES: Record<string, string> = {
  '2026-10-16': 'Dandiya Night',
  '2026-10-17': 'Bollywood DJ Night',
}

function isKids(ticketType: TicketType): boolean {
  return ticketType.label.toLowerCase().includes('kids')
}

// Old code picked a theme per rendered date instance; a MyTicket here is
// one row per order (which can cover multiple dates), so this collapses
// to: kids tickets always get the kids theme, a single 17th-only ticket
// (Bollywood DJ Night) gets the DJ theme, everything else (16th-only or
// multi-day) is garba.
function getTheme(ticketType: TicketType, eventDates: string[]): Theme {
  if (isKids(ticketType)) return 'kids'
  if (eventDates.length === 1 && eventDates[0] === '2026-10-17') return 'dj'
  return 'garba'
}

function getAdmitText(ticketType: TicketType): string {
  if (isKids(ticketType)) return 'KIDS ENTRY'
  if (ticketType.unit_size === 2) return 'ADMIT 02'
  if (ticketType.unit_size === 5) return 'ADMIT 05'
  return 'ADMIT 01'
}

// Sits directly under the big "RAAS" title (see ticket-title below), so
// it reads as "RAAS" + the night's name.
function getScriptText(theme: Theme): string {
  if (theme === 'kids') return 'Kids Garba'
  if (theme === 'dj') return 'Bollywood DJ Night'
  return 'Dandiya Night'
}

function formatDateLabel(dates: string[]): string {
  const formatted = dates.map((d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  )
  const year = new Date(dates[0] + 'T00:00:00').getFullYear()
  return `${formatted.join(' & ')} ${year}`
}

export function TicketCard({ order, ticketType, qrImageUrl }: MyTicket) {
  const theme = getTheme(ticketType, order.event_dates)
  const admitText = getAdmitText(ticketType)
  const scriptText = getScriptText(theme)
  const dateLabel = formatDateLabel(order.event_dates)
  const nightName = order.event_dates.length === 1 ? NIGHT_NAMES[order.event_dates[0]] : 'Both Nights'
  const totalGuests = order.quantity * ticketType.unit_size

  return (
    <div className="ticket-pair">
      <article className={`ticket front ${theme}`}>
        <span className="ticket-hole left" />
        <span className="ticket-hole right" />
        <span className="ticket-notch left" />
        <span className="ticket-notch right" />
        <div className="ticket-pattern" />

        <div className="ticket-top">
          <div className="ticket-logo">RAAS GARBA · BY AK</div>
          <div className="ticket-ornament">✦ ✧ ✦</div>
          <h3 className="ticket-title">RAAS</h3>
          <div className="ticket-script">{scriptText}</div>
          <div className="ticket-event-date">
            {dateLabel}
            <small>{nightName}</small>
          </div>
        </div>

        <div className="ticket-art-visual" />

        <div className="ticket-info-panel">
          <div className="ticket-info-head">
            <span className="admit-pill">{admitText}</span>
            <div className="ticket-booking">
              Booking ID
              <b>{order.booking_code}</b>
            </div>
          </div>

          <div className="ticket-fields">
            <div className="ticket-field">
              <small>Ticket Type</small>
              <b>{ticketType.label}</b>
            </div>
            <div className="ticket-field">
              <small>Valid Date</small>
              <b>{dateLabel}</b>
            </div>
            <div className="ticket-field">
              <small>Quantity</small>
              <b>
                {order.quantity} ({totalGuests} guest{totalGuests > 1 ? 's' : ''})
              </b>
            </div>
            <div className="ticket-field">
              <small>Band</small>
              <b>{ticketType.band_colour}</b>
            </div>
            <div className="ticket-field">
              <small>Entry</small>
              <b>5:00 PM – 10:00 PM</b>
            </div>
            <div className="ticket-field">
              <small>Status</small>
              <b>{order.payment_status}</b>
            </div>
          </div>

          <div className="ticket-qr-block">
            <div className="ticket-qr-copy">
              <strong>Scan for entry</strong>
              Unique secure QR
              <br />
              Keep this ticket ready at the entrance.
            </div>
            <div className="qr">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt={`Entry QR for booking ${order.booking_code}`} />
              ) : (
                <span style={{ fontSize: 9, color: '#948a80', textAlign: 'center' }}>
                  QR not ready yet
                </span>
              )}
            </div>
          </div>

          <div className="ticket-private">Keep this ticket private · Do not share publicly</div>
        </div>
      </article>

      <article className={`ticket back ${theme}`}>
        <span className="ticket-hole left" />
        <span className="ticket-hole right" />
        <span className="ticket-notch left" />
        <span className="ticket-notch right" />
        <div className="ticket-pattern" />

        <div className="back-inner">
          <div className="back-logo">RAAS GARBA · BY AK</div>
          <div className="back-script">
            {theme === 'kids' ? (
              <>
                Little Dancer&rsquo;s
                <br />
                Big Vibes
              </>
            ) : theme === 'dj' ? (
              'Good Vibes Only'
            ) : (
              "Let's Dandiya!"
            )}
          </div>
          <div className="back-tag">Music · Dance · Energy · Together</div>

          <div className="back-divider" />
          <div className="back-heading">Event Information</div>
          <div className="back-line">
            <span className="back-line-label">Date</span>
            {dateLabel} — {nightName}
          </div>
          <div className="back-line">
            <span className="back-line-label">Time</span>
            5:00 PM – 10:00 PM
          </div>

          <div className="venue-art">{theme === 'dj' ? '🎧' : theme === 'kids' ? '🎪' : '🏛️'}</div>

          {/* Same venue-card pattern as the Landing page and /book: pin,
              VENUE label, name, subtitle, QR - kept as one standard
              instead of the plain text line + separate decorative block
              this used to be split across. */}
          <div className="back-venue-card">
            <span className="back-venue-pin">⌖</span>
            <div className="back-venue-copy">
              <small>Venue</small>
              <strong>{VENUE_NAME}</strong>
              <span>Vijayapura · Scan for directions</span>
            </div>
            <a
              href={VENUE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="venue-mini-qr"
              aria-label={`Open ${VENUE_NAME} in Google Maps`}
            >
              <img src={venueQr} alt="" />
            </a>
          </div>

          <div className="back-divider" />
          <div className="back-heading">Important</div>
          <div className="back-line">▸ Carry a valid ID proof.</div>
          <div className="back-line">▸ Please arrive 30 minutes before the event.</div>
          <div className="back-line">▸ No re-entry once you exit.</div>

          <div className="back-footer">
            RAAS GARBA
            <br />
            Present this ticket at the entrance
          </div>
        </div>
      </article>
    </div>
  )
}
