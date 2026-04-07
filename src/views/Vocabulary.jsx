import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'

export default function Vocabulary({ vocab }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return vocab || []
    const q = search.toLowerCase()
    return (vocab || []).filter(v => v.word.toLowerCase().includes(q) || v.book_title?.toLowerCase().includes(q))
  }, [vocab, search])

  const byBook = useMemo(() => {
    const m = {}
    for (const v of vocab || []) {
      const b = v.book_title || 'Unknown'
      if (!m[b]) m[b] = 0
      m[b]++
    }
    return Object.entries(m).sort((a,b) => b[1]-a[1])
  }, [vocab])

  if (!vocab?.length) return (
    <div className="page--narrow fade-in">
      <h1 style={{margin:'0 0 4px'}}>Vocabulary</h1>
      <p className="muted" style={{marginBottom:48}}>Words you've looked up while reading</p>
      <div style={{textAlign:'center',padding:'80px 0'}}>
        <p style={{fontFamily:'Lora,serif',fontStyle:'italic',color:'var(--ink-400)',fontSize:'1.1rem',margin:'0 0 8px'}}>No words yet.</p>
        <p className="muted">Look up words in KOReader to build your vocabulary list.</p>
      </div>
    </div>
  )

  return (
    <div className="page--full fade-in">
      <div style={{marginBottom:24}}>
        <h1 style={{margin:'0 0 4px'}}>Vocabulary</h1>
        <p className="muted">{vocab.length} word{vocab.length!==1?'s':''} looked up across your library</p>
      </div>

      {byBook.length > 1 && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>
          {byBook.map(([title,count]) => (
            <span key={title} style={{padding:'4px 10px',borderRadius:9999,background:'var(--cream-dark)',border:'1px solid var(--cream-border)',fontSize:11,color:'var(--ink-600)'}}>
              {title.length>25?title.slice(0,25)+'…':title} <span style={{color:'var(--amber)',fontWeight:500}}>{count}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{marginBottom:20}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search words or books…"
          style={{width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream-dark)',color:'var(--ink-900)',fontSize:13,fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}
        />
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {filtered.map((v,i) => (
          <div key={i} style={{padding:'16px 0',borderBottom:'1px solid var(--cream-border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
              <span style={{fontFamily:'Lora,serif',fontSize:'1.1rem',fontWeight:500,color:'var(--ink-900)',cursor:'pointer'}}
                onClick={()=>window.komark.openExternal(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(v.word)}`)}
                title="Look up in Merriam-Webster"
              >{v.word} <span style={{fontSize:10,color:'var(--amber)',fontFamily:'Inter,sans-serif',fontWeight:400}}>↗</span></span>
              <div style={{display:'flex',gap:12}}>
                {v.book_title && <span className="muted--sm" style={{color:'var(--ink-600)'}}>{v.book_title.length>30?v.book_title.slice(0,30)+'…':v.book_title}</span>}
                {v.create_time && <span className="muted--sm">{format(new Date(v.create_time*1000),'MMM d, yyyy')}</span>}
              </div>
            </div>
            {(v.prev_context || v.next_context) && (
              <p style={{margin:0,fontSize:12,color:'var(--ink-600)',lineHeight:1.6,fontStyle:'italic'}}>
                "…{v.prev_context}<span style={{color:'var(--ink-900)',fontWeight:500,fontStyle:'normal'}}>{v.word}</span>{v.next_context}…"
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="muted" style={{fontStyle:'italic',padding:'24px 0'}}>No words match your search.</p>
        )}
      </div>
    </div>
  )
}
