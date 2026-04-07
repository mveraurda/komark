const path = require('path')
const fs   = require('fs')
let SQL = null

async function getSql() {
  if (SQL) return SQL
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs({
    locateFile: f => path.join(__dirname, '../node_modules/sql.js/dist/', f)
  })
  return SQL
}

function rows(results) {
  if (!results || !results.length) return []
  const { columns, values } = results[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

async function queryVocab(vocabPath) {
  if (!fs.existsSync(vocabPath)) return []
  // Copy all WAL files to a temp path so sql.js can read them merged
  const tmp = vocabPath + '.qtmp'
  fs.copyFileSync(vocabPath, tmp)
  if (fs.existsSync(vocabPath + '-wal')) fs.copyFileSync(vocabPath + '-wal', tmp + '-wal')
  if (fs.existsSync(vocabPath + '-shm')) fs.copyFileSync(vocabPath + '-shm', tmp + '-shm')
  // Use a child process with system node (not Electron's) to checkpoint and export JSON
  const { execFileSync } = require('child_process')
  const script = `
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(${JSON.stringify(tmp)})
    db.exec('PRAGMA wal_checkpoint(PASSIVE)')
    const rows = db.prepare(\`
      SELECT v.word, v.create_time, v.review_count, v.streak_count,
        v.prev_context, v.next_context, t.name AS book_title
      FROM vocabulary v LEFT JOIN title t ON v.title_id = t.id
      ORDER BY v.create_time DESC\`).all()
    db.close()
    process.stdout.write(JSON.stringify(rows))
  `
  try {
    const nodeBin = ['/opt/homebrew/bin/node','/usr/local/bin/node','/usr/bin/node'].find(p => { try { require('fs').accessSync(p); return true } catch { return false } }) || 'node'
    const out = execFileSync(nodeBin, ['-e', script], { timeout: 10000 })
    return JSON.parse(out.toString())
  } catch {
    // Fallback to sql.js if system node fails
    const SQL = await getSql()
    const db = new SQL.Database(fs.readFileSync(tmp))
    try { return rows(db.exec(`SELECT v.word, v.create_time, v.review_count, v.streak_count, v.prev_context, v.next_context, t.name AS book_title FROM vocabulary v LEFT JOIN title t ON v.title_id=t.id ORDER BY v.create_time DESC`)) }
    finally { db.close() }
  } finally {
    try { fs.unlinkSync(tmp) } catch {}
    try { fs.unlinkSync(tmp + '-wal') } catch {}
    try { fs.unlinkSync(tmp + '-shm') } catch {}
  }
}

async function queryDB(dbPath, type, params = {}) {
  const SQL = await getSql()
  const db  = new SQL.Database(fs.readFileSync(dbPath))
  try {
    switch (type) {
      case 'books':        return getBooks(db)
      case 'daily':        return getDailyStats(db, params.days || 365)
      case 'summary':      return getSummary(db, params.period || 'all')
      case 'bookSessions': return getBookSessions(db, params.bookId)
      default:             return null
    }
  } finally { db.close() }
}

function getBooks(db) {
  return rows(db.exec(`
    SELECT b.id, b.title, b.authors, b.md5, b.pages AS total_pages, b.last_open,
      b.total_read_time, b.total_read_pages, b.highlights, b.notes,
      MIN(ps.start_time) AS first_read, MAX(ps.start_time) AS last_read,
      COUNT(DISTINCT date(ps.start_time,'unixepoch','localtime')) AS days_read
    FROM book b LEFT JOIN page_stat_data ps ON b.id = ps.id_book
    WHERE b.authors != 'N/A' AND b.pages >= 3 AND b.pages <= 10000
    GROUP BY b.id ORDER BY b.last_open DESC`))
}

function getDailyStats(db, days) {
  return rows(db.exec(`
    SELECT date(start_time,'unixepoch','localtime') AS date,
      SUM(duration) AS total_seconds, COUNT(DISTINCT page) AS pages_read
    FROM page_stat_data ps
    JOIN book b ON ps.id_book = b.id
    WHERE ps.start_time > strftime('%s','now','-${days} days')
      AND ps.start_time > 0 AND ps.duration > 0
      AND b.authors != 'N/A' AND b.pages >= 3 AND b.pages <= 10000
    GROUP BY date ORDER BY date ASC`))
}

function getSummary(db, period) {
  const since = {
    week:  "AND start_time > strftime('%s','now','-7 days')",
    month: "AND start_time > strftime('%s','now','-30 days')",
    year:  "AND start_time > strftime('%s','now','-365 days')",
  }[period] || ''
  const r = rows(db.exec(`
    SELECT SUM(ps.duration) AS total_seconds, COUNT(DISTINCT ps.page) AS total_pages,
      COUNT(DISTINCT date(ps.start_time,'unixepoch','localtime')) AS days_read,
      COUNT(DISTINCT ps.id_book) AS books_touched
    FROM page_stat_data ps
    JOIN book b ON ps.id_book = b.id
    WHERE ps.start_time > 0 AND ps.duration > 0
      AND b.authors != 'N/A' AND b.pages >= 3 AND b.pages <= 10000
    ${since}`))[0] || {}
  return { ...r, streak: calcStreak(db) }
}

function getBookSessions(db, bookId) {
  if (!bookId) return []
  const stmt = db.prepare(`
    SELECT date(start_time,'unixepoch','localtime') AS date,
      SUM(duration) AS seconds, COUNT(DISTINCT page) AS pages
    FROM page_stat_data WHERE id_book=:id AND start_time>0 AND duration>0
    GROUP BY date ORDER BY date ASC`)
  const out = []
  stmt.bind({ ':id': bookId })
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}

function calcStreak(db) {
  const dates = rows(db.exec(`
    SELECT DISTINCT date(start_time,'unixepoch','localtime') AS date
    FROM page_stat_data WHERE start_time>0 AND duration>0 ORDER BY date DESC`))
  if (!dates.length) return 0
  let streak = 0
  let expected = new Date(); expected.setHours(0,0,0,0)
  for (const { date } of dates) {
    const d = new Date(date + 'T00:00:00')
    const diff = Math.round((expected - d) / 86400000)
    if (diff === 0 || (diff === 1 && streak === 0)) {
      streak++; expected.setDate(expected.getDate() - 1)
    } else break
  }
  return streak
}

module.exports = { queryDB, queryVocab }
