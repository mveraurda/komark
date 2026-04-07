import React from 'react'

export default function Welcome({ onGoToSettings }) {
  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:48,textAlign:'center'}}>
      <div style={{maxWidth:420}}>
        <div style={{width:72,height:72,background:'var(--amber-subtle)',border:'2px solid var(--amber-light)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 28px'}}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h10v20H4z"/>
            <path d="M14 6h14v20H14z"/>
            <path d="M4 6c3 2 7 2 10 0"/>
            <path d="M14 6c3 2 7 2 10 0 "/>
          </svg>
        </div>
        <h1 style={{margin:'0 0 12px',fontSize:'1.6rem'}}>Welcome to KoMark</h1>
        <p style={{margin:'0 0 32px',fontSize:14,color:'var(--ink-400)',lineHeight:1.7}}>
          Your Kindle reading companion. Connect to your KOReader device over WiFi to sync reading stats, highlights, and vocabulary.
        </p>
        <div style={{background:'var(--cream-dark)',border:'1px solid var(--cream-border)',borderRadius:10,padding:24,marginBottom:32,textAlign:'left'}}>
          <p style={{margin:'0 0 14px',fontSize:11,fontWeight:500,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--ink-400)'}}>Getting started</p>
          {[
            ['1', 'Enable SSH on KOReader', 'Menu → Tools → Network → SSH Server'],
            ['2', 'Note your device IP', 'Shown in the SSH Server screen'],
            ['3', 'Configure in Settings', 'Enter the IP and tap Test Connection'],
          ].map(([n, title, sub]) => (
            <div key={n} style={{display:'flex',gap:14,marginBottom:14,alignItems:'flex-start'}}>
              <span style={{width:22,height:22,borderRadius:'50%',background:'var(--amber-subtle)',border:'1px solid var(--amber-light)',color:'var(--amber)',fontSize:11,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{n}</span>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:500,color:'var(--ink-900)'}}>{title}</p>
                <p style={{margin:'2px 0 0',fontSize:11,color:'var(--ink-400)'}}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onGoToSettings} style={{padding:'10px 28px',borderRadius:6,border:'none',background:'var(--amber)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
          Open Settings →
        </button>
      </div>
    </div>
  )
}
