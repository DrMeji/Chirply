"""Chirply bird-sound identification API.

Run:
  cd server
  python -m venv .venv
  .venv\\Scripts\\activate
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8787 --reload
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from classify import IdentifyResult, birdnet_available, birdnet_deps_installed, classify_audio

app = FastAPI(title="Chirply", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "name": "Chirply",
        "birdnet": birdnet_available(),
        "birdnet_deps": birdnet_deps_installed(),
        "demo_forced": os.environ.get("CHIRPLY_DEMO", "").strip() in {"1", "true", "yes"},
    }


@app.post("/api/identify", response_model=IdentifyResult)
async def identify(audio: UploadFile = File(...)) -> IdentifyResult:
    suffix = Path(audio.filename or "clip.wav").suffix or ".wav"
    raw = await audio.read()
    if not raw:
        return IdentifyResult(
            common_name="Unknown",
            scientific_name="",
            confidence=0.0,
            demo=True,
            message="Empty recording",
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(raw)
        path = tmp.name

    try:
        return classify_audio(path)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
