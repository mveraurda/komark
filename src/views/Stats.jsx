import React, { useState, useMemo, useRef } from 'react'
import HeatMap from '../components/HeatMap'
import { formatTime, buildMonthlyData } from '../lib/stats'

const PERIODS = [['week','This Week'],['month','This Month'],['year','This Year'],['all','All Time']]
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Section({ title, sub, children }) {
  return (
    <div style={{marginBottom:36}}>
      <h3 style={{margin:'0 0 2px'}}>{title}</h3>
      {sub && <p className="muted--sm" style={{marginBottom:12}}>{sub}</p>}
      <hr className="divider" style={{marginBottom:16}}/>
      {children}
    </div>
  )
}

function BarTip({ tip }) {
  if (!tip) return null
  return (
    <div style={{position:'absolute',left:tip.x,top:tip.y,transform:'translate(-50%,-100%)',background:'var(--ink-900)',color:'var(--cream)',fontSize:11,padding:'6px 10px',borderRadius:5,pointerEvents:'none',zIndex:9999,whiteSpace:'nowrap',lineHeight:1.6}}>
      <div style={{fontWeight:500}}>{tip.label}</div>
      <div style={{color:'var(--amber-light)'}}>{tip.value}</div>
    </div>
  )
}

export default function Stats({ books, dailyStats, summaryAll, loadSummary }) {
  const [period, setPeriod]   = useState('year')
  const [summary, setSummary] = useState(summaryAll)
  const [monthlyTip, setMonthlyTip] = useState(null)
  const [dowTip, setDowTip]         = useState(null)
  const monthlyRef = useRef(null)
  const dowRef     = useRef(null)

  const monthly  = useMemo(()=>buildMonthlyData(dailyStats),[dailyStats])
  const topBooks = useMemo(()=>[...(books||[])].filter(b=>b.total_read_time>0).sort((a,b)=>b.total_read_time-a.total_read_time).slice(0,8),[books])
  const dow      = useMemo(()=>{
    const t=[0,0,0,0,0,0,0]
    for(const r of dailyStats||[]) t[new Date(r.date+'T12:00:00').getDay()]+=r.total_seconds||0
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((l,i)=>({l,s:t[i]}))
  },[dailyStats])

  async function pick(p) { setPeriod(p); const s=await loadSummary(p); setSummary(s) }

  function barHandlers(label, value, containerRef, setter) {
    return {
      onMouseEnter: e => {
        e.currentTarget.style.opacity='1'
        const br = e.currentTarget.getBoundingClientRect()
        const cr = containerRef.current.getBoundingClientRect()
        setter({label, value, x: br.left - cr.left + br.width/2, y: br.top - cr.top})
      },
      onMouseLeave: e => { e.currentTarget.style.opacity='0.75'; setter(null) },
    }
  }

  return (
    <div className="page--wide fade-in" style={{height:'100%',overflowY:'auto'}}>
      <h1 style={{margin:'0 0 4px'}}>Statistics</h1>
      <p className="muted" style={{marginBottom:24}}>Your reading patterns at a glance</p>

      <div style={{display:'flex',gap:6,marginBottom:24}}>
        {PERIODS.map(([v,l])=>(
          <button key={v} onClick={()=>pick(v)} className={`pill${period===v?' active':''}`}>{l}</button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:36}}>
        {[['Time Read',formatTime(summary?.total_seconds)],['Pages',(summary?.total_pages||0).toLocaleString()],['Days Active',summary?.days_read||0],['Streak',`${summary?.streak??0}d`]].map(([l,v],i)=>(
          <div key={l} style={{padding:20,background:'var(--cream-dark)',border:'1px solid var(--cream-border)',borderRadius:8}}>
            <p className="label--no-mb">{l}</p>
            <p className="serif-value--lg" style={{color:i===3?'var(--amber)':undefined}}>{v}</p>
          </div>
        ))}
      </div>

      <Section title="Reading Activity" sub="One year — darker means more reading">
        <HeatMap dailyStats={dailyStats}/>
      </Section>

      {monthly.length>0&&(
        <Section title="Monthly Breakdown" sub="Hours read per month">
          <div ref={monthlyRef} style={{position:'relative',display:'flex',gap:6,alignItems:'flex-end',height:80}}>
            {(() => {
              const max=Math.max(...monthly.map(d=>d.seconds),1)
              return monthly.map(d=>{
                const h=Math.max(2,(d.seconds/max)*72), mo=d.month.slice(5)
                return (
                  <div key={d.month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{width:'100%',height:h,background:'var(--amber)',borderRadius:'2px 2px 0 0',opacity:0.75,cursor:'default'}}
                      {...barHandlers(MONTHS[parseInt(mo)], formatTime(d.seconds), monthlyRef, setMonthlyTip)}/>
                    <span style={{fontSize:9,color:'var(--ink-400)'}}>{MONTHS[parseInt(mo)]}</span>
                  </div>
                )
              })
            })()}
            {monthlyTip && <BarTip tip={monthlyTip}/>}
          </div>
        </Section>
      )}

      {dow.some(d=>d.s>0)&&(
        <Section title="Reading by Day of Week" sub="When you read most">
          <div ref={dowRef} style={{position:'relative',display:'flex',gap:8,alignItems:'flex-end',height:64}}>
            {(() => {
              const max=Math.max(...dow.map(d=>d.s),1)
              return dow.map(d=>(
                <div key={d.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{width:'100%',height:Math.max(2,(d.s/max)*52),background:'var(--ink-400)',borderRadius:'2px 2px 0 0',opacity:0.75,cursor:'default'}}
                    {...barHandlers(d.l, formatTime(d.s), dowRef, setDowTip)}/>
                  <span style={{fontSize:9,color:'var(--ink-400)'}}>{d.l}</span>
                </div>
              ))
            })()}
            {dowTip && <BarTip tip={dowTip}/>}
          </div>
        </Section>
      )}

      {topBooks.length>0&&(
        <Section title="Most Time Spent" sub="Your most-read books">
          {topBooks.map((b,i)=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 0',borderBottom:'1px solid var(--cream-border)'}}>
              <span style={{width:20,fontSize:12,color:'var(--ink-300)',fontFamily:'Lora,serif',flexShrink:0}}>{i+1}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</p>
                <p className="muted--sm" style={{marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.authors||'Unknown'}</p>
              </div>
              <span style={{fontSize:12,color:'var(--ink-600)',flexShrink:0}}>{formatTime(b.total_read_time)}</span>
            </div>
          ))}
        </Section>
      )}

    </div>
  )
}
