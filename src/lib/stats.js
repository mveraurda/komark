import { format, subDays, eachDayOfInterval } from 'date-fns'

export const formatTime = (s) => {
  if (!s || s <= 0) return '0m'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m}m`; if (m === 0) return `${h}h`; return `${h}h ${m}m`
}
export const progressPercent = (read, total) =>
  (!total ? 0 : Math.min(100, Math.round((read / total) * 100)))
export const bookStatus = (b) => {
  if (!b.total_read_pages) return 'unread'
  if (b.total_pages > 0 && b.total_read_pages >= b.total_pages * 0.9) return 'finished'
  return 'reading'
}
export const readingSpeed = (secs, pages) =>
  (secs && pages ? Math.round((pages / secs) * 3600) : null)
export const getGreeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
export const getTodayStats = (daily) => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const row = (daily || []).find(r => r.date === today)
  return { seconds: row?.total_seconds || 0, pages: row?.pages_read || 0 }
}

export function buildHeatmapGrid(daily) {
  const today = new Date(), start = subDays(today, 363)
  const byDate = Object.fromEntries((daily || []).map(r => [r.date, r]))
  const maxSec = Math.max(...(daily || []).map(r => r.total_seconds || 0), 1)
  return eachDayOfInterval({ start, end: today }).map(d => {
    const key = format(d, 'yyyy-MM-dd'), row = byDate[key]
    const secs = row?.total_seconds || 0, pages = row?.pages_read || 0
    let heat = 0
    if (secs > 0) { const r = secs/maxSec; heat = r<0.15?1:r<0.40?2:r<0.70?3:4 }
    return { date: key, heat, seconds: secs, pages }
  })
}

export function buildMonthlyData(daily) {
  const m = {}
  for (const r of daily || []) {
    const mo = r.date.slice(0,7)
    if (!m[mo]) m[mo] = { seconds:0, pages:0 }
    m[mo].seconds += r.total_seconds||0; m[mo].pages += r.pages_read||0
  }
  return Object.entries(m).map(([month,d]) => ({month,...d}))
    .sort((a,b) => a.month.localeCompare(b.month)).slice(-12)
}
