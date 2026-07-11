import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvas = document.getElementById('flock')
if (!canvas) throw new Error('Missing #flock canvas')

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
})
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
camera.position.set(0, 0.4, 8)

const hemi = new THREE.HemisphereLight(0xfff2d6, 0x1a1a1a, 1.35)
scene.add(hemi)
const key = new THREE.DirectionalLight(0xffe6b0, 1.6)
key.position.set(4, 6, 5)
scene.add(key)
const rim = new THREE.DirectionalLight(0x88aaff, 0.45)
rim.position.set(-5, 2, -3)
scene.add(rim)

const clock = new THREE.Clock()
/** @type {{ root: THREE.Object3D, mixer: THREE.AnimationMixer, dir: number, speed: number, yBase: number, phase: number, chase: number | null }[]} */
const flock = []
let modelTemplate = null
/** @type {THREE.AnimationClip[]} */
let clips = []

function resize() {
  const w = Math.max(canvas.clientWidth || window.innerWidth || 1100, 1)
  const h = Math.max(canvas.clientHeight || window.innerHeight || 720, 1)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function worldXForScreenEdge(side) {
  // Approximate visible X at z=0 for perspective camera at z=8
  const vFov = (camera.fov * Math.PI) / 180
  const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z
  const visibleWidth = visibleHeight * camera.aspect
  return side * (visibleWidth * 0.55 + 1.2)
}

function spawnBird(index) {
  if (!modelTemplate) return
  const root = modelTemplate.clone(true)
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false
      o.receiveShadow = false
      if (o.material) {
        o.material = o.material.clone()
        o.material.side = THREE.DoubleSide
      }
    }
  })

  const scale = index === 0 ? 0.85 : 0.62
  root.scale.setScalar(scale)

  const mixer = new THREE.AnimationMixer(root)
  if (clips.length) {
    // Prefer a fly/wing clip if named; else first clip
    const preferred =
      clips.find((c) => /fly|wing|flap|soar|idle/i.test(c.name)) || clips[0]
    const action = mixer.clipAction(preferred)
    action.reset().play()
    action.timeScale = 0.95 + index * 0.08
  }

  const dir = index % 2 === 0 ? 1 : -1
  const yBase = index === 0 ? 0.2 : -0.7
  root.position.set(worldXForScreenEdge(-dir) * 0.25, yBase, index * -0.5)
  root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2

  scene.add(root)
  flock.push({
    root,
    mixer,
    dir,
    speed: 1.05 + index * 0.25,
    yBase,
    phase: Math.random() * Math.PI * 2,
    chase: index === 1 ? 0 : null,
    turnAt: 7 + Math.random() * 5,
    age: 0,
  })
}

function updateBird(b, dt, i) {
  b.age += dt
  b.mixer.update(dt)

  // Occasional chase: follow the other bird
  if (b.chase !== null && flock[b.chase]) {
    const target = flock[b.chase].root.position
    const dx = target.x - b.root.position.x
    if (Math.abs(dx) > 0.4) b.dir = Math.sign(dx) || b.dir
  } else if (b.age > b.turnAt) {
    if (Math.random() < 0.4) b.dir *= -1
    b.turnAt = b.age + 5 + Math.random() * 7
    if (flock.length > 1 && Math.random() < 0.35) {
      b.chase = (i + 1) % flock.length
      b.turnAt = b.age + 3 + Math.random() * 2
    } else {
      b.chase = null
    }
  }

  b.root.position.x += b.dir * b.speed * dt
  b.phase += dt * 2.2
  b.root.position.y = b.yBase + Math.sin(b.phase) * 0.22

  // Face flight direction (model forward assumed +Z in many GLBs; adjust)
  const faceY = b.dir > 0 ? Math.PI / 2 : -Math.PI / 2
  b.root.rotation.y += (faceY - b.root.rotation.y) * Math.min(1, dt * 6)
  b.root.rotation.z = Math.sin(b.phase * 0.5) * 0.08 * -b.dir

  const edge = worldXForScreenEdge(1)
  if (b.root.position.x > edge) {
    b.root.position.x = -edge
    b.yBase = (Math.random() - 0.5) * 1.4
  } else if (b.root.position.x < -edge) {
    b.root.position.x = edge
    b.yBase = (Math.random() - 0.5) * 1.4
  }
}

function tick() {
  requestAnimationFrame(tick)
  const dt = Math.min(0.05, clock.getDelta())
  for (let i = 0; i < flock.length; i++) updateBird(flock[i], dt, i)
  renderer.render(scene, camera)
}

async function boot() {
  resize()
  window.addEventListener('resize', resize)

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync('./assets/phoenix_bird.glb')
  modelTemplate = gltf.scene
  clips = gltf.animations || []

  // Center / normalize model
  const box = new THREE.Box3().setFromObject(modelTemplate)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  modelTemplate.position.sub(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  // Phoenix is larger / more dramatic — keep splash-friendly size
  modelTemplate.scale.setScalar(2.2 / maxDim)

  spawnBird(0)
  spawnBird(1)

  console.info('[chirply] phoenix clips:', clips.map((c) => c.name))
  tick()
}

boot().catch((err) => {
  console.error('[chirply] failed to load 3D bird', err)
  const el = document.createElement('p')
  el.className = 'bird-error'
  el.textContent = 'Could not load 3D bird — check assets/phoenix_bird.glb'
  document.body.appendChild(el)
})
