import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { createAudioQueue, createVad, floatToWavBlob, speakBrowser } from '../voice.js'
import { connectVoiceWS } from '../ws.js'

// Lifecycle:
//   idle → starting → speaking → listening → processing → speaking → … → done
// A neural VAD (Silero) drives turn-taking; a WebSocket streams the agent's
// reply back sentence-by-sentence so the first audio plays within ~a second and
// the user can interrupt at any moment.
const PHASES = {
  idle: 'idle',
  starting: 'starting',
  speaking: 'speaking',
  listening: 'listening',
  processing: 'processing',
  done: 'done',
  error: 'error',
}

export default function VoiceSession() {
  const [phase, setPhase] = useState(PHASES.idle)
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const vadRef = useRef(null)
  const wsRef = useRef(null)
  const audioRef = useRef(null)        // audio queue player
  const orbRef = useRef(null)
  const browserTtsRef = useRef(null)   // fallback TTS controller

  const doneRef = useRef(false)
  const pendingEndRef = useRef(null)   // turn_end held until audio drains
  const sawAudioRef = useRef(false)    // did this turn produce server audio?
  const turnTextRef = useRef('')       // accumulated assistant text this turn
  const phaseRef = useRef(phase)
  const handlersRef = useRef({})
  useEffect(() => { phaseRef.current = phase }, [phase])

  const setLevel = useCallback((v) => {
    const el = orbRef.current
    if (!el) return
    const amp = Math.min(1, Math.max(0, v * 8))
    el.style.setProperty('--amp', String(amp))
    el.style.setProperty('--scale', String(1 + amp * 0.18))
  }, [])

  const pushLine = useCallback((role, text) => {
    if (!text) return
    setTranscript((t) => [...t, { role, text, at: Date.now() }])
  }, [])

  // Append a streamed assistant token to the live caption line. The "streaming"
  // flag lives on the line itself so this updater stays pure (StrictMode-safe).
  const appendDelta = useCallback((text) => {
    setTranscript((t) => {
      const last = t[t.length - 1]
      if (last && last.role === 'assistant' && last.streaming) {
        const copy = t.slice()
        copy[copy.length - 1] = { ...last, text: last.text + text }
        return copy
      }
      return [...t, { role: 'assistant', text, at: Date.now(), streaming: true }]
    })
  }, [])

  // Mark the current streaming assistant line as finalized.
  const finalizeStreaming = useCallback(() => {
    setTranscript((t) => {
      const last = t[t.length - 1]
      if (last && last.streaming) {
        const copy = t.slice()
        copy[copy.length - 1] = { ...last, streaming: false }
        return copy
      }
      return t
    })
  }, [])

  const teardown = useCallback(() => {
    try { audioRef.current?.close() } catch { /* noop */ }
    audioRef.current = null
    browserTtsRef.current?.stop()
    wsRef.current?.close()
    wsRef.current = null
    vadRef.current?.destroy?.().catch(() => {})
    vadRef.current = null
  }, [])

  const applyEnd = useCallback((msg) => {
    if (msg?.done || doneRef.current) {
      setPhase(PHASES.done)
      teardown()
    } else {
      setPhase(PHASES.listening)
    }
  }, [teardown])

  // ---- VAD events ----
  const onSpeechStart = useCallback(() => {
    if (doneRef.current) return
    audioRef.current?.flush()          // stop streamed audio immediately
    browserTtsRef.current?.stop()
    pendingEndRef.current = null       // discard any held turn_end
    wsRef.current?.interrupt()         // tell the server to stop generating
    setPhase(PHASES.listening)
  }, [])

  const onSpeechEnd = useCallback((audio) => {
    if (doneRef.current) return
    sawAudioRef.current = false
    turnTextRef.current = ''
    wsRef.current?.sendAudio(floatToWavBlob(audio, 16000))
    setPhase(PHASES.processing)
  }, [])

  const onFrame = useCallback((rms) => {
    if (phaseRef.current === PHASES.listening) setLevel(rms)
  }, [setLevel])

  // ---- WS events ----
  const onUser = useCallback((text) => {
    finalizeStreaming()
    pushLine('user', text)
    setPhase(PHASES.processing)
  }, [pushLine, finalizeStreaming])

  const onAssistantDelta = useCallback((text) => {
    turnTextRef.current += text
    appendDelta(text)
  }, [appendDelta])

  const onAudio = useCallback((arrayBuffer) => {
    sawAudioRef.current = true
    if (phaseRef.current !== PHASES.speaking) setPhase(PHASES.speaking)
    audioRef.current?.push(arrayBuffer)
  }, [])

  const onTurnEnd = useCallback((msg) => {
    finalizeStreaming()
    if (msg.summary) setSummary(msg.summary)  // show the card as soon as booked
    if (msg.done) doneRef.current = true       // end only on goodbye (end_call)
    if (audioRef.current?.isActive()) {
      pendingEndRef.current = msg
    } else if (!sawAudioRef.current && turnTextRef.current.trim()) {
      // No server audio (Cartesia off) — speak via the browser, then transition.
      setPhase(PHASES.speaking)
      browserTtsRef.current = speakBrowser(turnTextRef.current, setLevel)
      browserTtsRef.current.promise.then(() => applyEnd(msg))
    } else {
      applyEnd(msg)
    }
  }, [applyEnd, setLevel, finalizeStreaming])

  const onError = useCallback((text) => {
    setError(text)
  }, [])

  // Keep the once-bound VAD/WS callbacks pointing at the latest handlers.
  Object.assign(handlersRef.current, {
    onSpeechStart, onSpeechEnd, onFrame,
    onUser, onAssistantDelta, onAudio, onTurnEnd, onError,
  })

  const begin = useCallback(async () => {
    setError('')
    setTranscript([])
    setSummary(null)
    doneRef.current = false
    pendingEndRef.current = null
    setPhase(PHASES.starting)
    try {
      // Load the neural VAD FIRST (model + ONNX runtime download + mic
      // permission, ~1-2s). Doing this before opening the WS avoids a race where
      // a slow/failed VAD load tears down the socket while the server is greeting.
      vadRef.current = await createVad({
        onSpeechStart: () => handlersRef.current.onSpeechStart?.(),
        onSpeechEnd: (a) => handlersRef.current.onSpeechEnd?.(a),
        onFrame: (v) => handlersRef.current.onFrame?.(v),
      })
      await vadRef.current.start()

      audioRef.current = createAudioQueue({
        onLevel: setLevel,
        onIdle: () => {
          const msg = pendingEndRef.current
          if (msg) { pendingEndRef.current = null; applyEnd(msg) }
        },
      })

      // Open the WS only once we're fully ready to receive the greeting.
      wsRef.current = connectVoiceWS({
        onUser: (t) => handlersRef.current.onUser?.(t),
        onAssistantDelta: (t) => handlersRef.current.onAssistantDelta?.(t),
        onAudio: (ab) => handlersRef.current.onAudio?.(ab),
        onTurnEnd: (m) => handlersRef.current.onTurnEnd?.(m),
        onError: (t) => handlersRef.current.onError?.(t),
      })
    } catch (e) {
      setError(e?.name === 'NotAllowedError'
        ? 'Mic permission denied. Please allow microphone access and reload.'
        : `Voice setup failed: ${e?.message || e}`)
      setPhase(PHASES.error)
      teardown()
    }
  }, [setLevel, applyEnd, teardown])

  const reset = useCallback(() => {
    teardown()
    doneRef.current = false
    pendingEndRef.current = null
    setPhase(PHASES.idle)
    setTranscript([])
    setSummary(null)
    setError('')
  }, [teardown])

  useEffect(() => () => teardown(), [teardown])

  return (
    <div className="voice">
      <Orb ref={orbRef} phase={phase} onStart={begin} onReset={reset} />
      <PhaseHint phase={phase} />
      {error && <div className="error">{error}</div>}
      {summary && <BookingCard summary={summary} />}
      <Transcript lines={transcript} />
    </div>
  )
}

const Orb = forwardRef(function Orb({ phase, onStart, onReset }, ref) {
  let label, onClick, disabled = false
  switch (phase) {
    case PHASES.idle:
    case PHASES.error:
      label = 'Tap to talk'; onClick = onStart; break
    case PHASES.listening:
      label = 'Listening'; disabled = true; break
    case PHASES.speaking:
      label = 'Speaking — just talk to interrupt'; disabled = true; break
    case PHASES.processing:
      label = 'Thinking'; disabled = true; break
    case PHASES.starting:
      label = 'Connecting'; disabled = true; break
    case PHASES.done:
      label = 'Book another'; onClick = onReset; break
    default:
      label = 'Tap to talk'; onClick = onStart
  }

  return (
    <button
      ref={ref}
      className={`orb phase-${phase}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span className="orb-halo" aria-hidden />
      <span className="orb-hud" aria-hidden />
      <span className="orb-ring r1" aria-hidden />
      <span className="orb-ring r2" aria-hidden />
      <span className="orb-scan" aria-hidden />
      <span className="orb-core" aria-hidden>
        {phase === PHASES.processing ? (
          <span className="dots"><i /><i /><i /></span>
        ) : phase === PHASES.done ? (
          <CheckGlyph />
        ) : (
          <MicGlyph />
        )}
        {/* Jarvis-style voice equalizer — reacts to live --amp during speak/listen */}
        <span className="orb-eq" aria-hidden><i /><i /><i /><i /><i /></span>
      </span>
      <span className="orb-label">{label}</span>
    </button>
  )
})

function MicGlyph() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="glyph">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" fill="currentColor" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" fill="currentColor" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="glyph check">
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="glyph">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function PhaseHint({ phase }) {
  const hints = {
    idle: 'Tap to start. Allow your mic, then just talk — you can interrupt the assistant any time.',
    starting: 'Warming up the voice detector…',
    speaking: 'Assistant is talking — start speaking to interrupt.',
    listening: 'Listening… I\'ll respond when you pause.',
    processing: 'Thinking…',
    done: 'Booked. Check the Bookings page to see it.',
    error: '',
  }
  return <p className="hint">{hints[phase]}</p>
}

function BookingCard({ summary }) {
  const cancelled = summary.status === 'cancelled'
  return (
    <div className="booking-card">
      <div className="booking-card-head">
        <span className={`check-burst ${cancelled ? 'cancelled' : ''}`}>
          {cancelled ? <CrossGlyph /> : <CheckGlyph />}
        </span>
        <h3>{cancelled ? 'Cancelled' : 'Confirmed'}</h3>
      </div>
      <dl>
        <dt>Reference</dt><dd className="mono">{summary.booking_id}</dd>
        <dt>Name</dt><dd>{summary.name}</dd>
        <dt>Service</dt><dd>{summary.service}</dd>
        <dt>When</dt><dd>{summary.slot}</dd>
        <dt>Contact</dt><dd>{summary.contact}</dd>
      </dl>
    </div>
  )
}

function Transcript({ lines }) {
  if (!lines.length) return null
  return (
    <div className="transcript">
      {lines.map((l, i) => (
        <div key={i} className={`line ${l.role}`}>
          <span className="who">{l.role === 'assistant' ? 'Assistant' : 'You'}</span>
          <span className="what">{l.text}</span>
        </div>
      ))}
    </div>
  )
}
