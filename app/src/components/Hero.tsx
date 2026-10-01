import type { MouseEvent } from 'react'

function scrollToBooking(e: MouseEvent) {
  e.preventDefault()
  document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Hero() {
  return (
    <header className="relative overflow-hidden px-4 pb-16 pt-14 text-center sm:pt-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <span
          className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium tracking-wide"
          style={{ borderColor: 'var(--rd-line)', color: 'var(--rd-gold-2)' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--rd-green)', boxShadow: '0 0 0 3px rgba(85,212,138,0.25)' }}
          />
          Bookings open
        </span>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[3px]" style={{ color: 'var(--rd-gold)' }}>
          Raas Garbha X Dandiya 2.0 · By AK
        </p>

        <h1
          className="rd-heading text-[13vw] leading-[0.95] tracking-tight sm:text-6xl"
          style={{ color: 'var(--rd-text)' }}
        >
          Bijapur, Let&rsquo;s Dandiya!
          <span className="mt-2 block text-lg font-normal sm:text-xl" style={{ color: 'var(--rd-gold-2)' }}>
            Where the city comes to celebrate
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base" style={{ color: 'var(--rd-muted)' }}>
          Music · Dandiya · DJ · Energy · Together
        </p>

        <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
          <div
            className="rounded-xl border px-4 py-3 text-left"
            style={{ borderColor: 'var(--rd-line)', background: 'var(--rd-panel)' }}
          >
            <small className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              16 October
            </small>
            <strong style={{ color: 'var(--rd-text)' }}>RAAS GARBHA</strong>
          </div>
          <div
            className="rounded-xl border px-4 py-3 text-left"
            style={{ borderColor: 'rgba(142,91,229,0.4)', background: 'var(--rd-panel)' }}
          >
            <small className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--rd-muted)' }}>
              17 October
            </small>
            <strong style={{ color: 'var(--rd-purple)' }}>DANDIYA 2.0</strong>
          </div>
        </div>

        <a
          href="#booking"
          onClick={scrollToBooking}
          className="mt-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px]"
          style={{ color: 'var(--rd-gold-2)' }}
        >
          Scroll to choose your tickets
          <span className="animate-bounce">↓</span>
        </a>
      </div>
    </header>
  )
}
