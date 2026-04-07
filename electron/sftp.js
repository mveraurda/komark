const SftpClient = require('ssh2-sftp-client')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const { ensureKeyPair } = require('./sshkey')

let _userData = null
function setUserData(p) { _userData = p }

function makeConnOpts(settings, { usePassword = false } = {}) {
  const connOpts = {
    host: settings.host, port: settings.port || 2222,
    username: settings.username || 'root',
    readyTimeout: 10000, retries: 1,
  }
  if (usePassword) {
    // Password auth for initial key upload — blank password works on most KOReader devices
    connOpts.password = settings.password || ''
  } else {
    // Always prefer app-managed key
    if (_userData) {
      const { privateKey } = ensureKeyPair(_userData)
      connOpts.privateKey = privateKey
    }
    // Fallback to user-specified or auto-detected system key
    if (!connOpts.privateKey) {
      const keyPaths = settings.sshKeyPath
        ? [settings.sshKeyPath.replace(/^~/, os.homedir())]
        : ['id_ed25519', 'id_rsa', 'id_ecdsa'].map(k => path.join(os.homedir(), '.ssh', k))
      for (const kp of keyPaths) {
        if (fs.existsSync(kp)) { connOpts.privateKey = fs.readFileSync(kp); break }
      }
    }
  }
  return connOpts
}

// Try key auth first; if it fails, upload our public key via password auth then retry
async function connectWithAutoSetup(sftp, settings) {
  // First attempt: key auth
  try {
    await sftp.connect(makeConnOpts(settings))
    return
  } catch (e) {
    if (!e.message?.includes('authentication') && !e.message?.includes('All configured') && !e.message?.includes('handshake')) throw e
  }
  // Key auth failed — upload our public key via password
  const sftp2 = new SftpClient()
  try {
    await sftp2.connect(makeConnOpts(settings, { usePassword: true }))
    const { publicKey } = ensureKeyPair(_userData)
    const authKeysPath = '/mnt/us/koreader/settings/SSH/authorized_keys'
    // Read existing keys if any, append ours if not already there
    let existing = ''
    try { existing = (await sftp2.get(authKeysPath)).toString() } catch {}
    if (!existing.includes('komark')) {
      await sftp2.put(Buffer.from(existing + publicKey), authKeysPath)
    }
  } finally {
    await sftp2.end().catch(() => {})
  }
  // Second attempt: key auth should work now
  await sftp.connect(makeConnOpts(settings))
}

async function performSync(settings, localPath) {
  const sftp = new SftpClient()
  try {
    await connectWithAutoSetup(sftp, settings)
    const remote = settings.remotePath || '/mnt/us/koreader/settings/statistics.sqlite3'
    const tmp = localPath + '.tmp'
    await sftp.fastGet(remote, tmp)
    try { await sftp.fastGet(remote + '-wal', tmp + '-wal') } catch {}
    try { await sftp.fastGet(remote + '-shm', tmp + '-shm') } catch {}
    fs.renameSync(tmp, localPath)
    try { fs.renameSync(tmp + '-wal', localPath + '-wal') } catch {}
    try { fs.renameSync(tmp + '-shm', localPath + '-shm') } catch {}
  } finally {
    await sftp.end().catch(() => {})
  }
}

// Recursively find all .sdr metadata lua files under a remote dir
async function findSdrFiles(sftp, remoteDir, results = []) {
  let list
  try { list = await sftp.list(remoteDir) } catch { return results }
  for (const item of list) {
    const full = remoteDir + '/' + item.name
    if (item.type === 'd') {
      if (item.name.endsWith('.sdr')) {
        let inner
        try { inner = await sftp.list(full) } catch { continue }
        for (const f of inner) {
          if (f.name.startsWith('metadata.') && f.name.endsWith('.lua')) {
            const ext = f.name.replace('metadata.', '').replace('.lua', '')
            results.push({ lua: full + '/' + f.name, ext })
          }
        }
      } else {
        await findSdrFiles(sftp, full, results)
      }
    }
  }
  return results
}

// Parse partial_md5_checksum from a lua metadata file buffer
function parseMd5(content) {
  const m = content.match(/\["partial_md5_checksum"\]\s*=\s*"([a-f0-9]+)"/)
  return m ? m[1] : null
}

// Parse all zip entries from an epub buffer (handles the full zip structure)
function parseZip(buf) {
  const files = {}
  let offset = 0
  while (offset + 30 < buf.length) {
    const sig = buf.readUInt32LE(offset)
    if (sig !== 0x04034b50) {
      // Not a local file header — scan forward for next one
      let found = false
      for (let i = offset + 1; i < buf.length - 4; i++) {
        if (buf.readUInt32LE(i) === 0x04034b50) { offset = i; found = true; break }
      }
      if (!found) break
      continue
    }
    const compression = buf.readUInt16LE(offset + 8)
    const compSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    if (offset + 30 + nameLen > buf.length) break
    const name = buf.slice(offset + 30, offset + 30 + nameLen).toString('utf8')
    const dataStart = offset + 30 + nameLen + extraLen
    if (dataStart + compSize > buf.length) break
    const compressed = buf.slice(dataStart, dataStart + compSize)
    try {
      files[name] = compression === 0 ? compressed : zlib.inflateRawSync(compressed)
    } catch { /* skip unreadable entry */ }
    offset = dataStart + compSize
  }
  return files
}

// Validate image bytes — check magic bytes for JPEG or PNG
function isValidImage(buf) {
  if (!buf || buf.length < 8) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return buf.length > 1000
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return buf.length > 1000
  return false
}

function extractEpubCover(epubBytes) {
  const buf = Buffer.isBuffer(epubBytes) ? epubBytes : Buffer.from(epubBytes)
  const files = parseZip(buf)

  try {
    const containerXml = files['META-INF/container.xml']
    if (!containerXml) return null
    const opfPathMatch = containerXml.toString().match(/full-path="([^"]+)"/)
    if (!opfPathMatch) return null
    const opfPath = opfPathMatch[1]
    const opf = files[opfPath]
    if (!opf) return null
    const opfStr = opf.toString()
    const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

    function resolve(href) {
      if (!href) return null
      const full = href.startsWith('/') ? href.slice(1) : opfDir + href
      // Also try URL-decoded version
      const decoded = decodeURIComponent(full)
      return files[full] || files[decoded] || files[href] || null
    }

    // Strategy 1: <meta name="cover" content="id"/> → find item with that id
    const coverMetaMatch = opfStr.match(/name="cover"\s+content="([^"]+)"/i) ||
                           opfStr.match(/content="([^"]+)"\s+name="cover"/i)
    if (coverMetaMatch) {
      const coverId = coverMetaMatch[1]
      const itemMatch = opfStr.match(new RegExp(`id="${coverId}"[^>]*href="([^"]+)"`, 'i')) ||
                        opfStr.match(new RegExp(`href="([^"]+)"[^>]*id="${coverId}"`, 'i'))
      if (itemMatch) {
        const img = resolve(itemMatch[1])
        if (isValidImage(img)) return img
      }
    }

    // Strategy 2: item with id containing "cover" and media-type image
    const coverItemMatch = opfStr.match(/id="[^"]*cover[^"]*"[^>]*href="([^"]+\.(jpg|jpeg|png))/i) ||
                           opfStr.match(/href="([^"]+\.(jpg|jpeg|png))[^"]*"[^>]*id="[^"]*cover[^"]*"/i)
    if (coverItemMatch) {
      const img = resolve(coverItemMatch[1])
      if (isValidImage(img)) return img
    }

    // Strategy 3: first image in spine order (look at all image items, pick largest)
    const imgMatches = [...opfStr.matchAll(/href="([^"]+\.(jpg|jpeg|png))"/gi)]
    let best = null, bestSize = 0
    for (const m of imgMatches) {
      const img = resolve(m[1])
      if (isValidImage(img) && img.length > bestSize) { best = img; bestSize = img.length }
    }
    if (best) return best

    return null
  } catch { return null }
}

async function syncCovers(settings, coversDir) {
  if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true })
  const sftp = new SftpClient()
  try {
    await connectWithAutoSetup(sftp, settings)
    const sdrFiles = await findSdrFiles(sftp, '/mnt/us/books')

    for (const { lua, ext } of sdrFiles) {
      if (ext !== 'epub') continue
      try {
        const luaBuf = await sftp.get(lua)
        const content = Buffer.isBuffer(luaBuf) ? luaBuf.toString() : String(luaBuf)
        const md5 = parseMd5(content)
        if (!md5) continue

        const coverPath = path.join(coversDir, md5 + '.jpg')
        // Skip if already cached and valid
        if (fs.existsSync(coverPath) && fs.statSync(coverPath).size > 1000) continue

        const sdrDir = lua.slice(0, lua.lastIndexOf('/'))
        const bookDir = sdrDir.slice(0, sdrDir.lastIndexOf('/'))
        const bookName = sdrDir.slice(sdrDir.lastIndexOf('/') + 1).replace('.sdr', '')
        const epubPath = bookDir + '/' + bookName + '.' + ext

        const epubBuf = await sftp.get(epubPath)
        const buf = Buffer.isBuffer(epubBuf) ? epubBuf : Buffer.from(epubBuf)
        const coverData = extractEpubCover(buf)
        if (coverData && isValidImage(coverData)) fs.writeFileSync(coverPath, coverData)
      } catch { /* skip failures */ }
    }
  } finally {
    await sftp.end().catch(() => {})
  }
}

// Parse annotations array from lua metadata file — only real highlights (have pos0/pos1)
function parseAnnotations(content, md5) {
  const annotations = []
  const block = content.match(/\["annotations"\]\s*=\s*\{([\s\S]*?)\},\s*\["cache/)
  if (!block) return annotations
  const inner = block[1]
  const entries = inner.split(/\[\d+\]\s*=\s*\{/)
  for (const entry of entries.slice(1)) {
    // Only process real highlights — they have pos0/pos1 fields
    if (!entry.includes('"pos0"')) continue
    const get = (key) => {
      // Handle multi-line strings with \n
      const m = entry.match(new RegExp(`\\["${key}"\\]\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`))
      return m ? m[1].replace(/\\n/g, '\n').replace(/\\\\/g, '\\') : null
    }
    const getNum = (key) => { const m = entry.match(new RegExp(`\\["${key}"\\]\\s*=\\s*(\\d+)`)); return m ? parseInt(m[1]) : null }
    const text = get('text')
    if (!text || !text.trim()) continue
    annotations.push({
      md5,
      text: text.trim(),
      note: get('note')?.trim() || null,
      chapter: get('chapter'),
      datetime: get('datetime'),
      pageno: getNum('pageno'),
    })
  }
  return annotations
}

async function syncAnnotations(settings, annotationsPath) {
  const sftp = new SftpClient()
  const allAnnotations = []
  try {
    await connectWithAutoSetup(sftp, settings)
    const sdrFiles = await findSdrFiles(sftp, '/mnt/us/books')
    for (const { lua } of sdrFiles) {
      try {
        const buf = await sftp.get(lua)
        const content = Buffer.isBuffer(buf) ? buf.toString() : String(buf)
        const md5 = parseMd5(content)
        if (!md5) continue
        const annotations = parseAnnotations(content, md5)
        allAnnotations.push(...annotations)
      } catch { /* skip */ }
    }
    fs.writeFileSync(annotationsPath, JSON.stringify(allAnnotations, null, 2))
  } finally {
    await sftp.end().catch(() => {})
  }
  return allAnnotations.length
}

async function syncVocab(settings, vocabPath) {
  const sftp = new SftpClient()
  try {
    await connectWithAutoSetup(sftp, settings)
    const remote = '/mnt/us/koreader/settings/vocabulary_builder.sqlite3'
    const tmp = vocabPath + '.tmp'
    await sftp.fastGet(remote, tmp)
    // Also grab WAL and SHM files so the DB is complete
    try { await sftp.fastGet(remote + '-wal', tmp + '-wal') } catch {}
    try { await sftp.fastGet(remote + '-shm', tmp + '-shm') } catch {}
    fs.renameSync(tmp, vocabPath)
    try { fs.renameSync(tmp + '-wal', vocabPath + '-wal') } catch {}
    try { fs.renameSync(tmp + '-shm', vocabPath + '-shm') } catch {}
  } finally {
    await sftp.end().catch(() => {})
  }
}

module.exports = { performSync, syncCovers, syncAnnotations, syncVocab, setUserData }
