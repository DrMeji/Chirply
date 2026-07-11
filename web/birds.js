/**
 * Ambient flock — fewer birds, more natural side-profile flight.
 */
(function () {
  const canvas = document.getElementById('flock')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const COUNT = 3
  const birds = []
  let w = 0
  let h = 0
  let dpr = 1
  let last = performance.now()
  let started = false
  const trails = [] // soft motion ghosts for realism

  function measure() {
    const cw = Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0,
      canvas.clientWidth || 0,
    )
    const ch = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      canvas.clientHeight || 0,
    )
    return { cw: cw || 1100, ch: ch || 720 }
  }

  function resize() {
    const { cw, ch } = measure()
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = cw
    h = ch
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function rand(a, b) {
    return a + Math.random() * (b - a)
  }

  function pickChaseTarget(self) {
    const others = birds.filter((b) => b !== self)
    if (!others.length) return null
    return others[Math.floor(Math.random() * others.length)]
  }

  function makeBird(i) {
    const dir = i % 2 === 0 ? 1 : -1
    // Bird 2 is distant / smaller for depth
    const distant = i === 2
    const scale = distant ? rand(0.55, 0.7) : rand(1.1, 1.4)
    return {
      x: rand(w * 0.12, w * 0.88),
      y: distant ? rand(h * 0.1, h * 0.35) : rand(h * 0.22, h * 0.7),
      vx: dir * (distant ? rand(32, 48) : rand(50, 82)),
      vy: rand(-6, 6),
      scale,
      flap: rand(0, Math.PI * 2),
      flapSpeed: distant ? rand(4.5, 6) : rand(5.2, 7.2),
      glideUntil: 0,
      chase: distant ? null : null,
      chaseUntil: performance.now() + rand(2000, 5000),
      turnAt: performance.now() + rand(5000, 12000),
      alpha: distant ? rand(0.45, 0.6) : rand(0.92, 1),
      species: i % 2,
      distant,
    }
  }

  function resetFlock() {
    birds.length = 0
    for (let i = 0; i < COUNT; i++) birds.push(makeBird(i))
  }

  function wrap(b) {
    const m = 140 * b.scale
    if (b.x < -m) {
      b.x = w + m * 0.25
      b.y = rand(h * 0.15, h * 0.75)
    } else if (b.x > w + m) {
      b.x = -m * 0.25
      b.y = rand(h * 0.15, h * 0.75)
    }
    if (b.y < h * 0.08) b.vy = Math.abs(b.vy) + 4
    if (b.y > h * 0.86) b.vy = -Math.abs(b.vy) - 4
  }

  function update(b, dt, now) {
    // Glide phases — wings hold, then flap again
    if (now > b.glideUntil) {
      if (Math.random() < 0.3) {
        b.glideUntil = now + rand(600, 1400)
      } else {
        b.glideUntil = now + rand(2000, 4500)
      }
    }
    const gliding = now < b.glideUntil && b.glideUntil - now < 1400

    if (now > b.chaseUntil) {
      if (!b.distant && Math.random() < 0.32) {
        b.chase = pickChaseTarget(b)
        b.chaseUntil = now + rand(2500, 5500)
      } else {
        b.chase = null
        b.chaseUntil = now + rand(2500, 6000)
      }
    }

    if (b.chase) {
      const dx = b.chase.x - b.x
      const dy = b.chase.y - b.y - 24
      const dist = Math.hypot(dx, dy) || 1
      const want = 95
      b.vx += (dx / dist) * want * dt * 1.4
      b.vy += (dy / dist) * want * dt * 0.9
      const mag = Math.hypot(b.vx, b.vy) || 1
      b.vx = (b.vx / mag) * want
      b.vy *= 0.96
    }

    if (now > b.turnAt && !b.chase) {
      if (Math.random() < 0.35) b.vx *= -0.92
      b.vy += rand(-18, 18)
      b.turnAt = now + rand(6000, 14000)
    }

    // Soft lift on downstroke
    if (!gliding) {
      b.flap += b.flapSpeed * dt
      const lift = Math.max(0, -Math.sin(b.flap)) * 18
      b.vy -= lift * dt
    } else {
      b.flap += b.flapSpeed * 0.15 * dt
      b.vy += 6 * dt // gentle sink while gliding
    }

    b.vy += Math.sin(now * 0.0007 + b.x * 0.01) * 4 * dt
    b.vy *= 0.985

    const maxX = 110
    b.vx = Math.max(-maxX, Math.min(maxX, b.vx))
    b.vy = Math.max(-36, Math.min(36, b.vy))
    // Prefer horizontal flight
    if (Math.abs(b.vx) < 40) b.vx = Math.sign(b.vx || 1) * 48

    b.x += b.vx * dt
    b.y += b.vy * dt
    b._gliding = gliding
    wrap(b)
  }

  function palette(species) {
    if (species === 1) {
      return {
        belly: '#c4b49a',
        breast: '#a89880',
        back: '#8a7b66',
        wing: '#7a6b58',
        wingTip: '#5c5042',
        head: '#9a8b74',
        beak: '#d8b896',
        eye: '#1a1510',
        highlight: 'rgba(255,245,220,0.2)',
      }
    }
    return {
      belly: '#f0d8a8',
      breast: '#e0c088',
      back: '#c9a66a',
      wing: '#b89255',
      wingTip: '#8a6a3c',
      head: '#d4b078',
      beak: '#e8c49a',
      eye: '#1a120c',
      highlight: 'rgba(255,248,230,0.25)',
    }
  }

  function drawBird(b) {
    const facing = b.vx >= 0 ? 1 : -1
    const bank = Math.max(-0.22, Math.min(0.22, b.vy * 0.008))
    const flapPhase = b.flap
    // Asymmetric flap: quick up, slower down
    const raw = Math.sin(flapPhase)
    const wingAngle = b._gliding
      ? -0.15
      : raw * 0.72 + Math.sin(flapPhase * 2) * 0.08
    const p = palette(b.species)

    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(bank)
    ctx.scale(facing * b.scale, b.scale)
    ctx.globalAlpha = b.alpha
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4

    // --- Far wing (behind body) ---
    ctx.fillStyle = p.wingTip
    ctx.beginPath()
    ctx.moveTo(2, 0)
    ctx.quadraticCurveTo(
      8,
      -10 - wingAngle * 28,
      26,
      -4 - wingAngle * 18,
    )
    ctx.quadraticCurveTo(14, 4, 2, 3)
    ctx.closePath()
    ctx.fill()

    // --- Tail ---
    ctx.fillStyle = p.back
    ctx.beginPath()
    ctx.moveTo(-16, 1)
    ctx.quadraticCurveTo(-30, -4 + wingAngle * 2, -38, 2)
    ctx.lineTo(-36, 6)
    ctx.quadraticCurveTo(-28, 5, -16, 5)
    ctx.closePath()
    ctx.fill()
    // Tail fork hint
    ctx.fillStyle = p.wingTip
    ctx.beginPath()
    ctx.moveTo(-28, 1)
    ctx.lineTo(-38, -1)
    ctx.lineTo(-34, 3)
    ctx.closePath()
    ctx.fill()

    // --- Body (teardrop) ---
    const bodyGrad = ctx.createLinearGradient(0, -8, 0, 10)
    bodyGrad.addColorStop(0, p.back)
    bodyGrad.addColorStop(0.45, p.breast)
    bodyGrad.addColorStop(1, p.belly)
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.moveTo(18, -2)
    ctx.bezierCurveTo(12, -9, -6, -9, -18, 1)
    ctx.bezierCurveTo(-10, 10, 8, 11, 18, 3)
    ctx.bezierCurveTo(20, 1, 20, -1, 18, -2)
    ctx.closePath()
    ctx.fill()

    // Belly soft highlight
    ctx.fillStyle = p.highlight
    ctx.beginPath()
    ctx.ellipse(2, 4, 9, 3.2, -0.15, 0, Math.PI * 2)
    ctx.fill()

    // --- Head ---
    ctx.fillStyle = p.head
    ctx.beginPath()
    ctx.ellipse(17, -3, 7.2, 6.4, 0.1, 0, Math.PI * 2)
    ctx.fill()

    // Cheek
    ctx.fillStyle = p.belly
    ctx.globalAlpha = b.alpha * 0.55
    ctx.beginPath()
    ctx.ellipse(18, -0.5, 3.5, 2.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = b.alpha

    // Beak
    ctx.fillStyle = p.beak
    ctx.beginPath()
    ctx.moveTo(23, -3)
    ctx.lineTo(33, -1.2)
    ctx.lineTo(23.5, 1.2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(80,50,20,0.25)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(23.5, -1)
    ctx.lineTo(31, -1)
    ctx.stroke()

    // Eye
    ctx.fillStyle = p.eye
    ctx.beginPath()
    ctx.arc(19.5, -4.2, 1.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.arc(19.9, -4.6, 0.45, 0, Math.PI * 2)
    ctx.fill()

    // --- Near wing (main flapping wing) with primaries ---
    ctx.shadowBlur = 6
    const wy = -wingAngle * 32
    const tipX = 22
    const tipY = -12 + wy

    // Wing coverts
    ctx.fillStyle = p.wing
    ctx.beginPath()
    ctx.moveTo(-2, 1)
    ctx.quadraticCurveTo(2, -8 + wy * 0.5, tipX * 0.55, tipY * 0.7)
    ctx.quadraticCurveTo(6, 3, -2, 4)
    ctx.closePath()
    ctx.fill()

    // Primary feathers fan
    ctx.fillStyle = p.wingTip
    ctx.beginPath()
    ctx.moveTo(4, 0)
    ctx.quadraticCurveTo(10, -14 + wy, tipX, tipY)
    ctx.quadraticCurveTo(16, -2 + wy * 0.3, 6, 3)
    ctx.closePath()
    ctx.fill()

    // Feather separation lines
    ctx.strokeStyle = 'rgba(40,30,20,0.22)'
    ctx.lineWidth = 0.7
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.18
      ctx.beginPath()
      ctx.moveTo(3 + i * 2, 0.5)
      ctx.quadraticCurveTo(
        8 + i * 3,
        -8 + wy * (0.5 + i * 0.1),
        tipX * (0.55 + i * 0.1),
        tipY * (0.55 + i * 0.1),
      )
      ctx.stroke()
    }

    // Wing leading edge highlight
    ctx.strokeStyle = p.highlight
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(8, -10 + wy * 0.6, tipX * 0.7, tipY * 0.75)
    ctx.stroke()

    ctx.restore()
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (w > 0 && h > 0) {
      ctx.clearRect(0, 0, w, h)

      // Soft trail ghosts (motion blur feel)
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i]
        t.life -= dt
        if (t.life <= 0) {
          trails.splice(i, 1)
          continue
        }
        ctx.globalAlpha = t.life * 0.12
        ctx.fillStyle = t.color
        ctx.beginPath()
        ctx.ellipse(t.x, t.y, t.r * 1.6, t.r * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      for (const b of birds) {
        update(b, dt, now)
        if (Math.random() < 0.35) {
          trails.push({
            x: b.x - Math.sign(b.vx) * 10 * b.scale,
            y: b.y + 2,
            r: 3.5 * b.scale,
            life: 0.28,
            color: b.species === 1 ? '#a89880' : '#e0c088',
          })
        }
      }
      const sorted = birds.slice().sort((a, c) => a.scale - c.scale)
      for (const b of sorted) drawBird(b)
    }
    requestAnimationFrame(frame)
  }

  function tryStart() {
    resize()
    if (w < 40 || h < 40) return false
    if (!started) {
      resetFlock()
      started = true
      last = performance.now()
      requestAnimationFrame(frame)
    } else {
      for (const b of birds) {
        b.x = Math.min(w - 20, Math.max(20, b.x))
        b.y = Math.min(h * 0.85, Math.max(h * 0.1, b.y))
      }
    }
    return true
  }

  window.addEventListener('resize', tryStart)
  if (window.ResizeObserver) {
    new ResizeObserver(tryStart).observe(document.documentElement)
  }

  let tries = 0
  ;(function boot() {
    if (tryStart() || tries++ > 60) return
    setTimeout(boot, 50)
  })()
})()
