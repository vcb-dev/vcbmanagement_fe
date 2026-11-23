const TZ = 'Asia/Ho_Chi_Minh'
const TIME_FMT = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const DAY_FMT = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ })
const WORK_DATE_SHORT = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const WORK_DATE_LONG = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
const TODAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  return TIME_FMT.format(new Date(iso))
}

/** 495 → "8g 15p" */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}p`
  return m ? `${h}g ${m}p` : `${h}g`
}

/** 240 → "4", 226 → "3.77", 210 → "3.5" */
export function formatHours(minutes: number): string {
  return String(Math.round((minutes / 60) * 100) / 100)
}

/** 9 → "00:09", 75 → "01:15" */
export function formatClockMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** 1513 → "25 giờ 13 phút", 20 → "20 phút" */
export function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  if (h === 0) return `${minutes} phút`
  return `${h} giờ ${String(minutes % 60).padStart(2, '0')} phút`
}

/** "2026-11-08" → "08/11" */
export function formatDayMonth(ymd: string): string {
  return `${ymd.slice(8)}/${ymd.slice(5, 7)}`
}

/** "2026-11-02" → "T2", "2026-11-08" → "CN" */
export function weekdayShort(ymd: string): string {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay()
  return day === 0 ? 'CN' : `T${day + 1}`
}

/** "2026-11-02" → "T2, 02/11" */
export function formatWorkDate(ymd: string, opts?: { long?: boolean }): string {
  return (opts?.long ? WORK_DATE_LONG : WORK_DATE_SHORT).format(new Date(`${ymd}T00:00:00`))
}

export function todayYmd(): string {
  return TODAY_FMT.format(new Date())
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

/** "2026-01-12" → "12/01/2026" */
export function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

/** Bỏ dấu và chữ hoa để tìm kiếm tiếng Việt: "Đỗ Thị" → "do thi". */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
}

/** "2026-11" → "Tháng 11/2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  return `Tháng ${Number(m)}/${y}`
}

/** ISO → "15:20 · 10/11/2026" theo giờ Việt Nam. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${TIME_FMT.format(date)} · ${DAY_FMT.format(date)}`
}
