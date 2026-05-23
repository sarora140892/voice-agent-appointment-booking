const BASE = ''

export async function startSession() {
  const r = await fetch(`${BASE}/api/session/start`, { method: 'POST' })
  if (!r.ok) throw new Error(`start failed: ${r.status}`)
  return r.json()
}

export async function sendAudio(sessionId, blob) {
  const fd = new FormData()
  fd.append('session_id', sessionId)
  fd.append('audio', blob, 'turn.wav')
  const r = await fetch(`${BASE}/api/session/audio`, { method: 'POST', body: fd })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`audio turn failed: ${r.status} ${text}`)
  }
  return r.json()
}

export async function sendText(sessionId, text) {
  const r = await fetch(`${BASE}/api/session/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, text }),
  })
  if (!r.ok) throw new Error(`text turn failed: ${r.status}`)
  return r.json()
}

export async function listBookings() {
  const r = await fetch(`${BASE}/api/bookings`)
  if (!r.ok) throw new Error(`bookings failed: ${r.status}`)
  const data = await r.json()
  return data.bookings
}

export async function health() {
  const r = await fetch(`${BASE}/api/health`)
  if (!r.ok) throw new Error(`health failed: ${r.status}`)
  return r.json()
}
