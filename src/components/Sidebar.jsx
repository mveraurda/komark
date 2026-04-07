import React from 'react'

const icons = {
  today: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6"/>
      <polyline points="7.5,4 7.5,7.5 10,9"/>
    </svg>
  ),
  library: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4" height="11" rx="0.5"/>
      <rect x="7" y="2" width="4" height="11" rx="0.5"/>
      <line x1="12.5" y1="2" x2="12.5" y2="13"/>
    </svg>
  ),
  stats: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="8" width="3" height="5"/>
      <rect x="6" y="5" width="3" height="8"/>
      <rect x="10.5" y="2" width="3" height="11"/>
    </svg>
  ),
  vocabulary: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h5v11H2z"/>
      <path d="M7 4h6v9H7z"/>
      <line x1="4" y1="5.5" x2="5.5" y2="5.5"/>
      <line x1="4" y1="7.5" x2="5.5" y2="7.5"/>
      <line x1="9" y1="7" x2="11" y2="7"/>
      <line x1="9" y1="9" x2="11" y2="9"/>
    </svg>
  ),
  settings: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="2"/>
      <path d="M7.5 1.5v1.2M7.5 12.3v1.2M12.5 7.5h-1.2M3.7 7.5H2.5M11 4l-.85.85M4.85 10.15L4 11M11 11l-.85-.85M4.85 4.85L4 4"/>
    </svg>
  ),
}

const NAV = [
  { id:'today',      label:'Today'      },
  { id:'library',    label:'Library'    },
  { id:'stats',      label:'Statistics' },
  { id:'vocabulary', label:'Vocabulary' },
  { id:'settings',   label:'Settings'   },
]

function relTime(ts) {
  const m = Math.floor((Date.now()-ts)/60000)
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

const STAGE_LABEL = { stats: 'Syncing stats…', covers: 'Syncing covers…' }

export default function Sidebar({ active, onNav, lastSync, syncing, syncStage, onSync }) {
  return (
    <aside style={{width:200,minWidth:200,background:'var(--cream-dark)',borderRight:'1px solid var(--cream-border)',display:'flex',flexDirection:'column',height:'100vh'}}>
      <div className="drag-region" style={{height:52,flexShrink:0}}/>
      <div style={{padding:'0 20px 20px'}}>
        <h1 style={{fontSize:'1.1rem',margin:0,letterSpacing:'-0.02em'}}>KoMark</h1>
        <p className="muted--sm">Reading Companion</p>
      </div>
      <hr className="divider" style={{margin:'0 16px 12px'}}/>
      <nav className="no-drag" style={{flex:1,padding:'0 8px'}}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 12px',
            borderRadius:6,border:'none',
            background: active===item.id ? 'var(--amber-subtle)' : 'transparent',
            color: active===item.id ? 'var(--amber)' : 'var(--ink-600)',
            fontFamily:'Inter,sans-serif',fontSize:13,
            fontWeight: active===item.id ? 500 : 400,
            cursor:'pointer',textAlign:'left',marginBottom:2,
            opacity: active===item.id ? 1 : 0.85,
          }}>
            {icons[item.id]}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="no-drag" style={{padding:'12px 12px 24px',borderTop:'1px solid var(--cream-border)'}}>
        <button onClick={onSync} disabled={syncing} style={{
          width:'100%',padding:'8px 0',
          background: syncing ? 'var(--ink-200)' : 'var(--amber-subtle)',
          color: syncing ? 'var(--ink-400)' : 'var(--amber)',
          border:'1px solid', borderColor: syncing ? 'var(--ink-200)' : 'var(--amber-light)',
          borderRadius:6,fontSize:12,fontWeight:500,cursor:syncing?'default':'pointer',
          fontFamily:'Inter,sans-serif',
        }}>
          {syncing ? (STAGE_LABEL[syncStage] || 'Syncing…') : 'Sync Now'}
        </button>
        {lastSync && <p className="muted--sm" style={{marginTop:6,textAlign:'center',fontSize:10}}>Last sync {relTime(lastSync)}</p>}
      </div>
    </aside>
  )
}
