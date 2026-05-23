import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Bookings from './pages/Bookings.jsx'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bookings" element={<Bookings />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="topbar-inner container">
        <Link to="/" className="brand" aria-label="VoiceBook home">
          <BrandMark />
          <span className="brand-name">VoiceBook</span>
          <span className="brand-badge">Enterprise</span>
        </Link>

        <nav className={`nav ${open ? 'is-open' : ''}`}>
          <a href="/#features" className="nav-link">Platform</a>
          <a href="/#how" className="nav-link">How it works</a>
          <a href="/#security" className="nav-link">Security</a>
          <NavLink to="/bookings" className="nav-link">Bookings</NavLink>
          <div className="nav-cta">
            <a href="/#demo" className="btn btn-ghost">Sign in</a>
            <a href="/#demo" className="btn btn-primary">Book a demo</a>
          </div>
        </nav>

        <button
          className={`nav-toggle ${open ? 'is-open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}

function Footer() {
  const columns = [
    {
      title: 'Platform',
      links: ['Voice agents', 'Scheduling', 'Integrations', 'Analytics', 'Pricing'],
    },
    {
      title: 'Solutions',
      links: ['Healthcare', 'Financial services', 'Retail', 'Hospitality', 'Public sector'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API reference', 'Status', 'Changelog', 'Blog'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Security', 'Contact sales', 'Trust center'],
    },
  ]

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <BrandMark />
            <span className="brand-name">VoiceBook</span>
          </Link>
          <p className="footer-tagline">
            The enterprise voice platform that turns conversations into booked
            appointments — securely, in any language, around the clock.
          </p>
          <div className="footer-badges">
            <span className="trust-pill"><LockGlyph /> SOC&nbsp;2 Type&nbsp;II</span>
            <span className="trust-pill"><ShieldGlyph /> HIPAA</span>
            <span className="trust-pill"><GlobeGlyph /> GDPR</span>
          </div>
        </div>

        <div className="footer-cols">
          {columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l}><a href="/#demo">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} VoiceBook, Inc. All rights reserved.</span>
        <div className="footer-legal">
          <a href="/#demo">Privacy</a>
          <a href="/#demo">Terms</a>
          <a href="/#demo">DPA</a>
          <span className="footer-status"><span className="dot-live" /> All systems operational</span>
        </div>
      </div>
    </footer>
  )
}

/* ---------- shared inline icons ---------- */

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" fill="currentColor" />
        <path d="M5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 1 1-2 0v-3.07A7 7 0 0 1 5 11Z" fill="currentColor" opacity="0.85" />
      </svg>
    </span>
  )
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GlobeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
