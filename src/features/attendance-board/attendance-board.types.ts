import type { EmploymentType, User } from '@/features/auth/auth.types'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import type { DayRecord } from '@/features/my-timesheet/my-timesheet.types'
import { formatDayMonth } from '@/lib/format'

/** Giờ "HH:MM" của vào sáng, ra sáng, vào chiều, ra chiều; null = chưa có. */
export type DayTimes = [string | null, string | null, string | null, string | null]

/** Một ô ngày của bảng: số tính công cùng cách tính với chốt công tháng. */
export interface BoardDay {
  date: string
  times: DayTimes
  /** Phút muộn (lượt vào) hoặc về sớm (lượt ra) của từng lượt, cùng thứ tự với `times`; null = chưa có giờ. */
  deviations: [number | null, number | null, number | null, number | null]
  /** Lượt quản lý đã bổ sung hoặc sửa (khác giờ chấm gốc), cùng thứ tự với `times`. */
  adjustedSlots: [boolean, boolean, boolean, boolean]
  lateMinutes: number
  /** Số ca đi muộn (0–2). */
  lateCount: number
  /** Số ca chỉ có một mốc (0–2), hôm nay chưa tính. */
  missingCount: number
  /** Công máy: mỗi ca đủ vào và ra được 0,5. */
  workdays: number
  /** Quản lý đã bổ sung hoặc sửa giờ. */
  adjusted: boolean
}

export interface BoardPerson {
  user: Pick<User, 'id' | 'email' | 'fullName' | 'isActive'>
  department: { id: string; name: string } | null
  employmentType: EmploymentType
}

export interface BoardRow extends BoardPerson {
  /** Chỉ những ngày có dữ liệu, tăng dần. */
  days: BoardDay[]
}

export interface AttendanceBoard {
  month: string
  today: string
  summary: { people: number; withData: number; missingCount: number; lateCount: number; adjustedDays: number }
  rows: BoardRow[]
}

export interface BoardDayDetail extends BoardPerson {
  date: string
  schedule: { morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string }
  record: DayRecord | null
  times: DayTimes
  /** Giờ gốc khi đã bổ sung; null = giờ đang dùng là giờ chấm gốc. */
  original: DayTimes | null
  editable: boolean
  lockedReason: string | null
}

export const SLOT_KEYS = ['morningIn', 'morningOut', 'afternoonIn', 'afternoonOut'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]

export type AdjustInput = Record<SlotKey, string | null> & { note: string }

export const SLOT_NAMES = ['Vào sáng', 'Ra sáng', 'Vào chiều', 'Ra chiều'] as const

/** Lượt cùng ca với từng lượt: vào sáng ↔ ra sáng, vào chiều ↔ ra chiều. */
const SLOT_PARTNER = [1, 0, 3, 2] as const

/**
 * Lượt bị thiếu: ca có một mốc mà mốc còn lại trống. Chỉ xét ngày có thiếu chấm theo server,
 * nên hôm nay (còn đang chấm) và ngày vào sáng, ra chiều không chấm trưa không bị tô.
 */
export function missingSlots(day: BoardDay): boolean[] {
  if (!day.missingCount) return [false, false, false, false]
  return day.times.map((t, i) => t === null && day.times[SLOT_PARTNER[i]] !== null)
}

/** Lỗi thứ tự giờ "HH:MM" (vào sáng < ra sáng <= vào chiều < ra chiều), null nếu hợp lệ. */
export function slotOrderError(times: DayTimes): string | null {
  const [morningIn, morningOut, afternoonIn, afternoonOut] = times
  if (morningIn && morningOut && morningIn >= morningOut) return 'Giờ ra ca sáng phải sau giờ vào ca sáng'
  if (afternoonIn && afternoonOut && afternoonIn >= afternoonOut) return 'Giờ ra ca chiều phải sau giờ vào ca chiều'
  const morningLast = morningOut ?? morningIn
  const afternoonFirst = afternoonIn ?? afternoonOut
  if (morningLast && afternoonFirst && morningLast > afternoonFirst) {
    return 'Giờ của ca chiều phải từ giờ cuối của ca sáng trở đi'
  }
  return null
}

/** Tuần từ thứ Hai đến Chủ nhật, cắt theo tháng. */
export interface WeekRange {
  index: number
  days: string[]
}

export function weeksOfMonth(month: string): WeekRange[] {
  const weeks: WeekRange[] = []
  for (const ymd of daysOfMonth(month)) {
    const monday = new Date(`${ymd}T00:00:00Z`).getUTCDay() === 1
    if (weeks.length === 0 || monday) weeks.push({ index: weeks.length, days: [] })
    weeks[weeks.length - 1].days.push(ymd)
  }
  return weeks
}

/** Giá trị "Cả tháng" của bộ chọn khoảng ngày. Radix Select không nhận giá trị rỗng. */
export const WHOLE_MONTH = 'all'

/** Tuần đang chứa hôm nay nếu là tháng hiện tại, không thì tuần đầu. */
export function defaultRange(month: string, today: string): string {
  const week = weeksOfMonth(month).find((w) => w.days.includes(today))
  return String(week?.index ?? 0)
}

/** Các ngày của khoảng đang chọn: một tuần, hoặc cả tháng. */
export function rangeDays(month: string, weeks: WeekRange[], range: string): string[] {
  return range === WHOLE_MONTH ? daysOfMonth(month) : (weeks[Number(range)]?.days ?? weeks[0].days)
}

/** "04 – 10/05", tuần một ngày thì "04/05". */
export function rangeLabel(days: string[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  return first === last ? formatDayMonth(first) : `${first.slice(8)} – ${formatDayMonth(last)}`
}

export interface DayTotals {
  workdays: number
  lateCount: number
  missingCount: number
  adjusted: number
}

export function totalsOf(days: readonly (BoardDay | undefined)[]): DayTotals {
  const totals: DayTotals = { workdays: 0, lateCount: 0, missingCount: 0, adjusted: 0 }
  for (const d of days) {
    if (!d) continue
    totals.workdays += d.workdays
    totals.lateCount += d.lateCount
    totals.missingCount += d.missingCount
    totals.adjusted += Number(d.adjusted)
  }
  totals.workdays = Math.round(totals.workdays * 100) / 100
  return totals
}

/** Tra ngày của một dòng theo "YYYY-MM-DD". */
export function dayIndex(row: BoardRow): Map<string, BoardDay> {
  return new Map(row.days.map((d) => [d.date, d]))
}
