import { shiftMonth, shiftYmd } from '@/lib/format'

export type GridMode = 'week' | 'month'

/**
 * Tính khoảng ngày cho chế độ tuần hoặc tháng dựa vào ngày mốc `anchor` (YYYY-MM-DD).
 * Chỉ tính toán chuỗi, không dùng `new Date(ymd)` theo giờ trình duyệt.
 */
export function rangeFor(mode: GridMode, anchor: string): { from: string; to: string } {
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
 * Nhãn hiển thị cho khoảng ngày.
 * Ví dụ:
 * - Tuần cùng tháng: "07 – 13 tháng 09, 2026"
 * - Tuần vắt tháng: "28/09 – 04/10/2026"
 * - Tháng: "Tháng 09/2026"
 */
export function rangeLabel(mode: GridMode, range: { from: string; to: string }): string {
  if (mode === 'month') {
    const [y, m] = range.from.slice(0, 7).split('-')
    return `Tháng ${m}/${y}`
  }

  const fromYear = range.from.slice(0, 4)
  const fromMonth = range.from.slice(5, 7)
  const fromDay = range.from.slice(8, 10)

  const toYear = range.to.slice(0, 4)
  const toMonth = range.to.slice(5, 7)
  const toDay = range.to.slice(8, 10)

  if (fromYear === toYear && fromMonth === toMonth) {
    return `${fromDay} – ${toDay} tháng ${fromMonth}, ${fromYear}`
  }

  if (fromYear === toYear) {
    return `${fromDay}/${fromMonth} – ${toDay}/${toMonth}/${toYear}`
  }

  return `${fromDay}/${fromMonth}/${fromYear} – ${toDay}/${toMonth}/${toYear}`
}
