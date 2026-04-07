const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs   = require('fs')
const net  = require('net')
const os   = require('os')
const { performSync, syncCovers, syncAnnotations, syncVocab } = require('./sftp')
const { queryDB, queryVocab } = require('./db')

let settingsPath, dbPath, coversDir, annotationsPath, vocabPath
let mainWindow = null
let syncTimer  = null

const DEFAULT = {
  host: '', port: 2222, username: 'root', password: '',
  remotePath: '/mnt/us/koreader/settings/statistics.sqlite3', syncInterval: 5,
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath))
      return { ...DEFAULT, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) }
  } catch {}
  return { ...DEFAULT }
}

function saveSettings(s) { fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2)) }

function startSyncTimer(settings) {
  if (syncTimer) clearInterval(syncTimer)
  if (!settings.syncInterval) return
  syncTimer = setInterval(async () => {
    if (!settings.host) return
    try {
      await performSync(settings, dbPath)
      mainWindow?.webContents.send('sync:complete', { success: true, time: Date.now() })
    } catch {}
  }, settings.syncInterval * 60 * 1000)
}

ipcMain.handle('settings:get', () => loadSettings())
ipcMain.handle('settings:save', (_, s) => { saveSettings(s); startSyncTimer(s); return { ok: true } })
ipcMain.handle('sync:now', async () => {
  const s = loadSettings()
  if (!s.host) return { ok: false, error: 'No Kindle IP configured. Go to Settings.' }
  const send = (stage) => mainWindow?.webContents.send('sync:stage', { stage })
  try {
    send('stats')
    await performSync(s, dbPath)
    send('covers')
    await Promise.allSettled([
      syncCovers(s, coversDir),
      syncAnnotations(s, annotationsPath),
      syncVocab(s, vocabPath),
    ])
    return { ok: true, time: Date.now() }
  }
  catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('cover:get', (_, md5) => {
  if (!md5 || !coversDir) return null
  const p = path.join(coversDir, md5 + '.jpg')
  if (!fs.existsSync(p)) return null
  return 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64')
})
ipcMain.handle('kindle:discover', async () => {
  const subnetSet = new Set()
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal)
        subnetSet.add(iface.address.split('.').slice(0, 3).join('.'))
    }
  }
  const saved = loadSettings()
  if (saved.host) subnetSet.add(saved.host.split('.').slice(0, 3).join('.'))
  ;['10.0.0','10.0.1','192.168.0','192.168.1','192.168.86',
    '172.16.58','172.16.0','172.16.1','172.20.10'].forEach(s => subnetSet.add(s))
  const subnets = [...subnetSet]

  const probe = (ip, port, timeout) => new Promise(resolve => {
    const sock = new net.Socket()
    sock.setTimeout(timeout)
    sock.on('connect', () => { sock.destroy(); resolve(ip) })
    sock.on('error', () => resolve(null))
    sock.on('timeout', () => { sock.destroy(); resolve(null) })
    sock.connect(port, ip)
  })

  const BATCH = 50, PORT = 2222, TIMEOUT = 800
  for (const subnet of subnets) {
    mainWindow?.webContents.send('kindle:scanning', { subnet, total: subnets.length, subnets })
    const ips = Array.from({length: 254}, (_, i) => `${subnet}.${i+1}`)
    for (let i = 0; i < ips.length; i += BATCH) {
      const batch = ips.slice(i, i + BATCH)
      const results = await Promise.all(batch.map(ip => probe(ip, PORT, TIMEOUT)))
      const found = results.find(r => r !== null)
      if (found) return { ok: true, host: found }
    }
  }
  return { ok: false, error: 'Kindle not found on network. Make sure SSH is enabled on KOReader.' }
})
ipcMain.handle('annotations:get', (_, md5) => {
  if (!annotationsPath || !fs.existsSync(annotationsPath)) return []
  const all = JSON.parse(fs.readFileSync(annotationsPath, 'utf8'))
  return md5 ? all.filter(a => a.md5 === md5) : all
})
ipcMain.handle('vocab:get', async () => {
  if (!vocabPath || !fs.existsSync(vocabPath)) return []
  try { return await queryVocab(vocabPath) } catch { return [] }
})
ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))
ipcMain.handle('db:hasData', () => fs.existsSync(dbPath))
ipcMain.handle('db:query', async (_, type, params) => {
  if (!fs.existsSync(dbPath)) return null
  try { return await queryDB(dbPath, type, params) }
  catch (e) { console.error('DB error:', e); return null }
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FAF7F0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  settingsPath    = path.join(app.getPath('userData'), 'settings.json')
  dbPath          = path.join(app.getPath('userData'), 'komark_stats.sqlite3')
  coversDir       = path.join(app.getPath('userData'), 'covers')
  annotationsPath = path.join(app.getPath('userData'), 'annotations.json')
  vocabPath       = path.join(app.getPath('userData'), 'vocabulary.sqlite3')

  createWindow()
  startSyncTimer(loadSettings())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
