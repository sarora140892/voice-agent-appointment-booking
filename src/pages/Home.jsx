import VoiceSession from '../components/VoiceSession.jsx'

export default function Home() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <Stats />
      <Features />
      <HowItWorks />
      <Security />
      <Testimonial />
      <CTA />
    </>
  )
}

/* ============================ HERO + LIVE DEMO ============================ */

function Hero() {
  return (
    <section className="section hero-section" id="demo">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Enterprise voice AI · Now generally available
          </span>
          <h1 className="hero-title">
            Appointments that book <span className="grad-text">themselves.</span>
          </h1>
          <p className="hero-sub">
            VoiceBook answers every call, understands natural speech, and confirms
            appointments in seconds — no hold music, no forms, no missed revenue.
            Deploy across your entire front office in days, not quarters.
          </p>

          <div className="hero-actions">
            <a href="#live" className="btn btn-primary btn-lg">
              Try the live demo
              <ArrowGlyph />
            </a>
            <a href="#features" className="btn btn-outline btn-lg">
              <PlayGlyph /> See how it works
            </a>
          </div>

          <ul className="hero-points">
            <li><CheckMini /> No code to get started</li>
            <li><CheckMini /> Live in under a week</li>
            <li><CheckMini /> Cancel anytime</li>
          </ul>
        </div>

        <div className="hero-demo" id="live">
          <div className="demo-frame">
            <div className="demo-frame-bar">
              <span className="demo-dots"><i /><i /><i /></span>
              <span className="demo-frame-title">
                <span className="dot-live" /> Live voice session
              </span>
              <span className="demo-frame-meta">end-to-end encrypted</span>
            </div>
            <div className="demo-frame-body">
              <VoiceSession />
            </div>
          </div>
          <div className="demo-glow" aria-hidden />
        </div>
      </div>
    </section>
  )
}

/* ============================== LOGO CLOUD ============================== */

function LogoCloud() {
  const logos = ['Northwind', 'Acme Health', 'Vertex', 'Lumen', 'Meridian', 'Brightline']
  return (
    <section className="section logo-cloud">
      <div className="container">
        <p className="logo-cloud-label">Trusted by operations teams at category leaders</p>
        <div className="logo-row">
          {logos.map((name) => (
            <span className="logo-item" key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ================================ STATS ================================ */

function Stats() {
  const stats = [
    { value: '98%', label: 'Calls resolved without a human' },
    { value: '<1s', label: 'Average response latency' },
    { value: '24/7', label: 'Coverage, every day of the year' },
    { value: '40+', label: 'Languages and dialects' },
  ]
  return (
    <section className="section stats-section">
      <div className="container stats-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-value grad-text">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* =============================== FEATURES =============================== */

function Features() {
  const features = [
    {
      icon: <WaveGlyph />,
      title: 'Natural conversation',
      body: 'A neural voice that listens, interrupts gracefully, and understands context — indistinguishable from your best front-desk agent.',
    },
    {
      icon: <CalendarGlyph />,
      title: 'Real-time scheduling',
      body: 'Reads live availability, books, reschedules, and cancels directly in the calendars your teams already use.',
    },
    {
      icon: <PlugGlyph />,
      title: 'Connects to your stack',
      body: 'Native integrations with your CRM, EHR, and telephony — plus a typed REST and webhook API for everything else.',
    },
    {
      icon: <ShieldGlyph2 />,
      title: 'Enterprise security',
      body: 'SOC 2 Type II, HIPAA, and GDPR compliant. Data is encrypted in transit and at rest with regional residency controls.',
    },
    {
      icon: <ChartGlyph />,
      title: 'Operational analytics',
      body: 'Full transcripts, intent tagging, and conversion dashboards so every conversation becomes measurable insight.',
    },
    {
      icon: <UsersGlyph />,
      title: 'Seamless handoff',
      body: 'Escalates to a live teammate with full context the moment a conversation needs a human touch.',
    },
  ]

  return (
    <section className="section features-section" id="features">
      <div className="container">
        <SectionHead
          eyebrow="Platform"
          title="Everything the front office needs, in one voice layer"
          sub="VoiceBook replaces fragmented phone trees and after-hours voicemail with a single, intelligent layer that scales with you."
        />
        <div className="feature-grid">
          {features.map((f) => (
            <article className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================= HOW IT WORKS ============================= */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Connect your calendar',
      body: 'Link your scheduling system and telephony in a guided setup. No engineering tickets required.',
    },
    {
      n: '02',
      title: 'Tune your assistant',
      body: 'Set services, hours, and tone of voice. Preview every change with the live demo before going live.',
    },
    {
      n: '03',
      title: 'Go live & scale',
      body: 'Route calls to VoiceBook and watch bookings land automatically — with full transcripts and analytics.',
    },
  ]

  return (
    <section className="section how-section" id="how">
      <div className="container">
        <SectionHead
          eyebrow="How it works"
          title="From first call to booked appointment in three steps"
          sub="A deployment path designed for operations teams, not just developers."
        />
        <div className="steps">
          {steps.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =============================== SECURITY =============================== */

function Security() {
  const items = [
    { icon: <LockGlyph2 />, title: 'Encrypted end to end', body: 'TLS 1.3 in transit, AES-256 at rest, with customer-managed keys available.' },
    { icon: <ShieldGlyph2 />, title: 'Compliance built in', body: 'SOC 2 Type II, HIPAA BAA, and GDPR with EU & US data residency.' },
    { icon: <EyeGlyph />, title: 'Full auditability', body: 'Immutable logs and role-based access for every action across your org.' },
    { icon: <ServerGlyph />, title: '99.99% uptime', body: 'Redundant, multi-region infrastructure backed by an enterprise SLA.' },
  ]

  return (
    <section className="section security-section" id="security">
      <div className="container security-grid">
        <div className="security-copy">
          <SectionHead
            align="left"
            eyebrow="Trust & security"
            title="Built for the most regulated industries"
            sub="Security isn't a feature we bolt on — it's the foundation. VoiceBook meets the bar set by healthcare, finance, and the public sector."
          />
          <div className="trust-row">
            <span className="trust-pill lg"><ShieldGlyph2 /> SOC 2 Type II</span>
            <span className="trust-pill lg"><LockGlyph2 /> HIPAA</span>
            <span className="trust-pill lg"><GlobeGlyph2 /> GDPR</span>
            <span className="trust-pill lg"><CheckMini /> ISO 27001</span>
          </div>
        </div>
        <div className="security-cards">
          {items.map((it) => (
            <div className="sec-card" key={it.title}>
              <span className="sec-icon">{it.icon}</span>
              <div>
                <h4>{it.title}</h4>
                <p>{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================== TESTIMONIAL ============================== */

function Testimonial() {
  return (
    <section className="section testimonial-section">
      <div className="container">
        <figure className="quote-card">
          <span className="quote-mark" aria-hidden>“</span>
          <blockquote>
            VoiceBook recovered the after-hours bookings we were quietly losing for
            years. It paid for itself in the first month — and our patients can't
            tell they're not talking to our front desk.
          </blockquote>
          <figcaption>
            <span className="quote-avatar" aria-hidden>AR</span>
            <span className="quote-person">
              <strong>Alex Rivera</strong>
              <span>VP of Operations, Meridian Health Group</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ================================= CTA ================================= */

function CTA() {
  return (
    <section className="section cta-section">
      <div className="container">
        <div className="cta-card">
          <div className="cta-glow" aria-hidden />
          <h2>Ready to never miss a booking again?</h2>
          <p>
            Start with the live demo above, or talk to our team about a tailored
            rollout for your organization.
          </p>
          <div className="cta-actions">
            <a href="#live" className="btn btn-primary btn-lg">Try the live demo <ArrowGlyph /></a>
            <a href="#demo" className="btn btn-outline btn-lg">Talk to sales</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================ SHARED PIECES ============================ */

function SectionHead({ eyebrow, title, sub, align = 'center' }) {
  return (
    <div className={`section-head align-${align}`}>
      <span className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  )
}

/* ------------------------------ icons ------------------------------ */

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  )
}
function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden className="check-mini">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function WaveGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M3 12h2M19 12h2M7 8v8M11 5v14M13 9v6M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PlugGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M9 3v5M15 3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 16v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function ShieldGlyph2() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ChartGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16v-3M12 16V8M16 16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function UsersGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M16.5 19a5 5 0 0 0-2-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function LockGlyph2() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function EyeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
function ServerGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h.01M8 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
function GlobeGlyph2() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
