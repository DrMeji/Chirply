const splash = document.getElementById('splash')
const appScreen = document.getElementById('appScreen')
const startBtn = document.getElementById('startBtn')
const backBtn = document.getElementById('backBtn')

function showApp() {
  splash.hidden = true
  appScreen.hidden = false
}

function showSplash() {
  appScreen.hidden = true
  splash.hidden = false
}

startBtn?.addEventListener('click', showApp)
backBtn?.addEventListener('click', showSplash)

window.chirply = { showApp, showSplash }
