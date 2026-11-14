import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDayMonth } from '@/lib/format'
import { displayName } from '@/lib/user-display'
import { overtimeOn, type OvertimeRow } from './overtime.types'

/** Số giờ tăng ca từng ngày; ngày không tăng ca để trống. Số giữ dấu chấm thập phân để Excel nào cũng đọc được là số. */
export function buildOvertimeCsv(month: string, rows: OvertimeRow[]): string {
  const days = daysOfMonth(month)
  const header = ['Họ tên', 'Email', 'Bộ phận', ...days.map(formatDayMonth), 'Tổng tháng (giờ)']
  const lines = rows.map((r) => [
    displayName(r.user),
    r.user.email,
    r.department?.name ?? 'Chưa gán bộ phận',
    ...days.map((ymd) => overtimeOn(r, ymd) || ''),
    r.overtimeWorkdays,
  ])
  return toCsv([header, ...lines])
}

export function downloadOvertimeCsv(month: string, rows: OvertimeRow[]) {
  downloadCsv(`tang-ca-${month}.csv`, buildOvertimeCsv(month, rows))
}
