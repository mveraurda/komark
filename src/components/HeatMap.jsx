import React, { useState } from 'react'
import { buildHeatmapGrid } from '../lib/stats'
import { format, parseISO } from 'date-fns'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['','M','','W','','F','']

function fmtTime(s) {
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60)
  return h?`${h}h ${m}m`:`${m}m`
}

export default function HeatMap({ dailyStats }) {
  const [tip, setTip] = useState(null)
  const grid  = buildHeatmapGrid(dailyStats)
  const weeks = []
  for (let i=0;i<grid.length;i+=7) weeks.push(grid.slice(i,i+7))
  const C=11, G=2
  const monthLabels = []
  let lastM = null
  weeks.forEach((w,wi) => {
    const mo = parseInt(w[0]?.date?.slice(5,7))-1
    if (w[0] && mo !== lastM) { monthLabels.push({wi,label:MONTHS[mo]}); lastM=mo }
  })
  return (
    <div className="heatmap-root" style={{position:'relative'}}>
      <div style={{display:'flex',marginLeft:16,marginBottom:4,position:'relative',height:14}}>
        {monthLabels.map(({wi,label}) => (
          <span key={label+wi} style={{position:'absolute',left:wi*(C+G),fontSize:10,color:'var(--ink-400)',whiteSpace:'nowrap'}}>{label}</span>
        ))}
      </div>
      <div style={{display:'flex',gap:G,alignItems:'flex-start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:G,marginTop:1}}>
          {DAYS.map((d,i) => <span key={i} style={{fontSize:9,color:'var(--ink-400)',height:C,lineHeight:`${C}px`,width:10,textAlign:'right'}}>{d}</span>)}
        </div>
        {weeks.map((week,wi) => (
          <div key={wi} style={{display:'flex',flexDirection:'column',gap:G}}>
            {week.map((day,di) => (
              <div key={di} className={`heat-${day.heat}`}
                style={{width:C,height:C,borderRadius:2,cursor:day.seconds>0?'pointer':'default'}}
                onMouseEnter={e => { const bar=e.currentTarget; const br=bar.getBoundingClientRect(); const cr=bar.closest('.heatmap-root').getBoundingClientRect(); setTip({day,x:br.left-cr.left+br.width/2,y:br.top-cr.top}) }}
                onMouseLeave={() => setTip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      {tip && (
        <div style={{position:'absolute',left:tip.x,top:tip.y,transform:'translate(-50%,-100%)',background:'var(--ink-900)',color:'var(--cream)',fontSize:11,padding:'5px 9px',borderRadius:5,pointerEvents:'none',zIndex:9999,whiteSpace:'nowrap',lineHeight:1.5}}>
          <div style={{fontWeight:500}}>{format(parseISO(tip.day.date),'MMM d, yyyy')}</div>
          {tip.day.seconds>0
            ? <div style={{color:'var(--amber-light)'}}>{fmtTime(tip.day.seconds)} · {tip.day.pages} pages</div>
            : <div style={{color:'var(--ink-400)'}}>No reading</div>}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:4,marginTop:8,justifyContent:'flex-end'}}>
        <span style={{fontSize:10,color:'var(--ink-400)',marginRight:4}}>Less</span>
        {[0,1,2,3,4].map(h => <div key={h} className={`heat-${h}`} style={{width:10,height:10,borderRadius:2}}/>)}
        <span style={{fontSize:10,color:'var(--ink-400)',marginLeft:4}}>More</span>
      </div>
    </div>
  )
}
