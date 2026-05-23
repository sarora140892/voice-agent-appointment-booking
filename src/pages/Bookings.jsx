import { useEffect, useMemo, useState } from 'react'
import { listBookings } from '../api.js'

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    try {
      setBookings(await listBookings())
      setError('')
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const kpis = useMemo(() => {
    const total = bookings.length
    const today = bookings.filter((b) => {
      const d = new Date(b.created_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    const services = new Set(bookings.map((b) => b.service)).size
    return { total, today, services }
  }, [bookings])

  return (
    <section className="container bookings-page bookings">
      <div className="bookings-hero">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" />Operations dashboard</span>
          <h1>Bookings</h1>
          <p>Every appointment captured by your voice assistant, in real time.</p>
        </div>
        <div className="bookings-actions">
          <button className="refresh" onClick={refresh} disabled={loading}>
            <RefreshGlyph spinning={loading} /> Refresh
          </button>
        </div>
      </div>

      <div className="bookings-stats">
        <div className="kpi">
          <div className="kpi-label">Total bookings</div>
          <div className="kpi-value grad-text">{kpis.total}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Booked today</div>
          <div className="kpi-value grad-text">{kpis.today}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Unique services</div>
          <div className="kpi-value grad-text">{kpis.services}</div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Name</th>
              <th>Service</th>
              <th>When</th>
              <th>Contact</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="loading" colSpan={7}>Loading bookings…</td></tr>
            )}
            {!loading && !bookings.length && (
              <tr><td className="empty" colSpan={7}>No bookings yet. Try booking one from the home page.</td></tr>
            )}
            {!loading && bookings.map((b) => (
              <tr key={b.id}>
                <td className="mono" data-label="Ref">{b.id}</td>
                <td data-label="Name">{b.name}</td>
                <td data-label="Service">{b.service}</td>
                <td data-label="When">{b.slot}</td>
                <td className="mono" data-label="Contact">{b.contact}</td>
                <td className="mono" data-label="Created">{new Date(b.created_at).toLocaleString()}</td>
                <td data-label="Status">
                  {b.status === 'cancelled' ? (
                    <span className="status-pill cancelled">Cancelled</span>
                  ) : (
                    <span className="status-pill"><span className="dot-live" /> Confirmed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RefreshGlyph({ spinning }) {
  return (
    <svg
      viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden
      style={spinning ? { animation: 'spin 0.8s linear infinite' } : undefined}
    >
      <path d="M20 11a8 8 0 1 0-.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 5v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
