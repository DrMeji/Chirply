"""Bird call classification — BirdNET when available, demo fallback otherwise."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from pydantic import BaseModel

log = logging.getLogger("chirply.classify")

DEMO_BIRDS = [
    ("Black-capped Chickadee", "Poecile atricapillus", 0.94),
    ("American Robin", "Turdus migratorius", 0.91),
    ("Northern Cardinal", "Cardinalis cardinalis", 0.89),
    ("Song Sparrow", "Melospiza melodia", 0.87),
    ("Blue Jay", "Cyanocitta cristata", 0.86),
]

# Force demo even if BirdNET packages are installed (fast startup / CI).
FORCE_DEMO = os.environ.get("CHIRPLY_DEMO", "").strip() in {"1", "true", "yes"}

_analyzer = None
_analyzer_failed: str | None = None
_deps_ok: bool | None = None


class IdentifyResult(BaseModel):
    common_name: str
    scientific_name: str
    confidence: float
    demo: bool
    message: str | None = None


def birdnet_deps_installed() -> bool:
    """Fast check — imports only, does not load the TF model."""
    global _deps_ok
    if FORCE_DEMO:
        return False
    if _deps_ok is not None:
        return _deps_ok
    try:
        import birdnetlib  # noqa: F401
        import librosa  # noqa: F401
        import tensorflow  # noqa: F401

        _deps_ok = True
    except Exception as e:
        log.info("BirdNET deps missing: %s", e)
        _deps_ok = False
    return _deps_ok


def birdnet_available() -> bool:
    """True when deps are present (model may still load on first identify)."""
    return birdnet_deps_installed() and _analyzer_failed is None


def _get_analyzer():
    """Lazy-load BirdNET Analyzer (slow first time — downloads/loads model)."""
    global _analyzer, _analyzer_failed
    if FORCE_DEMO:
        return None
    if _analyzer is not None:
        return _analyzer
    if _analyzer_failed is not None:
        return None
    if not birdnet_deps_installed():
        return None
    try:
        from birdnetlib.analyzer import Analyzer  # type: ignore

        log.info("Loading BirdNET analyzer (first run can take a minute)…")
        _analyzer = Analyzer()
        log.info("BirdNET analyzer ready")
        return _analyzer
    except Exception as e:
        _analyzer_failed = str(e)
        log.warning("BirdNET analyzer failed to load: %s", e)
        return None


def _demo_result(path: Path | None = None, message: str | None = None) -> IdentifyResult:
    idx = 0
    if path is not None and path.is_file():
        idx = path.stat().st_size % len(DEMO_BIRDS)
    name, sci, conf = DEMO_BIRDS[idx]
    return IdentifyResult(
        common_name=name,
        scientific_name=sci,
        confidence=conf,
        demo=True,
        message=message
        or "Demo mode — BirdNET model not loaded (set CHIRPLY_DEMO=0 and install deps)",
    )


def classify_audio(path: str) -> IdentifyResult:
    p = Path(path)
    if not p.is_file() or p.stat().st_size < 100:
        return _demo_result(p, "Recording too short — showing demo match")

    analyzer = _get_analyzer()
    if analyzer is None:
        msg = "Demo mode — BirdNET not ready on this machine"
        if _analyzer_failed:
            msg = f"Demo mode — BirdNET load failed ({_analyzer_failed})"
        return _demo_result(p, msg)

    try:
        from birdnetlib import Recording  # type: ignore

        recording = Recording(analyzer, str(p), min_conf=0.15)
        recording.analyze()
        detections = getattr(recording, "detections", None) or []
        if not detections:
            return IdentifyResult(
                common_name="No match",
                scientific_name="",
                confidence=0.0,
                demo=False,
                message="No bird call detected — try closer or quieter surroundings",
            )

        best = max(detections, key=lambda d: float(d.get("confidence", 0)))
        common = best.get("common_name") or best.get("label") or "Unknown"
        scientific = best.get("scientific_name") or ""
        conf = float(best.get("confidence") or 0)
        return IdentifyResult(
            common_name=str(common),
            scientific_name=str(scientific),
            confidence=round(conf, 4),
            demo=False,
            message=None,
        )
    except Exception as e:
        log.exception("BirdNET classify failed")
        return _demo_result(p, f"BirdNET error — demo fallback ({e})")
