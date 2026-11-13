import { rangeLabel, type WeekRange } from '@/features/attendance-board/attendance-board.types'
import { toCsv } from '@/lib/csv'
import { formatDayMonth } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { LATE_SHIFTS, lateByShift, lateTotal, type LateReportRow } from './late.types'

const PERSON_HEAD = ['Họ tên', 'Email', 'Bộ phận', 'Loại nhân sự', 'Buổi']
const personCells = (row: LateReportRow, shift: string) => [
  displayName(row.user),
  row.user.email,
  row.department?.name ?? 'Chưa gán bộ phận',
  EMPLOYMENT_LABEL[row.employmentType],
  shift,
]

/** Theo ngày: mỗi người hai dòng Sáng, Chiều, ô là số phút muộn của ngày; cuối dòng là số lần và tổng phút trong các ngày đang xem. */
export function buildLateDayCsv(rows: LateReportRow[], days: string[]): string {
  const inRange = new Set(days)
  const header = [...PERSON_HEAD, ...days.map(formatDayMonth), 'Số lần', 'Tổng phút']
  const lines = rows.flatMap((row) => {
    const byShift = lateByShift(row.events)
    return LATE_SHIFTS.map(({ key, label }) => {
      const total = lateTotal(row.events, inRange, key)
      return [...personCells(row, label), ...days.map((d) => byShift[key].get(d) ?? ''), total.count, total.minutes]
    })
  })
  return toCsv([header, ...lines])
}

/** Tổng hợp tuần: số lần đi muộn từng tuần của mỗi ca, và tổng cả tháng. */
export function buildLateWeekCsv(rows: LateReportRow[], weeks: WeekRange[]): string {
  const weekDays = weeks.map((w) => new Set(w.days))
  const header = [...PERSON_HEAD, ...weeks.map((w) => `Tuần ${w.index + 1} (${rangeLabel(w.days)})`), 'Số lần', 'Tổng phút']
  const lines = rows.flatMap((row) =>
    LATE_SHIFTS.map(({ key, label }) => {
      const month = lateTotal(row.events, undefined, key)
      return [
        ...personCells(row, label),
        ...weekDays.map((days) => lateTotal(row.events, days, key).count),
        month.count,
        month.minutes,
      ]
    }),
  )
  return toCsv([header, ...lines])
}
