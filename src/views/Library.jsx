import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { bookStatus, formatTime, progressPercent } from '../lib/stats'
import { format } from 'date-fns'
import BookCover from '../components/BookCover'

const FILTERS = ['All','Reading','Finished','Unread']
const SORTS = [
  { label:'Last Read',  key:'last_open',       dir:-1 },
  { label:'Title',      key:'title',            dir:1  },
  { label:'Time Spent', key:'total_read_time',  dir:-1 },
]

function StatusBadge({ status }) {
  const s = {
    reading:  { bg:'var(--amber-subtle)', color:'var(--amber)',   label:'Reading'  },
    finished: { bg:'var(--cream-dark)',   color:'var(--ink-400)', label:'Finished' },
    unread:   { bg:'var(--cream-dark)',   color:'var(--ink-300)', label:'Unread'   },
  }[status]
  return <span style={{display:'inline-block',padding:'3px 10px',borderRadius:99,background:s.bg,color:s.color,fontSize:11,fontWeight:500,border:'1px solid var(--cream-border)'}}>{s.label}</span>
}

function BookCard({ book, onClick, isFocused }) {
  const status = bookStatus(book), pct = progressPercent(book.total_read_pages, book.total_pages)
  return (
    <div onClick={onClick} className="card fade-in" style={{cursor:'pointer',display:'flex',flexDirection:'column',gap:12,borderColor:isFocused?'var(--amber)':undefined,outline:'none'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--amber-light)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor=isFocused?'var(--amber)':'var(--cream-border)'}>
      <BookCover md5={book.md5} title={book.title} size="card"/>
      <div style={{flex:1}}>
        <p style={{margin:'0 0 3px',fontFamily:'Lora,serif',fontSize:'0.875rem',fontWeight:500,lineHeight:1.3,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{book.title}</p>
        <p className="muted--sm" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{book.authors||'Unknown author'}</p>
      </div>
      {status!=='unread'&&(
        <div>
          <div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
            <span style={{fontSize:10,color:status==='reading'?'var(--amber)':'var(--ink-400)',fontWeight:500}}>{status==='reading'?'Reading':'Finished'}</span>
            <span style={{fontSize:10,color:'var(--ink-400)'}}>{status==='finished'?formatTime(book.total_read_time):`${pct}%`}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionsChart({ sessions }) {
  if (!sessions?.length) return null
  const [tip, setTip] = useState(null)
  const max = Math.max(...sessions.map(s => s.seconds), 1)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return (
    <div data-sessions-root style={{position:'relative'}}>
      <p className="label">Reading Sessions</p>
      <hr className="divider" style={{marginBottom:16}}/>
      <div style={{display:'flex',gap:4,alignItems:'flex-end',height:120,overflowX:'auto',paddingBottom:28,paddingTop:4}}>
        {sessions.map(s => {
          const h = Math.max(4, (s.seconds / max) * 100)
          const d = new Date(s.date + 'T12:00:00')
          const label = `${MONTHS[d.getMonth()]} ${d.getDate()}`
          return (
            <div key={s.date} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0}}>
              <div
                style={{width:14,height:h,background:'var(--amber)',borderRadius:'3px 3px 0 0',opacity:0.75,transition:'opacity 0.15s',cursor:'default'}}
                onMouseEnter={e=>{e.currentTarget.style.opacity='1';const bar=e.currentTarget;const br=bar.getBoundingClientRect();const cr=bar.closest('[data-sessions-root]').getBoundingClientRect();setTip({s,x:br.left-cr.left+br.width/2,y:br.top-cr.top})}}
                onMouseLeave={e=>{e.currentTarget.style.opacity='0.75';setTip(null)}}
              />
              <span style={{fontSize:8,color:'var(--ink-300)',writingMode:'vertical-rl',transform:'rotate(180deg)',height:28,overflow:'hidden',whiteSpace:'nowrap'}}>{label}</span>
            </div>
          )
        })}
      </div>
      {tip && (
        <div style={{position:'absolute',left:tip.x,top:tip.y,transform:'translate(-50%,-100%)',background:'var(--ink-900)',color:'var(--cream)',fontSize:11,padding:'6px 10px',borderRadius:5,pointerEvents:'none',zIndex:9999,whiteSpace:'nowrap',lineHeight:1.6}}>
          <div style={{fontWeight:500}}>{new Date(tip.s.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          <div style={{color:'var(--amber-light)'}}>{formatTime(tip.s.seconds)} · {tip.s.pages} pages</div>
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value }) {
  return (
    <div>
      <p className="label--no-mb">{label}</p>
      <p className="serif-value">{value}</p>
    </div>
  )
}

function Detail({ book, onBack }) {
  const status = bookStatus(book), pct = progressPercent(book.total_read_pages, book.total_pages)
  const [sessions, setSessions] = useState(null)
  const [annotations, setAnnotations] = useState(null)
  const [wpm, setWpm] = useState(null)

  useEffect(() => {
    window.komark.query('bookSessions', { bookId: book.id }).then(setSessions)
    window.komark.getAnnotations(book.md5).then(setAnnotations)
    const isFinished = bookStatus(book) === 'finished'
    const pageCount = isFinished ? book.total_pages : book.total_read_pages
    if (book.total_read_time >= 1800 && pageCount >= 50) {
      const minutes = book.total_read_time / 60
      setWpm(Math.round((pageCount * 300) / minutes))
    }
  }, [book.id])

  const pph = book.total_read_time > 0 ? Math.round((book.total_read_pages / (book.total_read_time / 3600))) : null

  return (
    <div className="page--narrow fade-in">
      <button className="back-btn" onClick={onBack}>← Back to Library</button>
      <div style={{display:'flex',gap:24,marginBottom:32,alignItems:'flex-start'}}>
        <BookCover md5={book.md5} title={book.title} size="detail"/>
        <div style={{flex:1}}>
          <h2 style={{margin:'0 0 4px'}}>{book.title}</h2>
          <p className="muted" style={{marginBottom:10,fontSize:13}}>{book.authors||'Unknown author'}</p>
          <StatusBadge status={status}/>
          {status!=='unread'&&(
            <div style={{marginTop:16}}>
              <div className="progress-track" style={{height:3}}><div className="progress-fill" style={{width:`${pct}%`}}/></div>
              <p className="muted--sm" style={{marginTop:5}}>{pct}% complete · {(book.total_read_pages||0).toLocaleString()} of {(book.total_pages||0).toLocaleString()} pages</p>
            </div>
          )}
        </div>
      </div>
      <hr className="divider" style={{marginBottom:24}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:28}}>
        <StatCell label="Time Spent"  value={formatTime(book.total_read_time)}/>
        <StatCell label="Days Read"   value={book.days_read||0}/>
        <StatCell label="Sessions"    value={sessions?.length||'—'}/>
        <StatCell label="Highlights"  value={book.highlights||0}/>
        <StatCell label="Notes"       value={book.notes||0}/>
        <StatCell label="Pace"        value={pph ? `${pph} p/h` : '—'}/>
      </div>

      {wpm && (
        <div style={{padding:'12px 16px',background:'var(--amber-subtle)',border:'1px solid var(--amber-light)',borderRadius:8,marginBottom:28}}>
          <p style={{margin:'0 0 2px',fontSize:10,fontWeight:500,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--amber)'}}>Estimated Reading Speed</p>
          <p style={{margin:0,fontFamily:'Lora,serif',fontSize:'1.3rem',fontWeight:500,color:'var(--ink-900)'}}>{wpm.toLocaleString()} <span style={{fontSize:'0.9rem',color:'var(--ink-600)'}}>words per minute</span></p>
          <p className="muted--sm" style={{marginTop:3}}>Estimated from read time · ~300 words/page average</p>
        </div>
      )}

      <div style={{display:'flex',gap:32,marginBottom:28}}>
        {book.first_read>0&&<div><p className="label--no-mb">Started</p><p style={{margin:0,fontFamily:'Lora,serif',fontSize:'1rem'}}>{format(new Date(book.first_read*1000),'MMM d, yyyy')}</p></div>}
        {book.last_read>0&&<div><p className="label--no-mb">Last Read</p><p style={{margin:0,fontFamily:'Lora,serif',fontSize:'1rem'}}>{format(new Date(book.last_read*1000),'MMM d, yyyy')}</p></div>}
      </div>

      {sessions?.length > 0 && <SessionsChart sessions={sessions}/>}

      {annotations !== null && (
        <div style={{marginTop:32}}>
          <p className="label">
            {annotations.length > 0 ? `${annotations.length} Highlight${annotations.length!==1?'s':''}` : 'Highlights'}
          </p>
          <hr className="divider" style={{marginBottom:16}}/>
          {annotations.length === 0
            ? <p style={{fontSize:12,color:'var(--ink-300)',fontStyle:'italic'}}>No highlights yet. Long-press text in KOReader to highlight.</p>
            : annotations.map((a,i) => (
              <div key={i} style={{marginBottom:24,paddingLeft:14,borderLeft:'2px solid var(--amber-light)'}}>
                <p style={{margin:'0 0 8px',fontSize:13.5,lineHeight:1.7,color:'var(--ink-900)',fontFamily:'Lora,serif',fontStyle:'italic'}}>"{a.text}"</p>
                {a.note && (
                  <div style={{margin:'0 0 8px',padding:'6px 10px',background:'var(--amber-subtle)',borderRadius:4}}>
                    <p style={{margin:0,fontSize:12,color:'var(--ink-700)',lineHeight:1.5}}>📝 {a.note}</p>
                  </div>
                )}
                <div style={{display:'flex',gap:12}}>
                  {a.chapter && <span className="muted--sm">{a.chapter}</span>}
                  {a.pageno && <span className="muted--sm">p. {a.pageno}</span>}
                  {a.datetime && <span className="muted--sm">{a.datetime.slice(0,10)}</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

export default function Library({ books }) {
  const [filter, setFilter] = useState('All')
  const [sortIdx, setSortIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(0)
  const gridRef = useRef(null)

  const sorted = useMemo(() => {
    const s = SORTS[sortIdx]
    const q = search.trim().toLowerCase()
    return [...(books||[])]
      .filter(b => filter==='All' || bookStatus(b)===filter.toLowerCase())
      .filter(b => !q || b.title?.toLowerCase().includes(q) || b.authors?.toLowerCase().includes(q))
      .sort((a,b) => { const av=a[s.key]??'', bv=b[s.key]??''; return typeof av==='string'?av.localeCompare(bv)*s.dir:(av-bv)*s.dir })
  }, [books, filter, sortIdx, search])

  const COLS = 5
  const handleKeyDown = useCallback(e => {
    if (!sorted.length) return
    if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Enter'].includes(e.key)) {
      e.preventDefault()
      setFocused(f => {
        if (e.key === 'Enter') { setSelected(sorted[f]?.id); return f }
        if (e.key === 'ArrowRight') return Math.min(f + 1, sorted.length - 1)
        if (e.key === 'ArrowLeft') return Math.max(f - 1, 0)
        if (e.key === 'ArrowDown') return Math.min(f + COLS, sorted.length - 1)
        if (e.key === 'ArrowUp') return Math.max(f - COLS, 0)
        return f
      })
    }
  }, [sorted])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (selected) {
    const book = (books||[]).find(b=>b.id===selected)
    if (book) return <Detail book={book} onBack={()=>setSelected(null)}/>
  }

  return (
    <div className="page--full fade-in">
      <div style={{marginBottom:24}}>
        <h1 style={{margin:'0 0 4px'}}>Library</h1>
        <p className="muted">{books?.length??0} books in your KOReader library</p>
      </div>
      <div style={{marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or author…"
          style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream-dark)',color:'var(--ink-900)',fontSize:13,fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}
          onFocus={e=>e.target.style.borderColor='var(--amber)'}
          onBlur={e=>e.target.style.borderColor='var(--cream-border)'}
        />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,gap:12}}>
        <div style={{display:'flex',gap:6}}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`pill${filter===f?' active':''}`}>{f}</button>
          ))}
        </div>
        <select value={sortIdx} onChange={e=>setSortIdx(Number(e.target.value))} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream-dark)',color:'var(--ink-600)',fontSize:12,fontFamily:'Inter,sans-serif',cursor:'pointer',outline:'none'}}>
          {SORTS.map((s,i)=><option key={s.key} value={i}>{s.label}</option>)}
        </select>
      </div>
      {sorted.length===0
        ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <p style={{fontFamily:'Lora,serif',fontStyle:'italic',color:'var(--ink-400)'}}>{books?.length?'No books match this filter.':'Sync your device to see your library.'}</p>
          </div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:14,overflowY:'auto',flex:1,paddingBottom:24}}>
            {sorted.map((b,i)=><BookCard key={b.id} book={b} onClick={()=>setSelected(b.id)} isFocused={i===focused}/>)}
          </div>
      }
    </div>
  )
}
