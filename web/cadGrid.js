/**
 * Monochrome CAD grid — foundation for sound-frequency visuals.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const mount = document.getElementById('cadMount')
if (!mount) {
  // Mount missing — nothing to do
} else {
  let scene
  let camera
  let renderer
  let controls
  let running = false
  let raf = 0

  function size() {
    const w = Math.max(mount.clientWidth || 0, 1)
    const h = Math.max(mount.clientHeight || 0, 1)
    return { w, h }
  }

  function init() {
    if (renderer) return

    const { w, h } = size()
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x121212)

    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000)
    camera.position.set(160, 140, 160)

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)

    // Uniform dark-gray grid (no colored axes)
    const gridHelper = new THREE.GridHelper(1000, 50, 0x2a2a2a, 0x2a2a2a)
    scene.add(gridHelper)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.target.set(0, 0, 0)
    controls.minDistance = 40
    controls.maxDistance = 800
    controls.maxPolarAngle = Math.PI * 0.49

    window.addEventListener('resize', onResize)
  }

  function onResize() {
    if (!renderer || !camera) return
    const { w, h } = size()
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }

  function tick() {
    if (!running) return
    raf = requestAnimationFrame(tick)
    controls?.update()
    renderer?.render(scene, camera)
  }

  function start() {
    init()
    onResize()
    if (running) return
    running = true
    tick()
  }

  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  window.chirplyCad = { start, stop, resize: onResize }
}
