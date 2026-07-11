const splash = document.getElementById('splash')
const appScreen = document.getElementById('appScreen')
const startBtn = document.getElementById('startBtn')
const backBtn = document.getElementById('backBtn')
const world = document.getElementById('world')
const flock = document.getElementById('flock')

const gridPanel = document.getElementById('gridPanel')
const resultPanel = document.getElementById('resultPanel')
const listenStatus = document.getElementById('listenStatus')
const workspace = document.getElementById('workspace')

const fileBtn = document.getElementById('fileBtn')
const micBtn = document.getElementById('micBtn')
const resultBtn = document.getElementById('resultBtn')
const fileInput = document.getElementById('fileInput')

const resultImage = document.getElementById('resultImage')
const resultImageFallback = document.getElementById('resultImageFallback')
const resultName = document.getElementById('resultName')
const resultSci = document.getElementById('resultSci')
const resultConfidence = document.getElementById('resultConfidence')
const resultLocation = document.getElementById('resultLocation')
const resultHeard = document.getElementById('resultHeard')
const resultNote = document.getElementById('resultNote')

/** @type {'idle' | 'listening' | 'found'} */
let mode = 'idle'
/** @type {ReturnType<typeof setTimeout> | null} */
let listenTimer = null
/** @type {object | null} */
let lastResult = null
let hasRecording = false

const DEMO_BIRDS = [
  {
    common_name: 'Black-capped Chickadee',
    scientific_name: 'Poecile atricapillus',
    confidence: 0.94,
    location: 'Near you · temperate forest',
    image: '',
    note: 'Demo match — live ID comes next.',
  },
  {
    common_name: 'American Robin',
    scientific_name: 'Turdus migratorius',
    confidence: 0.91,
    location: 'Near you · open woodland',
    image: '',
    note: 'Demo match — live ID comes next.',
  },
  {
    common_name: 'Northern Cardinal',
    scientific_name: 'Cardinalis cardinalis',
    confidence: 0.89,
    location: 'Near you · shrub edge',
    image: '',
    note: 'Demo match — live ID comes next.',
  },
]

function setSplashWorld(visible) {
  if (world) world.hidden = !visible
  if (flock) flock.hidden = !visible
  document.body.classList.toggle('in-app', !visible)
}

function clearListenTimer() {
  if (listenTimer != null) {
    clearTimeout(listenTimer)
    listenTimer = null
  }
}

function syncToolbar() {
  fileBtn.disabled = !hasRecording
  resultBtn.disabled = !lastResult
  micBtn.classList.toggle('is-active', mode === 'listening')
  resultBtn.classList.toggle('is-active', !resultPanel.hidden && !!lastResult)
  workspace.classList.toggle('has-grid', !gridPanel.hidden)
  workspace.classList.toggle('has-result', !resultPanel.hidden)
}

function showGrid(show) {
  gridPanel.hidden = !show
  if (show) {
    requestAnimationFrame(() => {
      window.chirplyCad?.start()
      window.chirplyCad?.resize()
    })
  } else {
    window.chirplyCad?.stop()
  }
  syncToolbar()
}

function showResult(show) {
  if (show && !lastResult) return
  resultPanel.hidden = !show
  syncToolbar()
  if (!gridPanel.hidden) {
    requestAnimationFrame(() => window.chirplyCad?.resize())
  }
}

function fillResult(bird) {
  lastResult = bird
  resultName.textContent = bird.common_name
  resultSci.textContent = bird.scientific_name
  resultConfidence.textContent = `${Math.round(bird.confidence * 100)}%`
  resultLocation.textContent = bird.location || 'Unknown'
  resultHeard.textContent = new Date().toLocaleString([], {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  })
  resultNote.textContent = bird.note || ''

  if (bird.image) {
    resultImage.src = bird.image
    resultImage.alt = bird.common_name
    resultImage.hidden = false
    resultImageFallback.hidden = true
  } else {
    resultImage.removeAttribute('src')
    resultImage.hidden = true
    resultImageFallback.hidden = false
    resultImageFallback.textContent = bird.common_name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }
}

function resetSession() {
  clearListenTimer()
  mode = 'idle'
  lastResult = null
  hasRecording = false
  if (listenStatus) listenStatus.textContent = 'Listening…'
  showGrid(false)
  showResult(false)
  syncToolbar()
}

function showApp() {
  splash.hidden = true
  appScreen.hidden = false
  setSplashWorld(false)
  resetSession()
}

function showSplash() {
  clearListenTimer()
  window.chirplyCad?.stop()
  appScreen.hidden = true
  splash.hidden = false
  setSplashWorld(true)
}

function startListening() {
  mode = 'listening'
  hasRecording = true
  if (listenStatus) listenStatus.textContent = 'Listening…'
  showGrid(true)
  showResult(false)
  syncToolbar()

  clearListenTimer()
  // Demo identify — real mic + API next
  listenTimer = setTimeout(() => {
    const bird = DEMO_BIRDS[Math.floor(Math.random() * DEMO_BIRDS.length)]
    mode = 'found'
    if (listenStatus) listenStatus.textContent = 'Match found'
    fillResult(bird)
    showResult(true)
    syncToolbar()
  }, 3200)
}

function onMicClick() {
  if (mode === 'listening') {
    clearListenTimer()
    mode = hasRecording || lastResult ? 'found' : 'idle'
    if (listenStatus) listenStatus.textContent = lastResult ? 'Match found' : 'Stopped'
    micBtn.classList.remove('is-active')
    syncToolbar()
    return
  }
  startListening()
}

function onResultClick() {
  if (!lastResult) return
  showResult(resultPanel.hidden)
}

function onFileClick() {
  if (fileBtn.disabled) return
  fileInput?.click()
}

fileInput?.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (!file) return
  hasRecording = true
  mode = 'listening'
  if (listenStatus) listenStatus.textContent = `Reading ${file.name}…`
  showGrid(true)
  showResult(false)
  syncToolbar()

  clearListenTimer()
  listenTimer = setTimeout(() => {
    const bird = DEMO_BIRDS[file.size % DEMO_BIRDS.length]
    mode = 'found'
    if (listenStatus) listenStatus.textContent = 'Match found'
    fillResult({
      ...bird,
      note: `From file · ${file.name}`,
    })
    showResult(true)
    syncToolbar()
    fileInput.value = ''
  }, 1800)
})

startBtn?.addEventListener('click', showApp)
backBtn?.addEventListener('click', showSplash)
micBtn?.addEventListener('click', onMicClick)
resultBtn?.addEventListener('click', onResultClick)
fileBtn?.addEventListener('click', onFileClick)

window.chirply = { showApp, showSplash }
