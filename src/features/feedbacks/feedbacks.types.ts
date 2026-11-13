import type { EmploymentType } from '@/features/auth/auth.types'
import type { FeedbackReplyView, FeedbackStatus } from '@/features/part-time/part-time.types'

export type { FeedbackReplyView, FeedbackStatus }

export type SheetType = 'part_time' | 'full_time'

export interface FeedbackSheetRef {
  type: SheetType
  id: string
  month: string
  confirmationStatus: string
}

export interface FeedbackAuthor {
  id: string
  name: string
  departmentName: string | null
  employmentType: EmploymentType
}

export interface FeedbackListItem {
  id: string
  content: string
  status: FeedbackStatus
  createdAt: string
  replyCount: number
  sheet: FeedbackSheetRef
  user: FeedbackAuthor
}

export interface FeedbackDetail extends FeedbackListItem {
  replies: FeedbackReplyView[]
}

export interface FeedbackCounts {
  all: number
  open: number
  resolved: number
}

export interface FeedbackSheetOption {
  sheet: FeedbackSheetRef
  user: FeedbackAuthor
}

export interface FeedbackListParams {
  status?: FeedbackStatus
  sheetType?: SheetType
  q?: string
  page: number
}
