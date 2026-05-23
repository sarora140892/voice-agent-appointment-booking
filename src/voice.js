// Microphone capture + neural voice-activity detection (Silero VAD via WASM).
import { MicVAD } from '@ricky0123/vad-web'

export async function getMicStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
}

// Load every VAD asset (worklet, Silero model, ONNX runtime) from a
// version-matched CDN. Serving them from public/ tripped Vite's dev server,
// which refuses to hand a /public .mjs to a dynamic import(). The CDN bypasses
// the dev module pipeline entirely.
const VAD_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/'
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/'

/**
 * Start a continuous neural VAD on the mic. Silero classifies *real human
 * speech* per frame, so background noise / music / speaker echo won't trigger it.
 *  - onSpeechStart: fires the moment the user starts talking (used for barge-in)
 *  - onSpeechEnd(float32@16kHz): fires when the user stops; the captured samples
 *    include a short pre-speech pad so the leading phoneme isn't clipped.
 * Returns the MicVAD instance ({ start, pause, destroy, listening }).
 */
export async function createVad({ onSpeechStart, onSpeechEnd, onMisfire, onFrame } = {}) {
  const vad = await MicVAD.new({
    model: 'v5',
    baseAssetPath: VAD_ASSET_PATH,
    onnxWASMBasePath: ORT_WASM_PATH,
    // Single-threaded wasm avoids needing COOP/COEP cross-origin-isolation
    // headers (SharedArrayBuffer) on the dev server.
    ortConfig: (ort) => { ort.env.wasm.numThreads = 1 },
    // Use an echo-cancelled stream so the agent's own voice (out of the
    // speakers) doesn't get classified as the user barging in.
    getStream: () => navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }),
    onSpeechStart: () => { onSpeechStart?.() },
    onSpeechEnd: (audio) => { onSpeechEnd?.(audio) },
    onVADMisfire: () => { onMisfire?.() },
    onFrameProcessed: (_probs, frame) => {
      if (!onFrame) return
      let sum = 0
      for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
      onFrame(Math.sqrt(sum / frame.length))
    },
  })
  return vad
}

/**
 * Sequential audio player for streamed MP3 sentence-chunks. Decodes each chunk
 * and schedules it back-to-back for gapless playback, drives `onLevel` from a
 * shared analyser, and calls `onIdle` when the queue drains. flush() stops
 * everything instantly (barge-in).
 */
export function createAudioQueue({ onLevel, onIdle } = {}) {
  const ac = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = ac.createAnalyser()
  analyser.fftSize = 512
  analyser.connect(ac.destination)
  const buf = new Float32Array(analyser.fftSize)
  const sources = new Set()
  let nextStart = 0
  let raf = 0
  let active = 0
  let chain = Promise.resolve()  // serialize decode+schedule to preserve order

  const tick = () => {
    analyser.getFloatTimeDomainData(buf)
    let s = 0
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
    onLevel?.(Math.sqrt(s / buf.length))
    raf = requestAnimationFrame(tick)
  }
  const stopMeter = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } onLevel?.(0) }

  async function schedule(arrayBuffer) {
    let audioBuf
    try { audioBuf = await ac.decodeAudioData(arrayBuffer.slice(0)) } catch { return }
    try { if (ac.state === 'suspended') await ac.resume() } catch { /* noop */ }
    const src = ac.createBufferSource()
    src.buffer = audioBuf
    src.connect(analyser)
    const start = Math.max(ac.currentTime + 0.02, nextStart)
    src.start(start)
    nextStart = start + audioBuf.duration
    active++
    sources.add(src)
    if (!raf) raf = requestAnimationFrame(tick)
    src.onended = () => {
      sources.delete(src)
      active = Math.max(0, active - 1)
      if (active === 0) { stopMeter(); nextStart = 0; onIdle?.() }
    }
  }

  return {
    push(arrayBuffer) { chain = chain.then(() => schedule(arrayBuffer)) },
    flush() {
      for (const s of sources) { try { s.onended = null; s.stop() } catch { /* noop */ } }
      sources.clear()
      active = 0
      nextStart = 0
      stopMeter()
    },
    isActive: () => active > 0,
    close() { this.flush(); try { ac.close() } catch { /* noop */ } },
  }
}

// Encode Float32 PCM (-1..1) as a 16-bit mono WAV blob for upload to STT.
export function floatToWavBlob(float32, sampleRate = 16000) {
  const numSamples = float32.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)            // PCM chunk size
  view.setUint16(20, 1, true)             // format = PCM
  view.setUint16(22, 1, true)             // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)             // block align
  view.setUint16(34, 16, true)            // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  let off = 44
  for (let i = 0; i < numSamples; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// Play server-rendered MP3 and stream real-time amplitude via `onLevel(v)` so the
// UI can drive a speech-reactive animation. Amplitude is RMS in roughly [0, 0.4].
// Returns { promise, stop } — call stop() to cut playback short (barge-in); the
// promise resolves normally either way.
export function playMp3Base64(b64, onLevel) {
  let url, raf, ac, audio
  let settled = false
  let resolveFn = () => {}
  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf)
    try { ac?.close() } catch { /* noop */ }
    if (url) URL.revokeObjectURL(url)
    onLevel?.(0)
  }

  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      url = URL.createObjectURL(blob)
      audio = new Audio(url)

      // Web Audio analyser: tap the element's output to read amplitude per frame.
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)()
        const src = ac.createMediaElementSource(audio)
        const analyser = ac.createAnalyser()
        analyser.fftSize = 512
        src.connect(analyser)
        analyser.connect(ac.destination)
        const buf = new Float32Array(analyser.fftSize)
        const tick = () => {
          analyser.getFloatTimeDomainData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
          onLevel?.(Math.sqrt(sum / buf.length))
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch { /* analyser optional — fall through and just play */ }

      audio.onended = () => { if (settled) return; settled = true; cleanup(); resolve() }
      audio.onerror = (e) => { if (settled) return; settled = true; cleanup(); reject(e) }
      audio.play().catch((err) => { if (settled) return; settled = true; cleanup(); reject(err) })
    } catch (e) {
      if (!settled) { settled = true; cleanup(); reject(e) }
    }
  })

  const stop = () => {
    if (settled) return
    settled = true
    try { audio?.pause() } catch { /* noop */ }
    cleanup()
    resolveFn()
  }

  return { promise, stop }
}

// Fallback: speak via browser SpeechSynthesis when no server audio is provided.
// We can't analyse SpeechSynthesis output programmatically, so we emit a synthetic
// wobble so the orb still feels alive. Returns { promise, stop } like playMp3Base64.
export function speakBrowser(text, onLevel) {
  let raf = 0
  let settled = false
  let resolveFn = () => {}
  const cleanup = () => { if (raf) cancelAnimationFrame(raf); onLevel?.(0) }

  const promise = new Promise((resolve) => {
    resolveFn = resolve
    if (!('speechSynthesis' in window)) { resolve(); return }
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.05

    const t0 = performance.now()
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      const v = 0.08 + 0.06 * Math.abs(Math.sin(t * 6.2)) + 0.04 * Math.abs(Math.sin(t * 2.1))
      onLevel?.(v)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const finish = () => { if (settled) return; settled = true; cleanup(); resolve() }
    utter.onend = finish
    utter.onerror = finish
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  })

  const stop = () => {
    if (settled) return
    settled = true
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    cleanup()
    resolveFn()
  }

  return { promise, stop }
}
