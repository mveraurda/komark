import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar     from './components/Sidebar'
import Today       from './views/Today'
import Library     from './views/Library'
import Stats       from './views/Stats'
import Vocabulary  from './views/Vocabulary'
import Settings    from './views/Settings'
import Welcome     from './views/Welcome'

function Toast({ toast }) {
  if (!toast) return null
  return <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
}

export default function App() {
  const [view, setView]         = useState('today')
  const [syncing, setSyncing]   = useState(false)
  const [syncStage, setSyncStage] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [books, setBooks]       = useState(null)
  const [daily, setDaily]       = useState(null)
  const [summary, setSummary]   = useState(null)
  const [vocab, setVocab]       = useState(null)
  const [toast, setToast]       = useState(null)
  const [configured, setConfigured] = useState(null)
  const toastTimer              = useRef(null)

  function showToast(msg, type = 'error') {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const loadAll = useCallback(async () => {
    const settings = await window.komark.getSettings()
    setConfigured(!!settings.host)
    const exists = await window.komark.hasData()
    if (!exists) return
    const [b, d, s, v] = await Promise.all([
      window.komark.query('books'),
      window.komark.query('daily', { days: 365 }),
      window.komark.query('summary', { period: 'month' }),
      window.komark.getVocab(),
    ])
    setBooks(b||[]); setDaily(d||[]); setSummary(s); setVocab(v||[])
  }, [])

  const loadSummary = useCallback(async (period) => {
    const s = await window.komark.query('summary', { period })
    setSummary(s); return s
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    const unsub = window.komark.onSyncComplete(d => { if (d.success) { setLastSync(d.time); loadAll() } })
    return unsub
  }, [loadAll])

  useEffect(() => {
    const unsub = window.komark.onSyncStage(d => setSyncStage(d.stage))
    return unsub
  }, [])

  async function handleSync() {
    setSyncing(true); setSyncStage('stats')
    const r = await window.komark.syncNow()
    setSyncing(false); setSyncStage(null)
    if (r.ok) { setLastSync(r.time); await loadAll(); showToast('Sync complete', 'success') }
    else showToast(r.error, 'error')
  }

  function renderView() {
    if (configured === false && view !== 'settings') return <Welcome onGoToSettings={() => setView('settings')}/>
    switch (view) {
      case 'today':      return <Today books={books} dailyStats={daily} summary={summary}/>
      case 'library':    return <Library books={books}/>
      case 'stats':      return <Stats books={books} dailyStats={daily} summaryAll={summary} loadSummary={loadSummary}/>
      case 'vocabulary': return <Vocabulary vocab={vocab}/>
      case 'settings':   return <Settings onSaved={loadAll}/>
    }
  }

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <Sidebar active={view} onNav={setView} lastSync={lastSync} syncing={syncing} syncStage={syncStage} onSync={handleSync}/>
      <main style={{flex:1,overflowY:'auto',background:'var(--cream)'}}>
        {renderView()}
      </main>
      <Toast toast={toast}/>
    </div>
  )
}
