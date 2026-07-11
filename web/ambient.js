/**
 * Drive ambient world motion in JS so it works even when
 * Windows "reduced motion" disables CSS animations.
 */
(function ambientWorld() {
  const wrap = document.querySelector('.landscape-wrap')
  const clouds = [...document.querySelectorAll('.cloud')]
  const mists = [...document.querySelectorAll('.mist')]
  const foliage = document.querySelector('.foliage-sway')

  if (!wrap && !clouds.length) return

  const cloudState = clouds.map((el, i) => ({
    el,
    x: -25 + i * 40,
    y: i === 1 ? 2 : i === 2 ? -1 : 0,
    speed: 8 + i * 3,
    bob: 0.45 + i * 0.15,
    phase: i * 1.7,
  }))

  const mistState = mists.map((el, i) => ({
    el,
    phase: i * 2.1,
    amp: 6 + i * 2,
  }))

  let last = performance.now()

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = now / 1000

    if (wrap) {
      const dx = Math.sin(t * 0.15) * 2.2
      const dy = Math.cos(t * 0.11) * 0.9
      const sc = 1.05 + Math.sin(t * 0.1) * 0.025
      wrap.style.transform = `translate3d(${dx}%, ${dy}%, 0) scale(${sc})`
    }

    for (const c of cloudState) {
      c.x += c.speed * dt
      if (c.x > 125) c.x = -50
      const by = Math.sin(t * c.bob + c.phase) * 1.4
      c.el.style.transform = `translate3d(${c.x}vw, ${c.y + by}%, 0)`
    }

    for (const m of mistState) {
      const x = Math.sin(t * 0.22 + m.phase) * m.amp
      const y = Math.cos(t * 0.16 + m.phase) * 1.8
      m.el.style.transform = `translate3d(${x}%, ${y}%, 0)`
    }

    if (foliage) {
      const skew = Math.sin(t * 1.25) * 1.4
      const fx = Math.sin(t * 1.05) * 0.8
      foliage.style.transform = `skewX(${skew}deg) translateX(${fx}%)`
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
})()
