/**
 * Green-screen bird videos — one at a time, 2s gap,
 * black silhouettes, all flying right → left.
 */
(function () {
  const canvas = document.getElementById('flock')
  if (!canvas) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  const GAP_MS = 2000
  const BIRD = { r: 12, g: 12, b: 14 }
  const BIRD_HI = { r: 28, g: 28, b: 32 }

  const PLAYLIST = [
    './assets/videos/doves.mp4',
    './assets/videos/doves-1.mp4',
    './assets/videos/doves-4.mp4',
    './assets/videos/silhouette-away.mp4',
    './assets/videos/flock-away.mp4',
  ]

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('playsinline', '')
  video.style.display = 'none'
  document.body.appendChild(video)

  const work = document.createElement('canvas')
  const wctx = work.getContext('2d', { willReadFrequently: true })

  let index = 0
  let invertSource = true // black source birds need luminance invert for mask strength
  let flipX = false // mirror so motion is always right → left
  let modeChecked = false
  let flipChecked = false
  let centroidA = null
  let waiting = false
  let w = 0
  let h = 0
  let dpr = 1
  let running = false

  function resize() {
    w = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0, 1)
    h = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 1)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function isGreen(r, g, b) {
    return g > 70 && g > r + 25 && g > b + 25 && g > (r + b) * 0.55
  }

  function birdMaskStrength(r, g, b) {
    const lum = (r + g + b) / 3
    // Black birds → high strength when dark; white birds → high when bright
    if (invertSource) return Math.min(1, Math.max(0, (200 - lum) / 180))
    return Math.min(1, Math.max(0, (lum - 40) / 180))
  }

  function sampleSourceMode() {
    const data = wctx.getImageData(0, 0, work.width, work.height).data
    let sum = 0
    let n = 0
    for (let i = 0; i < data.length; i += 20) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (isGreen(r, g, b)) continue
      sum += (r + g + b) / 3
      n++
      if (n > 600) break
    }
    if (n < 15) return true
    return sum / n < 130 // dark = black silhouettes
  }

  function birdCentroidX() {
    const data = wctx.getImageData(0, 0, work.width, work.height).data
    let sx = 0
    let n = 0
    const pw = work.width
    const ph = work.height
    for (let y = 0; y < ph; y += 3) {
      for (let x = 0; x < pw; x += 3) {
        const i = (y * pw + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (isGreen(r, g, b)) continue
        if (birdMaskStrength(r, g, b) < 0.25) continue
        sx += x
        n++
        if (n > 1500) break
      }
      if (n > 1500) break
    }
    return n > 10 ? sx / n : null
  }

  function drawVideoToWork(pw, ph) {
    wctx.save()
    wctx.clearRect(0, 0, pw, ph)
    if (flipX) {
      wctx.translate(pw, 0)
      wctx.scale(-1, 1)
    }
    wctx.drawImage(video, 0, 0, pw, ph)
    wctx.restore()
  }

  function processFrame() {
    if (video.readyState < 2 || waiting || video.paused) {
      if (waiting) ctx.clearRect(0, 0, w, h)
      return
    }

    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 360
    const maxW = 720
    const scale = Math.min(1, maxW / vw)
    const pw = Math.max(2, Math.floor(vw * scale))
    const ph = Math.max(2, Math.floor(vh * scale))
    if (work.width !== pw || work.height !== ph) {
      work.width = pw
      work.height = ph
      modeChecked = false
      flipChecked = false
      centroidA = null
    }

    drawVideoToWork(pw, ph)

    if (!modeChecked) {
      invertSource = sampleSourceMode()
      modeChecked = true
    }

    // Auto-detect flight direction: if birds move left→right, mirror them
    if (!flipChecked && video.currentTime > 0.15 && centroidA === null) {
      centroidA = birdCentroidX()
    } else if (!flipChecked && video.currentTime > 0.55 && centroidA !== null) {
      const centroidB = birdCentroidX()
      if (centroidB !== null) {
        const delta = centroidB - centroidA
        // Positive delta = moving right (LTR) → flip to RTL
        if (delta > 4) flipX = true
        else if (delta < -4) flipX = false
        flipChecked = true
        // Redraw with correct flip for this frame
        drawVideoToWork(pw, ph)
      }
    }

    const frame = wctx.getImageData(0, 0, pw, ph)
    const d = frame.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      if (isGreen(r, g, b)) {
        d[i + 3] = 0
        continue
      }
      const strength = birdMaskStrength(r, g, b)
      if (strength < 0.08) {
        d[i + 3] = 0
        continue
      }
      // Solid black silhouette
      const t = strength
      d[i] = Math.round(BIRD.r * (1 - t * 0.15) + BIRD_HI.r * (t * 0.15))
      d[i + 1] = Math.round(BIRD.g * (1 - t * 0.15) + BIRD_HI.g * (t * 0.15))
      d[i + 2] = Math.round(BIRD.b * (1 - t * 0.15) + BIRD_HI.b * (t * 0.15))
      d[i + 3] = Math.min(255, Math.round(255 * Math.pow(strength, 0.85)))
    }
    wctx.putImageData(frame, 0, 0)

    ctx.clearRect(0, 0, w, h)
    const fit = Math.min(w / pw, h / ph) * 1.05
    const dw = pw * fit
    const dh = ph * fit
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(work, dx, dy, dw, dh)
  }

  function tick() {
    processFrame()
    requestAnimationFrame(tick)
  }

  function nextAfterGap() {
    waiting = true
    ctx.clearRect(0, 0, w, h)
    index = (index + 1) % PLAYLIST.length
    setTimeout(() => {
      waiting = false
      playCurrent()
    }, GAP_MS)
  }

  function playCurrent() {
    const src = PLAYLIST[index]
    modeChecked = false
    flipChecked = false
    centroidA = null
    flipX = false
    video.src = src
    video.load()
    const tryPlay = () => {
      video.currentTime = 0
      video.play().catch((err) => {
        console.warn('[chirply] video play failed', src, err)
        nextAfterGap()
      })
    }
    if (video.readyState >= 2) tryPlay()
    else video.onloadeddata = tryPlay
  }

  video.addEventListener('ended', nextAfterGap)
  video.addEventListener('error', () => {
    console.warn('[chirply] missing/bad video', PLAYLIST[index])
    nextAfterGap()
  })

  window.addEventListener('resize', resize)
  resize()
  playCurrent()
  if (!running) {
    running = true
    requestAnimationFrame(tick)
  }

  window.chirplyVideos = { playlist: PLAYLIST, skip: nextAfterGap }
})()
