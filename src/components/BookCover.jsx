import React, { useState, useEffect } from 'react'

export default function BookCover({ md5, title, size = 'card' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    if (!md5) return
    window.komark.getCover(md5).then(d => { if (d) setSrc(d) })
  }, [md5])

  const dims = {
    card:   { w: '100%', h: 200 },
    detail: { w: 120,    h: 180 },
    small:  { w: 52,     h: 72  },
  }[size]

  if (src) return <img src={src} alt={title} style={{width:dims.w, height:dims.h, objectFit:'cover', borderRadius: size==='small'?3:4, display:'block', flexShrink:0}}/>
  return (
    <div style={{width:dims.w, height:dims.h, background:'var(--amber-subtle)', borderRadius: size==='small'?3:4, borderLeft: size==='detail'?'4px solid var(--amber)':'none', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
      <span style={{fontFamily:'Lora,serif', fontSize: size==='small'?'1.5rem':'2rem', color:'var(--amber)', opacity: size==='small'?0.7:0.6}}>{(title||'?')[0]}</span>
    </div>
  )
}
