import { toCsv } from '@/lib/csv'
import { formatDayMonth } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { dayIndex, rangeLabel, totalsOf, type BoardDay, type BoardRow, type WeekRange } from './attendance-board.types'

const personCells = (row: BoardRow) => [
  displayName(row.user),
  row.user.email,
  row.department?.name ?? 'Chưa gán bộ phận',
  EMPLOYMENT_LABEL[row.employmentType],
]
const PERSON_HEAD = ['Họ tên', 'Email', 'Bộ phận', 'Loại nhân sự']

/** "08:10-12:02 / 13:31-?" và "(bổ sung)" nếu quản lý đã sửa; mốc thiếu ghi "?". */
function dayText(day: BoardDay | undefined): string {
  if (!day) return ''
  const [morningIn, morningOut, afternoonIn, afternoonOut] = day.times
  const shifts = [
    [morningIn, morningOut],
    [afternoonIn, afternoonOut],
  ]
    .filter(([a, b]) => a || b)
    .map(([a, b]) => `${a ?? '?'}-${b ?? '?'}`)
  return shifts.join(' / ') + (day.adjusted ? ' (bổ sung)' : '')
}

/** Theo ngày: giờ từng ca của mỗi ngày đang xem, giống bảng; tổng công xem ở Chốt công tháng. */
export function buildDayCsv(rows: BoardRow[], days: string[]): string {
  const header = [...PERSON_HEAD, ...days.map(formatDayMonth)]
  const lines = rows.map((row) => {
    const byDate = dayIndex(row)
    return [...personCells(row), ...days.map((d) => dayText(byDate.get(d)))]
  })
  return toCsv([header, ...lines])
}

/** Tổng hợp tuần: công và số lần thiếu chấm của từng tuần. Số giữ dấu chấm để Excel đọc được là số. */
export function buildWeekCsv(rows: BoardRow[], weeks: WeekRange[]): string {
  const label = (w: WeekRange) => `tuần ${w.index + 1} (${rangeLabel(w.days)})`
  const header = [
    ...PERSON_HEAD,
    ...weeks.map((w) => `Công ${label(w)}`),
    'Tổng công',
    ...weeks.map((w) => `Thiếu chấm ${label(w)}`),
    'Tổng thiếu chấm',
  ]
  const lines = rows.map((row) => {
    const byDate = dayIndex(row)
    const perWeek = weeks.map((w) => totalsOf(w.days.map((d) => byDate.get(d))))
    const month = totalsOf(row.days)
    return [
      ...personCells(row),
      ...perWeek.map((t) => t.workdays),
      month.workdays,
      ...perWeek.map((t) => t.missingCount),
      month.missingCount,
    ]
  })
  return toCsv([header, ...lines])
}
