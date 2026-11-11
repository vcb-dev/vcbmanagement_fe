import { formatDayMonth, shiftMonth, shiftYmd } from '@/lib/format'

export type GridMode = 'week' | 'month'

export interface DateRange {
  from: string
  to: string
}

/**
 * Tính khoảng ngày cho chế độ tuần hoặc tháng dựa vào ngày mốc `anchor` (YYYY-MM-DD).
 * Chỉ tính toán chuỗi, không dùng `new Date(ymd)` theo giờ trình duyệt.
 */
export function rangeFor(mode: GridMode, anchor: string): DateRange {
  if (mode === 'month') {
    const month = anchor.slice(0, 7)
    const from = `${month}-01`
    const nextMonthFirst = `${shiftMonth(month, 1)}-01`
    const to = shiftYmd(nextMonthFirst, -1)
    return { from, to }
  }

  // Chế độ tuần: thứ Hai đến Chủ nhật chứa anchor
  const day = new Date(`${anchor}T00:00:00Z`).getUTCDay() // 0 = CN, 1 = T2, ..., 6 = T7
  const mondayOffset = day === 0 ? -6 : 1 - day
  const sundayOffset = day === 0 ? 0 : 7 - day

  const from = shiftYmd(anchor, mondayOffset)
  const to = shiftYmd(anchor, sundayOffset)
  return { from, to }
}

/**
 * Di chuyển ngày mốc theo delta (1 hoặc -1).
 * Tuần: ± 7 ngày.
 * Tháng: ± 1 tháng.
 */
export function moveAnchor(mode: GridMode, anchor: string, delta: 1 | -1): string {
  if (mode === 'month') {
    const month = anchor.slice(0, 7)
    return `${shiftMonth(month, delta)}-01`
  }
  return shiftYmd(anchor, delta * 7)
}

/**
 * Các tuần (thứ Hai – Chủ nhật) có ít nhất một ngày thuộc tháng `month` (YYYY-MM).
 * Tuần 1 là tuần chứa ngày 01, kể cả khi tuần đó bắt đầu từ tháng trước.
 */
export function weeksOfMonth(month: string): DateRange[] {
  const lastDay = shiftYmd(`${shiftMonth(month, 1)}-01`, -1)
  const weeks: DateRange[] = []
  let week = rangeFor('week', `${month}-01`)
  while (week.from <= lastDay) {
    weeks.push(week)
    week = { from: shiftYmd(week.from, 7), to: shiftYmd(week.to, 7) }
  }
  return weeks
}

/**
 * Nhãn tuần trong danh sách chọn.
 * - Tuần cùng tháng: "Tuần 3 · 09 – 15/11"
 * - Tuần vắt tháng: "Tuần 1 · 26/10 – 01/11"
 */
export function weekLabel(index: number, week: DateRange): string {
  const sameMonth = week.from.slice(0, 7) === week.to.slice(0, 7)
  const fromPart = sameMonth ? week.from.slice(8, 10) : formatDayMonth(week.from)
  return `Tuần ${index + 1} · ${fromPart} – ${formatDayMonth(week.to)}`
}

/** "2026-11" → "Tháng 11/2026" */
export function monthLabel(month: string): string {
  return `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`
}

/**
 * 12 tháng gần nhất tính đến `currentMonth` (mới nhất trước).
 * Nếu `selectedMonth` cũ hơn (đã bấm lùi nhiều lần) thì thêm nó vào cuối để ô chọn vẫn hiển thị được.
 */
export function recentMonths(currentMonth: string, selectedMonth: string, count = 12): string[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(currentMonth, -i))
  if (!months.includes(selectedMonth)) months.push(selectedMonth)
  return months
}
