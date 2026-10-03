import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import dandiyaEnergyImage from '../assets/DandiyaEnergy.jpg'
import brnLogo from '../assets/brands/brn.jpeg'
import clickitUpLogo from '../assets/brands/clickitup.jpeg'
import dProductionLogo from '../assets/brands/dproduction.png'
import ecoDesignLogo from '../assets/brands/ecodesign.jpeg'
import samLogo from '../assets/brands/sam.jpeg'
import sbgLogo from '../assets/brands/sbg.jpeg'
import wowLogo from '../assets/brands/wow.jpeg'
import celebrityImage from '../assets/celebrity.jpeg'
import heroImage from '../assets/landing-hero.jpg'
import heroVideo from '../assets/landingpagevideo.mp4'
import theRaasCrowdImage from '../assets/TheRaasCrowd.jpg'
import venueFeatureVideo from '../assets/venuefeaturevideo.mp4'
import venueQr from '../assets/venue-location-qr.png'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { VENUE_MAPS_URL, VENUE_NAME } from '../lib/venue'
import '../styles/landing.css'

// No confirmed partner "role" (beverage/fashion/etc.) was given for any
// of these, so the card just shows logo + name - inventing a role tag
// would be guessing at something real sponsors could reasonably expect
// to be accurate.
const BRANDS = [
  { name: 'Sam Mehendi Art', logo: samLogo },
  { name: 'SBG Teddy Events', logo: sbgLogo },
  { name: 'D Production', logo: dProductionLogo },
  { name: 'WOW - Wardrobe Of Women', logo: wowLogo },
  { name: 'Eco Design Infra Solutions', logo: ecoDesignLogo },
  { name: 'clickitUp', logo: clickitUpLogo },
  { name: 'BRN Group - Nandi Garden & Clubhouse', logo: brnLogo },
]

const GALLERY = [
  // {
  //   n: '01',
  //   title: 'Festival Faces',
  //   sub: 'Colour · Dance · Star energy',
  //   img: 'https://static.toiimg.com/thumb/124702161.jpg?imgsize=23456&photoid=124702161&resizemode=4&width=900',
  //   alt: 'Garba festival performance',
  //   main: true,
  // },
  {
    n: '01',
    title: 'Dandiya Energy',
    sub: 'Music · Movement · Crowd',
    img: dandiyaEnergyImage,
    alt: 'Dandiya night celebration',
  },
  // {
  //   n: '02',
  //   title: 'Celebrity Moments',
  //   sub: 'Festival nights · Big energy',
  //   img: 'https://filmfare.wwmindia.com/content/2024/oct/rajkummarraoandtriptiidimri11728199224.jpg',
  //   alt: 'Celebrity Navratri celebration',
  // },
  {
    n: '02',
    title: 'The RAAS Crowd',
    sub: 'Dress up · Show up · Dance',
    img: theRaasCrowdImage,
    alt: 'Garba dancers in traditional dress',
  },
]

function PulseRibbon({ reverse = false }: { reverse?: boolean }) {
  const items = ['✦ RAAS GARBA X DANDIYA 2.0', 'VIJAYAPURA LET’S DANDIYA', '✦ 16 OCT DANDIYA NIGHT', '17 OCT BOLLYWOOD DJ NIGHT', '✦ DRESS UP', 'SHOW UP', '✦ DANCE ALL NIGHT', 'MAKE SOME NOISE']
  const doubled = [...items, ...items]
  return (
    <section className={`ld-pulse${reverse ? ' ld-pulse-reverse' : ''}`} aria-hidden="true">
      <div className="ld-pulse-track">
        {doubled.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </section>
  )
}

function BrandMarqueeSet({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="ld-brand-set" aria-hidden={hidden || undefined}>
      {BRANDS.map((b) => (
        <span className="ld-brand-item" key={b.name}>
          <span className="ld-brand-logo-badge">
            <img src={b.logo} alt={hidden ? '' : b.name} loading="lazy" />
          </span>
          <b>{b.name}</b>
        </span>
      ))}
    </div>
  )
}

// Mobile browsers (especially iOS Safari under Low Power Mode or a
// metered-connection data saver) sometimes reject the initial .play()
// call even on a muted/playsInline video. Retrying once on the next
// user interaction recovers from that instead of leaving the video
// stuck on its poster frame for the rest of the visit.
function playWhenAllowed(el: HTMLVideoElement) {
  const tryPlay = () => el.play().catch(() => {})
  tryPlay()

  const events = ['touchstart', 'pointerdown', 'scroll'] as const
  const retry = () => {
    tryPlay()
    events.forEach((event) => window.removeEventListener(event, retry))
  }
  events.forEach((event) => window.addEventListener(event, retry, { once: true, passive: true }))

  return () => events.forEach((event) => window.removeEventListener(event, retry))
}

export function Landing() {
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const venueVideoRef = useRef<HTMLVideoElement>(null)

  // autoPlay alone isn't reliable on mobile, so give it the same
  // retry-on-interaction fallback as the venue video below.
  useEffect(() => {
    const el = heroVideoRef.current
    if (!el) return
    return playWhenAllowed(el)
  }, [])

  // Below the fold on load, so the autoplay attribute alone doesn't
  // reliably start it (confirmed live: it just sits paused at frame 0
  // until something scrolls it into view or calls .play() directly) -
  // unlike the hero video, which is already on-screen at mount. Starts
  // it the moment it's actually visible instead, and pauses it again
  // off-screen rather than burning battery scrolled away.
  useEffect(() => {
    const el = venueVideoRef.current
    if (!el) return
    let cancelRetry: (() => void) | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cancelRetry = playWhenAllowed(el)
        } else {
          cancelRetry?.()
          el.pause()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => {
      cancelRetry?.()
      observer.disconnect()
    }
  }, [])

  return (
    <div className="rd-page ld-page">
      <div className="ld-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <Nav />

      <header className="ld-hero">
        <div className="ld-hero-stage">
          <div className="ld-hero-live-chip">
            <i />
            16–17 OCT · VIJAYAPURA
          </div>
          <div className="ld-hero-spark ld-hero-spark-1">✦</div>
          <div className="ld-hero-spark ld-hero-spark-2">✦</div>
          <div className="ld-hero-spark ld-hero-spark-3">✦</div>

          <video
            ref={heroVideoRef}
            className="ld-hero-image"
            src={heroVideo}
            poster={heroImage}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="RAAS Garba festival celebration"
          />

          <div className="ld-hero-sparkles" aria-hidden="true">
            <b /><b /><b /><b /><b /><b />
          </div>

          <div className="ld-hero-dates">
            <div className="ld-hero-date-card">
              <small>16 October</small>
              <strong>DANDIYA NIGHT</strong>
            </div>
            <div className="ld-hero-date-card">
              <small>17 October</small>
              <strong>BOLLYWOOD DJ NIGHT</strong>
            </div>
          </div>

          <div className="ld-hero-content">
            <span className="ld-eyebrow">{VENUE_NAME} presents</span>
            <h1>
              The Biggest <br/> Garba Event
              <span>in Vijayapura</span>
            </h1>
            <div className="ld-hero-collab">
              <p className="ld-hero-collab-label">In collaboration with</p>
              <p className="ld-hero-collab-brand">
                RAAS GARBA <b>X</b> DANDIYA 2.0
              </p>
            </div>
            <div className="ld-hero-credits">
              <div>
                <small>Managed by</small>
                <span>D Productions &amp; Ketan Dhumal</span>
              </div>
              <div>
                <small>Organised by</small>
                <span>Akshata Nayak &amp; Chinmayi</span>
              </div>
            </div>
            <Link to="/book" className="ld-hero-cta">
              Book a ticket ↗
            </Link>
          </div>

          <div className="ld-hero-marquee">
            <div className="ld-hero-marquee-track">
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i}>
                  <span>RAAS GARBA X DANDIYA 2.0</span>
                  <span>16 OCT · DANDIYA NIGHT</span>
                  <span>17 OCT · BOLLYWOOD DJ NIGHT</span>
                  <span>{VENUE_NAME.toUpperCase()}</span>
                  <span>FREE DANDIYA STICKS</span>
                  <span>LIVE MUSIC</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="ld-brand-banner" aria-label="Featured brand visuals">
        <div className="ld-brand-label">FEATURED BRANDS</div>
        <div className="ld-brand-window">
          <div className="ld-brand-track">
            <BrandMarqueeSet />
            <BrandMarqueeSet hidden />
          </div>
        </div>
      </section>

      <section className="ld-section ld-venue ld-celebrity" id="celebrity">
        <div className="ld-venue-grid">
          <div>
            <span className="ld-kicker">SOMETHING BIG IS COMING</span>
            <div className="ld-venue-title-line">
              <span>SPECIAL GUEST</span><i>✦</i><span>BIG SURPRISE</span>
            </div>
            <h2>
              Celebrity
              <br />
              <em>Moments.</em>
            </h2>
            <p className="ld-venue-lead">
              RAAS GARBA X DANDIYA 2.0 is bringing a surprise guest to the stage this year. Who it is stays under
              wraps for now — the big reveal is coming soon.
            </p>
            <div className="ld-venue-facts">
              <span><b>✦</b>SURPRISE GUEST</span>
              <span><b>✦</b>STAY TUNED</span>
              <span><b>✦</b>ANNOUNCING SOON</span>
            </div>
          </div>
          <div className="ld-venue-art-card">
            <img className="ld-venue-art-video" src={celebrityImage} alt="A special celebrity guest - reveal coming soon" />
            <div className="ld-venue-art-top">
              <span>SPECIAL GUEST</span>
            </div>
            <div className="ld-reveal-mark">?</div>
            <div className="ld-venue-art-bottom">
              <strong className="ld-reveal-label">REVEALING SOON</strong>
              <span>STAY TUNED</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-section ld-vibe" id="experience">
        <div className="ld-kicker">THE PEOPLE · THE ENERGY · THE NIGHT</div>
        <div className="ld-section-head">
          <h2>
            Come for the Dandiya.
            <br />
            <span>Stay for the madness.</span>
          </h2>
          <p>RAAS GARBA X DANDIYA 2.0 is built to feel less like an event you attend and more like a night you remember.</p>
        </div>
        <div className="ld-gallery">
          {GALLERY.map((g) => (
            <article className="ld-face-card" key={g.n}>
              <div className="ld-face-image">
                <img src={g.img} alt={g.alt} loading="lazy" />
              </div>
              <div className="ld-face-copy">
                <span>{g.n}</span>
                <strong>{g.title}</strong>
                <small>{g.sub}</small>
              </div>
            </article>
          ))}
        </div>
        <div className="ld-ticker-row" aria-hidden="true">
          <span>TURN UP</span><i>✦</i><span>SHOW UP</span><i>✦</i><span>PAIR UP</span><i>✦</i><span>DANDIYA ALL NIGHT</span><i>✦</i><span>MAKE SOME NOISE</span><i>✦</i>
        </div>
      </section>

      <section className="ld-section ld-venue" id="venue">
        <div className="ld-venue-grid">
          <div>
            <span className="ld-kicker">THE PLACE TO BE</span>
            <div className="ld-venue-title-line">
              <span>02 NIGHTS</span><i>✦</i><span>01 ICONIC VENUE</span>
            </div>
            <h2>
              See you in
              <br />
              <em>Vijayapura.</em>
            </h2>
            <p className="ld-venue-lead">
              RAAS GARBA X DANDIYA 2.0 is bringing two nights of music and celebration to <strong>Vijayapura.</strong>
            </p>
            <div className="ld-venue-location-card">
              <div className="ld-venue-pin">⌖</div>
              <div className="ld-venue-location-copy">
                <small>VENUE</small>
                <strong>{VENUE_NAME}</strong>
                <span>Vijayapura · Scan or Tap the QR for directions</span>
              </div>
              <a
                href={VENUE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ld-venue-qr"
                aria-label={`Open ${VENUE_NAME} in Google Maps`}
              >
                <img src={venueQr} alt="" />
              </a>
            </div>
            <div className="ld-venue-facts">
              <span><b>16 OCT</b>DANDIYA NIGHT</span>
              <span><b>17 OCT</b>BOLLYWOOD DJ NIGHT</span>
              <span><b>5 PM+</b>DOORS OPEN</span>
            </div>
          </div>
          <div className="ld-venue-art-card">
            <video
              ref={venueVideoRef}
              className="ld-venue-art-video"
              src={venueFeatureVideo}
              muted
              loop
              playsInline
              aria-hidden="true"
            />
            <div className="ld-venue-art-top">
              <span>{VENUE_NAME}</span>
            </div>
            <div className="ld-venue-art-bottom">
              <strong>VIJAYAPURA</strong>
              <span>THE VENUE · THE NIGHT · THE ENERGY</span>
            </div>
          </div>
        </div>
      </section>

      <PulseRibbon reverse />
      <PulseRibbon />

      <section className="ld-section ld-partners" id="sponsors">
        <div className="ld-section-head">
          <div>
            <span className="ld-kicker">THE BRANDS · THE CULTURE · THE NIGHT</span>
            <h2>
              Made for the
              <br />
              <span>brands people love.</span>
            </h2>
          </div>
        </div>
        <div className="ld-brand-grid">
          {BRANDS.map((b) => (
            <div className="ld-brand-card" key={b.name}>
              <div className="ld-brand-logo-wrap">
                <img src={b.logo} alt={b.name} loading="lazy" />
              </div>
              <strong>{b.name}</strong>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
