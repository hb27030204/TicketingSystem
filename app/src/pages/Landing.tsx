import { Link } from 'react-router-dom'

import heroImage from '../assets/landing-hero.jpg'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import '../styles/landing.css'

const BRANDS = [
  { name: 'Coca-Cola', tag: 'BEVERAGE PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola%20logo%20white.png' },
  { name: 'Spotify', tag: 'MUSIC PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Spotify%20New%20Full%20Logo%20RGB%20Green.png' },
  { name: 'Zomato', tag: 'FOOD PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zomato-logo.png' },
  { name: 'Myntra', tag: 'FASHION PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Myntra%20Logo.png' },
  { name: 'Swiggy', tag: 'FOOD PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Swiggy%20Text%20Logo.png' },
  { name: 'boAt', tag: 'TECH PARTNER', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Boat-logo.png' },
]

const GALLERY = [
  {
    n: '01',
    title: 'Festival Faces',
    sub: 'Colour · Dance · Star energy',
    img: 'https://static.toiimg.com/thumb/124702161.jpg?imgsize=23456&photoid=124702161&resizemode=4&width=900',
    alt: 'Garba festival performance',
    main: true,
  },
  {
    n: '02',
    title: 'Dandiya Energy',
    sub: 'Music · Movement · Crowd',
    img: 'https://feeds.abplive.com/onecms/images/uploaded-images/2025/09/27/35eb9df1dba4191072317e54aa2adf5d17589811520141302_original.jpg?impolicy=abp_cdn&imwidth=1200',
    alt: 'Dandiya night celebration',
  },
  {
    n: '03',
    title: 'Celebrity Moments',
    sub: 'Festival nights · Big energy',
    img: 'https://filmfare.wwmindia.com/content/2024/oct/rajkummarraoandtriptiidimri11728199224.jpg',
    alt: 'Celebrity Navratri celebration',
  },
  {
    n: '04',
    title: 'The RAAS Crowd',
    sub: 'Dress up · Show up · Dance',
    img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Navratri%20Garba%20Dancers.jpg',
    alt: 'Garba dancers in traditional dress',
  },
]

function PulseRibbon({ reverse = false }: { reverse?: boolean }) {
  const items = ['✦ RAAS DANDYA', 'BIJAPUR LET’S DANDYA', '✦ 17 OCT DANDIYA', '18 OCT DJ GARBA', '✦ DRESS UP', 'SHOW UP', '✦ DANCE ALL NIGHT', 'MAKE SOME NOISE']
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
          <img src={b.logo} alt={hidden ? '' : b.name} loading="lazy" />
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
            17–18 OCT · BIJAPUR
          </div>
          <div className="ld-hero-spark ld-hero-spark-1">✦</div>
          <div className="ld-hero-spark ld-hero-spark-2">✦</div>
          <div className="ld-hero-spark ld-hero-spark-3">✦</div>

          <img className="ld-hero-image" src={heroImage} alt="RAAS Garba festival celebration" />

          <div className="ld-hero-sparkles" aria-hidden="true">
            <b /><b /><b /><b /><b /><b />
          </div>

          <div className="ld-hero-dates">
            <div className="ld-hero-date-card">
              <small>17 October</small>
              <strong>Dandiya Night</strong>
            </div>
            <div className="ld-hero-date-card">
              <small>18 October</small>
              <strong>DJ Garba Night</strong>
            </div>
          </div>

          <div className="ld-hero-content">
            <span className="ld-eyebrow">RAAS DANDYA · BY AK</span>
            <h1>
              Bijapur, Let&rsquo;s Dandya!
              <span>Where the city comes to celebrate</span>
            </h1>
            <p>Music · Dandya · DJ · Colour · Energy · Together</p>
            <div className="ld-hero-meta">
              <div>17 Oct · Dandiya</div>
              <div>18 Oct · DJ Garba</div>
              <div>Bijapur · Venue Details</div>
            </div>
            <Link to="/book" className="ld-hero-cta">
              Book a ticket ↗
            </Link>
          </div>

          <div className="ld-hero-marquee">
            <div className="ld-hero-marquee-track">
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i}>
                  <span>RAAS DANDYA</span>
                  <span>DANDIYA NIGHT</span>
                  <span>DJ GARBA NIGHT</span>
                  <span>17 · 18 OCTOBER 2026</span>
                  <span>BIJAPUR · VENUE DETAILS</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="ld-brand-banner" aria-label="Featured brand visuals">
        <div className="ld-brand-label">FEATURED BRANDS <span>·</span> LAUNCH VISUALS</div>
        <div className="ld-brand-window">
          <div className="ld-brand-track">
            <BrandMarqueeSet />
            <BrandMarqueeSet hidden />
          </div>
        </div>
      </section>

      <section className="ld-section ld-vibe" id="experience">
        <div className="ld-kicker">THE PEOPLE · THE ENERGY · THE NIGHT</div>
        <div className="ld-section-head">
          <h2>
            Come for the Dandya.
            <br />
            <span>Stay for the madness.</span>
          </h2>
          <p>RAAS DANDYA is built to feel less like an event you attend and more like a night you remember.</p>
        </div>
        <div className="ld-gallery">
          {GALLERY.map((g) => (
            <article className={`ld-face-card${g.main ? ' ld-face-main' : ''}`} key={g.n}>
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
          <span>TURN UP</span><i>✦</i><span>SHOW UP</span><i>✦</i><span>PAIR UP</span><i>✦</i><span>DANDYA ALL NIGHT</span><i>✦</i><span>MAKE SOME NOISE</span><i>✦</i>
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
              <em>Bijapur.</em>
            </h2>
            <p className="ld-venue-lead">
              RAAS DANDYA is bringing two nights of music, colour and celebration to <strong>Bijapur.</strong>
            </p>
            <div className="ld-venue-location-card">
              <div className="ld-venue-pin">⌖</div>
              <div>
                <small>VENUE</small>
                <strong>Bijapur · Venue Details</strong>
                <span>Official venue information will be highlighted here.</span>
              </div>
            </div>
            <div className="ld-venue-facts">
              <span><b>17 OCT</b>DANDIYA NIGHT</span>
              <span><b>18 OCT</b>DJ GARBA NIGHT</span>
              <span><b>6 PM+</b>DOORS OPEN</span>
            </div>
          </div>
          <div className="ld-venue-art-card">
            <div className="ld-venue-art-top">
              <span>RAAS DANDYA</span>
              <b>BIJAPUR</b>
            </div>
            <div className="ld-venue-monogram">R</div>
            <div className="ld-venue-ring ld-ring-a" />
            <div className="ld-venue-ring ld-ring-b" />
            <div className="ld-venue-art-bottom">
              <strong>BIJAPUR</strong>
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
          <p>
            Our launch brand wall uses popular brand visuals for now. Replace these with your{' '}
            <strong>confirmed RAAS DANDYA sponsors and collaborators</strong> before going live.
          </p>
        </div>
        <div className="ld-brand-grid">
          {BRANDS.map((b) => (
            <div className="ld-brand-card" key={b.name}>
              <div className="ld-brand-logo-wrap">
                <img src={b.logo} alt={b.name} loading="lazy" />
              </div>
              <strong>{b.name}</strong>
              <span>{b.tag}</span>
            </div>
          ))}
        </div>
        <div className="ld-brand-wall-note">
          <i>✦</i>
          <span>YOUR CONFIRMED SPONSORS GO HERE</span>
          <i>✦</i>
        </div>
      </section>

      <Footer />
    </div>
  )
}
