"""FastAPI entry point. Vercel Python runtime picks up the `app` symbol."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import BOOKINGS, start_session, turn, turn_stream
from cartesia_client import is_configured as cartesia_ready
from cartesia_client import stt as cartesia_stt
from cartesia_client import tts as cartesia_tts

log = logging.getLogger("voice-agent")

# Splits leading *complete* sentences off a buffer, leaving any trailing partial.
_SENTENCE = re.compile(r"(.+?[.!?…])(\s+|$)", re.S)


def _pop_sentences(buf: str) -> tuple[list[str], str]:
    out: list[str] = []
    while True:
        m = _SENTENCE.match(buf)
        if not m:
            break
        out.append(m.group(1).strip())
        buf = buf[m.end():]
    return out, buf

app = FastAPI(title="Voice Booking Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TurnIn(BaseModel):
    session_id: str
    text: str


async def _maybe_tts(text: str) -> str | None:
    """Return base64 MP3 if Cartesia is configured, else None (client may fall back to browser TTS)."""
    if not cartesia_ready():
        return None
    try:
        audio = await cartesia_tts(text)
    except Exception as exc:  # noqa: BLE001
        log.warning("cartesia TTS failed: %s", exc)
        return None
    return base64.b64encode(audio).decode("ascii")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "cartesia": cartesia_ready()}


@app.post("/api/session/start")
async def session_start() -> dict:
    result = start_session()
    result["audio_b64"] = await _maybe_tts(result["say"])
    return result


@app.post("/api/session/turn")
async def session_turn(body: TurnIn) -> dict:
    """Text turn — used when the client already did STT (browser fallback / debug typing)."""
    result = await turn(body.session_id, body.text)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    result["audio_b64"] = await _maybe_tts(result["say"])
    return result


@app.post("/api/session/audio")
async def session_audio(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
) -> dict:
    """Audio turn — client uploads a recorded blob, server runs STT → agent → TTS."""
    if not cartesia_ready():
        raise HTTPException(
            status_code=503,
            detail="Cartesia not configured. Set CARTESIA_API_KEY or use /api/session/turn with text.",
        )

    raw = await audio.read()
    try:
        user_text = await cartesia_stt(raw, content_type=audio.content_type or "audio/webm")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"STT failed: {exc}") from exc

    result = await turn(session_id, user_text)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    result["audio_b64"] = await _maybe_tts(result["say"])
    return result


def _mask(value: str) -> str:
    """Mask PII for display: keep the first 2 chars, replace the rest with ***."""
    value = (value or "").strip()
    if not value:
        return ""
    return value[:2] + "***"


@app.get("/api/bookings")
def bookings() -> dict:
    # Mask PII server-side so raw names / emails / phone numbers never leave the
    # server, and drop the transcript (which also contains PII).
    masked = [
        {
            "id": b["id"],
            "name": _mask(b["name"]),
            "service": b["service"],
            "slot": b["slot"],
            "contact": _mask(b["contact"]),
            "created_at": b["created_at"],
            "status": b.get("status", "confirmed"),
        }
        for b in reversed(BOOKINGS)
    ]
    return {"bookings": masked}


@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    """Realtime voice loop.

    Client → server:  binary WAV frame per user utterance; {"type":"interrupt"} to barge in.
    Server → client:  JSON events (session / user / assistant_delta / turn_end / error)
                      interleaved with binary MP3 frames (one per synthesized sentence).
    Each turn runs as a cancellable task so an interrupt can stop generation mid-stream.
    """
    await ws.accept()
    started = start_session()
    session_id = started["session_id"]

    async def tts_send(text: str) -> None:
        text = (text or "").strip()
        if not text or not cartesia_ready():
            return
        try:
            audio = await cartesia_tts(text)
        except Exception as exc:  # noqa: BLE001
            log.warning("TTS failed: %s", exc)
            return
        await ws.send_bytes(audio)

    async def run_turn(user_text: str) -> None:
        try:
            buf = ""
            async for ev in turn_stream(session_id, user_text):
                if ev["type"] == "delta":
                    buf += ev["text"]
                    await ws.send_json({"type": "assistant_delta", "text": ev["text"]})
                    sentences, buf = _pop_sentences(buf)
                    for sentence in sentences:
                        await tts_send(sentence)
                elif ev["type"] == "end":
                    if buf.strip():
                        await tts_send(buf.strip())
                    await ws.send_json({
                        "type": "turn_end",
                        "done": ev["done"],
                        "summary": ev["summary"],
                        "booking_id": ev["booking_id"],
                    })
        except asyncio.CancelledError:
            raise  # interrupt — let the task die quietly
        except (WebSocketDisconnect, RuntimeError):
            pass   # client went away mid-turn

    current: asyncio.Task | None = None
    try:
        # Greet on connect (canned text — already recorded in the session history).
        await ws.send_json({"type": "session", "session_id": session_id})
        await ws.send_json({"type": "assistant_delta", "text": started["say"]})
        await tts_send(started["say"])
        await ws.send_json({"type": "turn_end", "done": False, "summary": None, "booking_id": None})

        while True:
            msg = await ws.receive()
            if msg["type"] == "websocket.disconnect":
                break

            data_bytes = msg.get("bytes")
            data_text = msg.get("text")

            if data_bytes is not None:
                # New utterance — cancel anything still generating, then process.
                if current and not current.done():
                    current.cancel()
                try:
                    user_text = await cartesia_stt(data_bytes, content_type="audio/wav")
                except Exception as exc:  # noqa: BLE001
                    await ws.send_json({"type": "error", "text": f"STT failed: {exc}"})
                    continue
                if not user_text.strip():
                    continue
                await ws.send_json({"type": "user", "text": user_text})
                current = asyncio.create_task(run_turn(user_text))

            elif data_text is not None:
                try:
                    payload = json.loads(data_text)
                except json.JSONDecodeError:
                    continue
                if payload.get("type") == "interrupt" and current and not current.done():
                    current.cancel()
    except (WebSocketDisconnect, RuntimeError):
        # Client disconnected (often mid-greeting) — normal, no need to log loudly.
        pass
    finally:
        if current and not current.done():
            current.cancel()


# --- Static frontend (production) -------------------------------------------
# In production we serve the built Vite app from FastAPI so a single service
# hosts the UI, the API, and the WebSocket on one origin. The dist/ folder is
# produced by `npm run build` and lives at the project root (one level up).
_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str) -> FileResponse:
        """Serve a real file if it exists, else fall back to index.html so
        client-side routes (e.g. /bookings) work on hard refresh. API and WS
        routes are declared above and take precedence over this catch-all."""
        candidate = os.path.abspath(os.path.join(_DIST, full_path))
        if full_path and candidate.startswith(_DIST) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_DIST, "index.html"))
