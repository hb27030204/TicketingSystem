import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import dancersBlueSkyImage from '../assets/gallery/dancers-blue-sky.jpg'
import dancersGroupImage from '../assets/gallery/dancers-group.jpg'
import dancersSeatedImage from '../assets/gallery/dancers-seated.jpg'
import dancersSkirtsImage from '../assets/gallery/dancers-skirts.jpg'
import dandiyaEnergyImage from '../assets/DandiyaEnergy.jpg'
import dandiyaSticksImage from '../assets/gallery/dandiya-sticks.webp'
import nandiLogo from '../assets/brands/nandi.jpg'
import clickitUpLogo from '../assets/brands/clickitup.jpeg'
import dProductionLogo from '../assets/brands/dproduction.jpg'
import ecoDesignLogo from '../assets/brands/ecodesign.jpeg'
import samLogo from '../assets/brands/sam.jpeg'
import sbgLogo from '../assets/brands/sbg.jpeg'
import wowLogo from '../assets/brands/wow.jpeg'
import celebrityImage from '../assets/celebrity.jpeg'
import heroImage from '../assets/landing-hero.jpg'
import venueQr from '../assets/venue-location-qr.png'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { VENUE_MAPS_URL, VENUE_NAME } from '../lib/venue'
import '../styles/landing.css'

// No confirmed partner "role" (beverage/fashion/etc.) was given for any
// of these, so the card just shows logo + name - inventing a role tag
// would be guessing at something real sponsors could reasonably expect
// to be accurate.
// `bg` is the logo panel colour on the sponsors wall. The current files
// are flat JPEGs (not transparent), so each panel matches the logo's own
// background to make the image edge disappear. Swap in a brand gradient
// here if a transparent PNG replaces the logo later.
// Order here is the display order everywhere (brand strip + sponsors wall).
const BRANDS = [
  { name: 'Eco Design Infra Solutions', logo: ecoDesignLogo, bg: '#ffffff' },
  // { name: 'D Production', logo: dProductionLogo, bg: '#000000' },
  { name: 'Sri Nandi Garden & Clubhouse', logo: nandiLogo, bg: '#f1f2ed' },
  { name: 'clickitUp', logo: clickitUpLogo, bg: '#ffffff' },
  { name: 'WOW - Wardrobe Of Women', logo: wowLogo, bg: '#f2eee5' },
  { name: 'Sam Mehendi Art', logo: samLogo, bg: '#000000' },
  { name: 'SBG Teddy Events', logo: sbgLogo, bg: '#010005' },
]

// Background-style YouTube embeds: muted + looped (loop needs
// playlist=<same id>), controls/branding off. pointer-events are
// disabled in CSS so they behave like background video, not a player.
function ytBackgroundSrc(id: string) {
  return (
    `https://www.youtube-nocookie.com/embed/${id}` +
    `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1` +
    `&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0`
  )
}
const VENUE_YT_SRC = ytBackgroundSrc('f8JDApNM-ig')

// Bento gallery: the first item is the tall video tile, the rest are
// photos. Grid placement comes from the `ld-face-card--N` classes in
// landing.css, so reordering here reflows the layout.
// `pos` is the object-position used to crop each photo into its tile
// (keeps faces in frame); `badge` adds a gold chip in the corner.
// A `slides` tile crossfades through its photos every SLIDE_INTERVAL_MS.
type GalleryItem = { n: string; title: string; sub: string; alt: string; badge?: string } & (
  | { kind: 'video'; src: string }
  | { kind: 'image'; img: string; pos?: string }
  | { kind: 'slides'; slides: { img: string; pos?: string }[] }
)

// How long each photo stays up on a slideshow tile before fading to the next
const SLIDE_INTERVAL_MS = 3000

const GALLERY: GalleryItem[] = [
  {
    n: '01',
    kind: 'video',
    title: 'Feel the Night',
    sub: 'Live music · Non-stop Garba',
    src: ytBackgroundSrc('p1DSzg0y0h4'),
    alt: 'Garba dancers celebrating in Vijayapura',
  },
  {
    n: '02',
    kind: 'slides',
    title: 'Dress Up, Show Up',
    sub: 'Colour · Mirror work · Twirls',
    slides: [
      { img: dancersBlueSkyImage, pos: 'center 52%' },
      { img: dancersGroupImage, pos: 'center 50%' },
      { img: dancersSkirtsImage, pos: 'center 48%' },
      { img: dancersSeatedImage, pos: 'center 47%' },
    ],
    alt: 'Three dancers in traditional chaniya choli at dusk',
  },
  {
    n: '03',
    kind: 'image',
    title: 'Dandiya Energy',
    sub: 'Music · Movement · Crowd',
    img: dandiyaEnergyImage,
    alt: 'Dandiya night celebration',
  },
  {
    n: '04',
    kind: 'image',
    title: 'Free Dandiya Sticks',
    sub: 'Available at the venue',
    img: dandiyaSticksImage,
    pos: 'center 45%',
    alt: 'A pair of decorated dandiya sticks',
    badge: 'Free',
  },
]

// Stacked photos; the active one fades in over the others. Stays on the
// first photo for visitors who ask for reduced motion.
function Slideshow({ slides, alt }: { slides: { img: string; pos?: string }[]; alt: string }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [slides.length])

  return (
    <>
      {slides.map((s, i) => (
        <img
          key={s.img}
          className={`ld-slide${i === active ? ' is-active' : ''}`}
          src={s.img}
          alt={i === active ? alt : ''}
          aria-hidden={i === active ? undefined : true}
          decoding="async"
          style={s.pos ? { objectPosition: s.pos } : undefined}
        />
      ))}
    </>
  )
}

function PulseRibbon({ reverse = false }: { reverse?: boolean }) {
  const items = ['✦ RAAS GARBA', 'VIJAYAPURA LET’S DANDIYA', '✦ 16 OCT DANDIYA NIGHT', '17 OCT BOLLYWOOD DJ NIGHT', '✦ DRESS UP', 'SHOW UP', '✦ DANCE ALL NIGHT', 'MAKE SOME NOISE']
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
          <span className="ld-brand-logo-badge" style={{ background: b.bg }}>
            <img src={b.logo} alt={hidden ? '' : b.name} loading="lazy" />
          </span>
          <b>{b.name}</b>
        </span>
      ))}
    </div>
  )
}

export function Landing() {
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

          <img className="ld-hero-poster" src={heroImage} alt="RAAS Garba festival celebration" />

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
            <h1>Vijayapura&rsquo;s Biggest Garba Event</h1>
            <div className="ld-hero-collab">
              <p className="ld-hero-collab-label">In collaboration with</p>
              <p className="ld-hero-collab-brand">
                RAAS GARBA
              </p>
            </div>
            {/* Glass credits strip: organisers first, then management */}
            <div className="ld-hero-info">
              <div className="ld-hero-credits">
                <div>
                  <small>Organised by</small>
                  <span>Akshata Nayak</span>
                </div>
                <div>
                  <small>Managed by</small>
                  <span>Sam & Sam</span>
                </div>
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
                  <span>RAAS GARBA</span>
                  <span>16 OCT · DANDIYA NIGHT</span>
                  <span>17 OCT · BOLLYWOOD DJ NIGHT</span>
                  <span>{VENUE_NAME.toUpperCase()}</span>
                  <span>DOORS OPEN 5 PM</span>
                  <span>FREE DANDIYA STICKS</span>
                  <span>LIVE MUSIC</span>
                  <span>FOOD &amp; BEVERAGES AVAILABLE</span>
                  <span>TRANSPORT FACILITY AVAILABLE</span>
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

      {/* <section className="ld-section ld-venue ld-celebrity" id="celebrity">
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
              RAAS GARBA is bringing a surprise guest to the stage this year. Who it is stays under
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
      </section> */}

      <section className="ld-section ld-vibe" id="experience">
        <div className="ld-kicker">THE PEOPLE · THE ENERGY · THE NIGHT</div>
        <div className="ld-section-head">
          <h2>
            Come for the Dandiya.
            <br />
            <span>Stay for the madness.</span>
          </h2>
          <p>RAAS GARBA is built to feel less like an event you attend and more like a night you remember.</p>
        </div>
        <div className="ld-gallery">
          {GALLERY.map((g, i) => (
            <article className={`ld-face-card ld-face-card--${i + 1}`} key={g.n}>
              <div className={`ld-face-image${g.kind === 'video' ? ' ld-yt-cover' : ''}`}>
                {g.kind === 'video' ? (
                  <iframe
                    src={g.src}
                    title={g.alt}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                    tabIndex={-1}
                  />
                ) : g.kind === 'slides' ? (
                  <Slideshow slides={g.slides} alt={g.alt} />
                ) : (
                  <img src={g.img} alt={g.alt} decoding="async" style={g.pos ? { objectPosition: g.pos } : undefined} />
                )}
              </div>
              {g.kind === 'video' && (
                <span className="ld-face-live" aria-hidden="true">
                  <i />
                  Now playing
                </span>
              )}
              {g.badge && (
                <span className="ld-face-badge" aria-hidden="true">
                  ✦ {g.badge}
                </span>
              )}
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
              RAAS GARBA is bringing two nights of music and celebration to <strong>Vijayapura.</strong>
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
            <div className="ld-venue-art-video ld-yt-cover" aria-hidden="true">
              <iframe
                src={VENUE_YT_SRC}
                title={`${VENUE_NAME} venue video`}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                tabIndex={-1}
              />
            </div>
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
        <div className="ld-partners-glow ld-partners-glow-a" aria-hidden="true" />
        <div className="ld-partners-glow ld-partners-glow-b" aria-hidden="true" />
        <div className="ld-section-head">
          <div>
            <span className="ld-kicker">THE BRANDS · THE CULTURE · THE NIGHT</span>
            <h2>
              Made for the
              <br />
              <span>brands people love.</span>
            </h2>
          </div>
          <p>
            The local names and creators helping bring <strong>RAAS GARBA</strong> to life in
            Vijayapura.
          </p>
        </div>
        <div className="ld-brand-grid">
          {BRANDS.map((b) => (
            <div className="ld-brand-card" key={b.name}>
              <div className="ld-brand-logo-wrap" style={{ background: b.bg }}>
                <img src={b.logo} alt={b.name} loading="lazy" />
              </div>
              <strong>{b.name}</strong>
              <span>FEATURED BRAND</span>
            </div>
          ))}
        </div>
        <div className="ld-brand-wall-note" aria-hidden="true">
          <i>✦</i>
          <span>THANK YOU TO OUR PARTNERS</span>
          <i>✦</i>
        </div>
      </section>

      <Footer />
    </div>
  )
}
