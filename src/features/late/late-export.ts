import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { formatClockMinutes, formatDayMonth } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { lateColumns, levelInColumn, type LateReportRow } from './late.types'

/** Tên do người dùng nhập nên chặn ô bị Excel hiểu thành công thức. */
function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export function buildLateCsv(month: string, rows: LateReportRow[]): string {
  const days = daysOfMonth(month)
  const columns = lateColumns(rows)
  const header = [
    'Họ tên',
    'Email',
    'Bộ phận',
    'Loại nhân sự',
    ...days.map(formatDayMonth),
    ...columns.map((c) => c.name),
    'Tổng lần',
    'Tổng phút',
  ]
  const lines = rows.map((row) => [
    displayName(row.user),
    row.user.email,
    row.department?.name ?? 'Chưa gán bộ phận',
    EMPLOYMENT_LABEL[row.employmentType],
    ...days.map((ymd) =>
      row.events
        .filter((e) => e.date === ymd)
        .map((e) => formatClockMinutes(e.minutes))
        .join(' / '),
    ),
    ...columns.map((c) => levelInColumn(row, c)?.count ?? ''),
    row.lateCount,
    row.lateMinutes,
  ])
  return [header, ...lines].map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}

/** BOM để Excel đọc đúng tiếng Việt. */
export function downloadLateCsv(month: string, rows: LateReportRow[]) {
  const blob = new Blob(['﻿', buildLateCsv(month, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `di-muon-${month}.csv`
  link.click()
  // Thu hồi ngay có thể làm trình duyệt huỷ lượt tải vừa bắt đầu.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
