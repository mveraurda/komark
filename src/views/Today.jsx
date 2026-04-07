import React from 'react'
import { formatTime, progressPercent, getTodayStats, getGreeting, readingSpeed } from '../lib/stats'
import { format } from 'date-fns'
import BookCover from '../components/BookCover'

function StatBox({ label, value, sub, accent, dim, large }) {
  return (
    <div style={{opacity: dim ? 0.45 : 1}}>
      <p className="label--no-mb">{label}</p>
      <p style={{margin:0,fontFamily:'Lora,serif',fontSize:large?'2rem':'1.35rem',fontWeight:500,color:accent?'var(--amber)':'var(--ink-900)',lineHeight:1.1}}>{value}</p>
      {sub && <p className="muted--sm" style={{marginTop:2}}>{sub}</p>}
    </div>
  )
}

export default function Today({ books, dailyStats, summary }) {
  const today   = getTodayStats(dailyStats)
  const current = [...(books||[])].sort((a,b)=>(b.last_open||0)-(a.last_open||0)).find(b => b.total_read_pages>0 && b.total_read_pages<b.total_pages)
  const recent  = [...(dailyStats||[])].slice(-7).reverse()

  return (
    <div className="page fade-in">
      <div style={{marginBottom:36}}>
        <p className="muted" style={{marginBottom:4,letterSpacing:'0.06em',textTransform:'uppercase'}}>{format(new Date(),'EEEE, MMMM d')}</p>
        <h1 style={{margin:0,fontSize:'1.9rem'}}>{getGreeting()}.</h1>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24,marginBottom:36,padding:24,background:'var(--cream-dark)',borderRadius:8,border:'1px solid var(--cream-border)'}}>
        <StatBox label="Read today" value={formatTime(today.seconds)} sub={today.pages?`${today.pages} pages`:'No reading yet'} dim={!today.seconds} large />
        <StatBox label="Current streak" value={`${summary?.streak??0}d`} sub={summary?.streak>0?'days in a row':'Start reading!'} accent={summary?.streak>0} dim={!summary?.streak} large />
        <StatBox label="This month" value={formatTime(summary?.total_seconds)} sub={`${(summary?.total_pages||0).toLocaleString()} pages`} large />
      </div>

      {current && (
        <>
          <p className="label">Currently Reading</p>
          <div className="card" style={{marginBottom:32}}>
            <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
              <BookCover md5={current.md5} title={current.title} size="small"/>
              <div style={{flex:1,minWidth:0}}>
                <h3 style={{margin:'0 0 3px',fontSize:'1.05rem'}}>{current.title}</h3>
                <p className="muted" style={{marginBottom:12}}>{current.authors||'Unknown author'}</p>
                <div className="progress-track"><div className="progress-fill" style={{width:`${progressPercent(current.total_read_pages,current.total_pages)}%`}}/></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
                  <span className="muted--sm">{progressPercent(current.total_read_pages,current.total_pages)}% complete</span>
                  <span className="muted--sm">{current.total_read_pages?.toLocaleString()} of {current.total_pages?.toLocaleString()||'?'} pages</span>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:16,alignItems:'flex-end',flexShrink:0}}>
                <StatBox label="Time spent" value={formatTime(current.total_read_time)}/>
                {readingSpeed(current.total_read_time,current.total_read_pages) && <StatBox label="Avg pace" value={`${readingSpeed(current.total_read_time,current.total_read_pages)} p/h`}/>}
              </div>
            </div>
          </div>
        </>
      )}

      {recent.length>0 && (
        <>
          <p className="label">Past 7 Days</p>
          {recent.map((day,i) => (
            <div key={day.date} style={{display:'flex',alignItems:'center',gap:16,padding:'10px 0',borderBottom:'1px solid var(--cream-border)'}}>
              <span style={{width:90,fontSize:12,color:i===0?'var(--amber)':'var(--ink-600)',fontWeight:i===0?500:400,flexShrink:0}}>
                {i===0?'Today':format(new Date(day.date+'T12:00:00'),'EEE, MMM d')}
              </span>
              <div style={{flex:1}}>
                <div className="progress-track">
                  {day.total_seconds>0&&<div className="progress-fill" style={{width:`${Math.min(100,(day.total_seconds/7200)*100)}%`,background:i===0?'var(--amber)':'var(--ink-400)'}}/>}
                </div>
              </div>
              <span style={{width:60,fontSize:12,color:day.total_seconds>0?'var(--ink-700)':'var(--ink-300)',textAlign:'right',flexShrink:0}}>{day.total_seconds>0?formatTime(day.total_seconds):'—'}</span>
              <span className="muted--sm" style={{width:56,textAlign:'right',flexShrink:0}}>{day.pages_read>0?`${day.pages_read}p`:''}</span>
            </div>
          ))}
        </>
      )}

      {!books?.length && (
        <div style={{textAlign:'center',padding:'80px 0'}}>
          <p style={{fontFamily:'Lora,serif',fontStyle:'italic',color:'var(--ink-400)',fontSize:'1.1rem',margin:'0 0 8px'}}>No reading data yet.</p>
          <p className="muted">Configure your device in Settings, then tap Sync Now.</p>
        </div>
      )}
    </div>
  )
}
