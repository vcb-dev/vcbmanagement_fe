/** Tên do người dùng nhập nên chặn ô bị Excel hiểu thành công thức. */
export function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}

/** BOM để Excel đọc đúng tiếng Việt. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Thu hồi ngay có thể làm trình duyệt huỷ lượt tải vừa bắt đầu.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
