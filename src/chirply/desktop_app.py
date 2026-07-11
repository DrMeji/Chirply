"""Native Windows window for Chirply.

Serves `web/` locally and opens it in a pywebview desktop window.
"""
from __future__ import annotations

import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def _web_dir() -> Path:
    here = Path(__file__).resolve()
    # src/chirply/desktop_app.py → repo root → web
    root = here.parents[2]
    path = root / "web"
    if not (path / "index.html").is_file():
        raise FileNotFoundError(f"Chirply UI not found at {path}")
    return path


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


class _QuietHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        # Avoid stale CSS/JS when iterating on the splash UI.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def run_desktop_app(*, width: int = 1100, height: int = 720) -> int:
    try:
        import webview
    except ImportError as e:
        raise SystemExit(
            "Missing dependency: pywebview\n"
            "Install with:  pip install pywebview"
        ) from e

    ui_dir = _web_dir()
    port = _free_port()
    handler = partial(_QuietHandler, directory=str(ui_dir))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    url = f"http://127.0.0.1:{port}/index.html"
    webview.create_window(
        "Chirply",
        url,
        width=width,
        height=height,
        min_size=(800, 560),
        background_color="#7eb6e0",
        text_select=False,
    )
    webview.start()
    server.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(run_desktop_app())
