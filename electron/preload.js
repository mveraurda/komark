const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('komark', {
  getSettings:    ()       => ipcRenderer.invoke('settings:get'),
  saveSettings:   (s)      => ipcRenderer.invoke('settings:save', s),
  syncNow:        ()       => ipcRenderer.invoke('sync:now'),
  hasData:        ()       => ipcRenderer.invoke('db:hasData'),
  query:          (t, p)   => ipcRenderer.invoke('db:query', t, p),
  getCover:       (md5)    => ipcRenderer.invoke('cover:get', md5),
  discoverKindle:   ()       => ipcRenderer.invoke('kindle:discover'),
  getAnnotations:   (md5)    => ipcRenderer.invoke('annotations:get', md5),
  getVocab:         ()       => ipcRenderer.invoke('vocab:get'),
  openExternal:     (url)    => ipcRenderer.invoke('shell:openExternal', url),
  onSyncComplete: (cb) => {
    ipcRenderer.on('sync:complete', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('sync:complete')
  },
  onSyncStage: (cb) => {
    ipcRenderer.on('sync:stage', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('sync:stage')
  },
  onKindleScanning: (cb) => {
    ipcRenderer.on('kindle:scanning', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('kindle:scanning')
  },
})
