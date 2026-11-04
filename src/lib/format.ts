const TZ = 'Asia/Ho_Chi_Minh'

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

/** 495 → "8g 15p" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}p`
  return m ? `${h}g ${m}p` : `${h}g`
}

/** "2026-11-02" → "T2, 02/11" */
export function formatWorkDate(ymd: string, opts?: { long?: boolean }): string {
  const date = new Date(`${ymd}T00:00:00`)
  return date.toLocaleDateString('vi-VN', {
    weekday: opts?.long ? 'long' : 'short',
    day: '2-digit',
    month: '2-digit',
    ...(opts?.long ? { year: 'numeric' } : {}),
  })
}

export function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

/** "2026-11" → "Tháng 11/2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  return `Tháng ${Number(m)}/${y}`
}
