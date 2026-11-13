import type { UserRole } from '@/features/auth/auth.types'
import type { FeedbackStatus } from '@/features/part-time/part-time.types'
import type { FeedbackSheetRef } from './feedbacks.types'

export function formatFeedbackTime(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} · ${hours}:${minutes}`
}

export function sheetLabel(sheet: FeedbackSheetRef): string {
  const parts = sheet.month.split('-')
  const m = parts[1] ?? '01'
  const y = parts[0] ?? ''
  const typeText = sheet.type === 'part_time' ? 'Part-time' : 'Toàn thời gian'
  return `Chốt công ${m}/${y} · ${typeText}`
}

/** Trạng thái feedback sau khi gửi trả lời, giống BE: quản lý trả lời là đã xử lý, nhân viên trả lời là mở lại. */
export function replyNextStatus(isManager: boolean): FeedbackStatus {
  return isManager ? 'resolved' : 'open'
}

export function sheetLink(sheet: FeedbackSheetRef, role: UserRole): string | null {
  if (sheet.type === 'part_time') {
    if (role === 'admin' || role === 'manager') {
      return `/part-time-timesheets?tab=closing&month=${sheet.month}`
    }
    return `/my-timesheet?month=${sheet.month}`
  }
  return null
}

