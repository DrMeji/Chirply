# Chirply

Hear a bird. Know its name.

Windows desktop app with a black splash, gold **Chirply** wordmark, Start button, and live flying birds.

## Open

Double-click **`Open Chirply.bat`**

```powershell
pip install -e ".[app]"
python -m chirply app
```

Or open `web/index.html` in a browser.

## Layout

- `web/` — splash UI + flock animation
- `src/chirply/` — native window (pywebview)
- `server/` — bird-sound ID API (next screens)

## API (optional)

```powershell
cd server
.\start.bat
```
