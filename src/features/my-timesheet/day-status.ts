import type { AttendanceRecord, ShiftRecord } from '@/features/attendance/attendance.types'

export type DayKind = 'full' | 'morning' | 'afternoon' | 'missing' | 'none'

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  full: 'Cả ngày',
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  missing: 'Thiếu mốc',
  none: 'Không có ca',
}

export const DAY_KIND_STYLE: Record<DayKind, string> = {
  full: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  morning: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  afternoon: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  missing: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  none: 'bg-muted/40 text-muted-foreground',
}

/** Vào sáng và ra chiều nhưng không chấm trưa: vẫn là một ngày đủ, giống cách BE tính công. */
export function isWholeDayWithoutLunch(r: AttendanceRecord): boolean {
  return !!r.morning.inAt && !!r.afternoon.outAt && !r.morning.outAt && !r.afternoon.inAt
}

/** Ca chỉ có một trong hai mốc. Hôm nay còn đang làm nên chưa tính là thiếu. */
export function isShiftMissing(shift: ShiftRecord, record: AttendanceRecord, live: boolean): boolean {
  if (live || isWholeDayWithoutLunch(record)) return false
  return !shift.inAt !== !shift.outAt
}

export function dayKind(record: AttendanceRecord | undefined, live: boolean): DayKind {
  if (!record) return 'none'
  if (isWholeDayWithoutLunch(record)) return 'full'
  if (isShiftMissing(record.morning, record, live) || isShiftMissing(record.afternoon, record, live)) return 'missing'
  const morning = !!(record.morning.inAt || record.morning.outAt)
  const afternoon = !!(record.afternoon.inAt || record.afternoon.outAt)
  if (morning && afternoon) return 'full'
  if (morning) return 'morning'
  return afternoon ? 'afternoon' : 'none'
}

/** Các ngày "YYYY-MM-DD" trong tháng. */
export function daysOfMonth(month: string): string[] {
  const [year, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** Số ô trống đầu lịch khi tuần bắt đầu từ thứ Hai. */
export function leadingBlanks(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7
}
