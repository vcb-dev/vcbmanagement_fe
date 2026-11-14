import type { FullTimeTimesheetRow } from '@/features/monthly-timesheets/monthly-timesheets.types'

/** Một nhân sự toàn thời gian trên màn Tăng ca: tăng ca từng ngày của bản chốt tháng. */
export interface OvertimeRow {
  /** Id bản chốt công tháng. */
  id: string
  user: { id: string; email: string; fullName: string | null; isActive: boolean }
  department: { id: string; name: string } | null
  /** Tổng giờ tăng ca của tháng, không cộng vào tổng công. */
  overtimeWorkdays: number
  /** Chỉ các ngày có tăng ca, tăng dần theo ngày; `workdays` là số giờ (tên field giữ từ trước). */
  days: { date: string; workdays: number }[]
}

export interface OvertimeReport {
  month: string
  monthEnded: boolean
  rows: OvertimeRow[]
}

export interface SetOvertimeDayResult {
  date: string
  workdays: number
  row: FullTimeTimesheetRow
}

/**
 * Số giờ tăng ca của một ngày, số thập phân tối đa 3 chữ số sau dấu phẩy (vd 1,5 = 1 giờ 30 phút).
 * Ô trống là 0 (bỏ tăng ca ngày đó).
 * Không giới hạn nghiệp vụ; chỉ chặn ở sức chứa của cột trong DB (dưới 100).
 */
export function parseOvertime(raw: string): number | null {
  const text = raw.trim().replace(',', '.')
  if (text === '') return 0
  return /^\d{1,2}(\.\d{1,3})?$/.test(text) ? Number(text) : null
}

export function overtimeOn(row: OvertimeRow, date: string): number {
  return row.days.find((d) => d.date === date)?.workdays ?? 0
}

/** Ghi tăng ca một ngày vào dòng, giữ thứ tự ngày tăng dần. */
export function withOvertimeDay(row: OvertimeRow, date: string, workdays: number, total: number): OvertimeRow {
  const others = row.days.filter((d) => d.date !== date)
  const days = workdays > 0 ? [...others, { date, workdays }].sort((a, b) => a.date.localeCompare(b.date)) : others
  return { ...row, days, overtimeWorkdays: total }
}
