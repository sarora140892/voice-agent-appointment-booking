"""Thin async wrapper around Cartesia's REST API for STT and TTS."""

from __future__ import annotations

import os
from typing import Any

import httpx

CARTESIA_API_KEY = os.environ.get("CARTESIA_API_KEY", "")
CARTESIA_VERSION = os.environ.get("CARTESIA_VERSION", "2024-11-13")
CARTESIA_VOICE_ID = os.environ.get(
    "CARTESIA_VOICE_ID",
    # "Sarah" — a clear friendly default voice from Cartesia's public library.
    "694f9389-aac1-45b6-b726-9d9369183238",
)
CARTESIA_TTS_MODEL = os.environ.get("CARTESIA_TTS_MODEL", "sonic-2")
CARTESIA_STT_MODEL = os.environ.get("CARTESIA_STT_MODEL", "ink-whisper")

BASE_URL = "https://api.cartesia.ai"


def is_configured() -> bool:
    return bool(CARTESIA_API_KEY)


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    h = {
        "X-API-Key": CARTESIA_API_KEY,
        "Cartesia-Version": CARTESIA_VERSION,
    }
    if extra:
        h.update(extra)
    return h


async def tts(text: str) -> bytes:
    """Synthesize speech for `text` and return MP3 audio bytes."""
    if not CARTESIA_API_KEY:
        raise RuntimeError("CARTESIA_API_KEY not set")

    payload: dict[str, Any] = {
        "model_id": CARTESIA_TTS_MODEL,
        "transcript": text,
        "voice": {"mode": "id", "id": CARTESIA_VOICE_ID},
        "output_format": {
            "container": "mp3",
            "sample_rate": 44100,
            "bit_rate": 128000,
        },
        "language": "en",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{BASE_URL}/tts/bytes",
            headers=_headers({"Content-Type": "application/json"}),
            json=payload,
        )
        r.raise_for_status()
        return r.content


async def stt(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """Transcribe `audio_bytes` and return the recognized text."""
    if not CARTESIA_API_KEY:
        raise RuntimeError("CARTESIA_API_KEY not set")

    files = {"file": ("audio", audio_bytes, content_type)}
    data = {"model": CARTESIA_STT_MODEL, "language": "en"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{BASE_URL}/stt",
            headers=_headers(),
            files=files,
            data=data,
        )
        r.raise_for_status()
        body = r.json()
        return body.get("text") or body.get("transcript") or ""
