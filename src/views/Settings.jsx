import React, { useEffect, useState } from 'react'

const INTERVALS = [[0,'Manual only'],[5,'Every 5 minutes'],[10,'Every 10 minutes'],[30,'Every 30 minutes'],[60,'Every hour']]

function Field({ label, hint, children }) {
  return (
    <div style={{marginBottom:18}}>
      <label style={{display:'block',fontSize:12,fontWeight:500,color:'var(--ink-700)',marginBottom:6}}>{label}</label>
      {children}
      {hint&&<p style={{margin:'5px 0 0',fontSize:11,color:'var(--ink-400)'}}>{hint}</p>}
    </div>
  )
}
function Input({ value, onChange, placeholder, type='text', mono }) {
  return (
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{display:'block',width:'100%',padding:'8px 12px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream)',color:'var(--ink-900)',fontSize:13,fontFamily:mono?'ui-monospace,monospace':'Inter,sans-serif',outline:'none'}}
      onFocus={e=>e.target.style.borderColor='var(--amber)'}
      onBlur={e=>e.target.style.borderColor='var(--cream-border)'}
    />
  )
}

export default function Settings({ onSaved }) {
  const [form, setForm]             = useState(null)
  const [testing, setTest]          = useState(false)
  const [finding, setFinding]       = useState(false)
  const [scanSubnet, setScanSubnet] = useState(null)
  const [result, setResult]         = useState(null)
  const [saved, setSaved]           = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    window.komark.getSettings().then(setForm)
    const unsub = window.komark.onKindleScanning(d => setScanSubnet(d.subnet))
    return unsub
  }, [])
  if (!form) return null

  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setSaved(false); setResult(null) }

  async function handleSave() { await window.komark.saveSettings(form); setSaved(true); onSaved?.(); setTimeout(()=>setSaved(false),2000) }
  async function handleFind() {
    setFinding(true); setResult(null); setScanSubnet(null)
    const r = await window.komark.discoverKindle()
    setFinding(false); setScanSubnet(null)
    if (r.ok) { set('host', r.host); setResult({ok:true, msg:`Found device at ${r.host} — save settings to connect.`}) }
    else setResult({ok:false, msg:r.error})
  }
  async function handleTest() {
    if (!form.host) { setResult({ok:false,msg:'Enter a device IP address first.'}); return }
    setTest(true); setResult(null)
    const r = await window.komark.syncNow()
    setTest(false); setResult({ok:r.ok,msg:r.ok?'Connected! Synced successfully.':`Failed: ${r.error}`})
    if (r.ok) onSaved?.()
  }

  return (
    <div className="fade-in" style={{padding:'48px',maxWidth:540,margin:'0 auto'}}>
      <h1 style={{margin:'0 0 4px'}}>Settings</h1>
      <p className="muted" style={{marginBottom:32}}>Connect KoMark to your KOReader device</p>

      <p className="label">Device Connection</p>
      <hr className="divider" style={{marginBottom:20}}/>

      <Field label="Device IP Address" hint="KOReader → Tools → Network → SSH Server — use the IP shown there, or tap Find Device">
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Input value={form.host} onChange={v=>set('host',v)} placeholder="e.g. 192.168.1.42" mono/>
          <button onClick={handleFind} disabled={finding} style={{flexShrink:0,padding:'8px 14px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream-dark)',color:finding?'var(--ink-300)':'var(--ink-600)',fontSize:12,cursor:finding?'default':'pointer',fontFamily:'Inter,sans-serif',whiteSpace:'nowrap'}}>
            {finding ? 'Scanning…' : 'Find Device'}
          </button>
        </div>
        {finding && scanSubnet && <p style={{margin:'6px 0 0',fontSize:11,color:'var(--ink-400)',fontFamily:'ui-monospace,monospace'}}>Scanning {scanSubnet}.x…</p>}
      </Field>

      <div style={{marginBottom:18}}>
        <button onClick={()=>setShowAdvanced(v=>!v)} style={{background:'none',border:'none',padding:0,fontSize:12,color:'var(--ink-400)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
          {showAdvanced ? '▾ Hide advanced' : '▸ Advanced options'}
        </button>
      </div>

      {showAdvanced && (
        <>
          <Field label="SSH Port" hint="Default is 2222">
            <Input value={form.port} onChange={v=>set('port',Number(v))} placeholder="2222" mono/>
          </Field>
          <Field label="Username" hint="Usually 'root'">
            <Input value={form.username} onChange={v=>set('username',v)} placeholder="root" mono/>
          </Field>
          <Field label="Password" hint="Only needed if your device has a password set. Leave blank to use SSH key auth.">
            <Input value={form.password} onChange={v=>set('password',v)} placeholder="leave blank if none" type="password" mono/>
          </Field>
          <Field label="SSH Key Path" hint="Leave blank to auto-detect (~/.ssh/id_ed25519, id_rsa, id_ecdsa)">
            <Input value={form.sshKeyPath} onChange={v=>set('sshKeyPath',v)} placeholder="~/.ssh/id_ed25519" mono/>
          </Field>
          <Field label="Statistics File Path" hint="Only change if KOReader stores files in a non-standard location">
            <Input value={form.remotePath} onChange={v=>set('remotePath',v)} placeholder="/mnt/us/koreader/settings/statistics.sqlite3" mono/>
          </Field>
        </>
      )}

      <p className="label" style={{marginTop:8}}>Auto-Sync</p>
      <hr className="divider" style={{marginBottom:20}}/>
      <Field label="Sync interval">
        <select value={form.syncInterval} onChange={e=>set('syncInterval',Number(e.target.value))} style={{padding:'8px 10px',borderRadius:6,border:'1px solid var(--cream-border)',background:'var(--cream)',color:'var(--ink-900)',fontSize:13,fontFamily:'Inter,sans-serif',outline:'none',cursor:'pointer'}}>
          {INTERVALS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </Field>

      <div style={{padding:'14px 18px',background:'var(--amber-subtle)',border:'1px solid var(--amber-light)',borderRadius:8,marginBottom:24}}>
        <p style={{margin:'0 0 6px',fontSize:12,fontWeight:500,color:'var(--amber)'}}>How to connect</p>
        <ol style={{margin:0,padding:'0 0 0 16px',fontSize:12,color:'var(--ink-700)',lineHeight:1.9}}>
          <li>Enable SSH on KOReader: ☰ → Tools (⚙) → Network → SSH Server</li>
          <li>Copy your SSH public key to the device:<br/>
            <code style={{fontSize:11,background:'var(--cream-dark)',padding:'2px 6px',borderRadius:4}}>ssh-copy-id -p 2222 root@YOUR_DEVICE_IP</code>
          </li>
          <li>Enter the IP above and tap Test Connection</li>
        </ol>
      </div>

      {result&&<div style={{padding:'11px 16px',borderRadius:6,background:result.ok?'#F0F7F0':'#FDF0F0',border:`1px solid ${result.ok?'#B8D8B8':'#F0C0C0'}`,marginBottom:20,fontSize:13,color:result.ok?'#3A6B3A':'#8B3A3A'}}>{result.msg}</div>}

      <div style={{display:'flex',gap:10}}>
        <button onClick={handleTest} disabled={testing} style={{padding:'9px 20px',borderRadius:6,border:'1px solid var(--cream-border)',background:'transparent',color:testing?'var(--ink-300)':'var(--ink-600)',fontSize:13,cursor:testing?'default':'pointer',fontFamily:'Inter,sans-serif'}}>
          {testing?'Connecting…':'Test Connection'}
        </button>
        <button onClick={handleSave} style={{padding:'9px 20px',borderRadius:6,border:'none',background:saved?'var(--ink-400)':'var(--amber)',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
          {saved?'Saved!':'Save Settings'}
        </button>
      </div>
    </div>
  )
}
