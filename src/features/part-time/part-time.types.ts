import type { UserRole } from '@/features/auth/auth.types'
import type { LateLevelCount } from '@/features/my-timesheet/my-timesheet.types'

export type WorkShift = 'morning' | 'afternoon' | 'evening'
export type SheetStatus = 'pending' | 'confirmed' | 'disputed'
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved'

export interface PartTimeShiftView {
  shift: WorkShift
  window: { start: string; end: string }
  mode: 'offline' | 'online' | 'none'
  source: 'machine' | 'manual' | null
  inAt: string | null
  outAt: string | null
  minutes: number
  lateMinutes: number
  lateLevel: number | null
  earlyMinutes: number
  missing: boolean
  inProgress: boolean
  entry: {
    id: string
    kind: 'online' | 'manual'
    hours: number
    note: string
    recordedBy: { id: string; name: string }
    updatedAt: string
  } | null
}

export interface PartTimeDayView {
  date: string // "YYYY-MM-DD"
  shifts: PartTimeShiftView[]
  offlineMinutes: number
  onlineMinutes: number
  lateCount: number
  missingCount: number
}

export interface PartTimeMonthSummary {
  offlineHours: number
  onlineHours: number
  totalHours: number
  lateCount: number
  lateLevels: LateLevelCount[]
  missingPunchCount: number
}

export interface PartTimeSheetRef {
  id: string
  status: SheetStatus
  openFeedbackCount: number
}

export interface PartTimeSheetRow {
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
  }
  department: {
    id: string
    name: string
  } | null
  live: PartTimeMonthSummary | null
  sheet: {
    id: string
    status: SheetStatus
    offlineHours: number
    onlineHours: number
    lateCount: number
    missingPunchCount: number
    onlineMonthly: boolean
  } | null
  outdated: boolean
  openFeedbackCount: number
  skipReason: string | null
}

export interface CloseMonthResult {
  closed: number
  unchanged: number
  skipped: {
    userId: string
    name: string
    reason: string
  }[]
}

export interface ShiftEntryInput {
  userId: string
  workDate: string
  shift: WorkShift
  kind: 'online' | 'manual'
  hours: number
  note: string
}

export interface PartTimeGridRow {
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
  }
  department: {
    id: string
    name: string
  } | null
  skipReason: string | null
  days: { date: string; shifts: PartTimeShiftView[] }[]
  totalHours: number
}

export type PartTimeIssueType = 'missing' | 'late' | 'early' | 'disputed' | 'outdated'

export interface PartTimeIssue {
  type: PartTimeIssueType
  user: { id: string; name: string }
  department: { id: string; name: string } | null
  date: string | null
  shift: WorkShift | null
  window: { start: string; end: string } | null
  inAt: string | null
  outAt: string | null
  minutes: number
  lateMinutes: number
  lateLevel: number | null
  earlyMinutes: number
  sheetId: string | null
  feedbackContent: string | null
  liveTotalHours: number | null
  sheetTotalHours: number | null
}

export const ISSUE_TYPE_LABEL: Record<PartTimeIssueType, string> = {
  missing: 'Thiếu chấm',
  late: 'Đi muộn',
  early: 'Về sớm',
  disputed: 'Báo sai',
  outdated: 'Lệch sau chốt',
}

export interface FeedbackReplyView {
  id: string
  content: string
  status: FeedbackStatus
  createdAt: string
  user: {
    id: string
    name: string
    role: UserRole
  }
}

export interface FeedbackView {
  id: string
  content: string
  status: FeedbackStatus
  createdAt: string
  replies: FeedbackReplyView[]
}

export const SHIFT_LABEL: Record<WorkShift, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  evening: 'Ca tối',
}

export const SHEET_STATUS_LABEL: Record<SheetStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  disputed: 'Đang báo sai',
}

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Mới gửi',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xử lý',
}
