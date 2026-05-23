// WebSocket client for the realtime voice loop.
// Server → client: JSON events (session / user / assistant_delta / turn_end / error)
//                  interleaved with binary MP3 frames (one per synthesized sentence).
// Client → server: binary WAV (one per utterance) + {"type":"interrupt"} JSON.

export function connectVoiceWS(handlers = {}) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/api/ws`)
  ws.binaryType = 'arraybuffer'

  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') { handlers.onAudio?.(e.data); return }
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    switch (msg.type) {
      case 'session': handlers.onSession?.(msg); break
      case 'user': handlers.onUser?.(msg.text); break
      case 'assistant_delta': handlers.onAssistantDelta?.(msg.text); break
      case 'turn_end': handlers.onTurnEnd?.(msg); break
      case 'error': handlers.onError?.(msg.text); break
      default: break
    }
  }
  ws.onerror = () => handlers.onError?.('connection error')
  ws.onclose = () => handlers.onClose?.()

  return {
    sendAudio(blob) {
      if (ws.readyState !== WebSocket.OPEN) return
      blob.arrayBuffer().then((ab) => { if (ws.readyState === WebSocket.OPEN) ws.send(ab) })
    },
    interrupt() {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'interrupt' }))
    },
    close() { try { ws.close() } catch { /* noop */ } },
  }
}
