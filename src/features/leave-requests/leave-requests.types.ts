import type { EmploymentType, UserRole } from '@/features/auth/auth.types'

export type LeaveRequestType = 'leave' | 'late_arrival' | 'early_leave' | 'offsite'
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
/**
 * Đơn gửi đích danh trưởng nhóm phụ trách / quản lý trực tiếp trong hồ sơ nhân sự (HRM),
 * hay gửi chung Quản lý / HR (`manager`, không xác định được ai).
 */
export type LeaveRequestRoute = 'leader' | 'direct_manager' | 'manager'
export type OffsiteWorkKind = 'store' | 'online' | 'outside'
export type RequestShift = 'morning' | 'afternoon' | 'evening'

export interface PersonRef {
  id: string
  name: string
  role: UserRole
}

/** Phép năm trừ vào một tháng. */
export interface LeaveAllocation {
  year: number
  month: number
  days: number
}

export interface LeaveRequestAttachment {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface LeaveRequest {
  id: string
  type: LeaveRequestType
  status: LeaveRequestStatus
  reason: string
  startAt: string
  /** "YYYY-MM-DD" theo giờ công ty. */
  startDate: string
  /** "HH:mm" theo giờ công ty. */
  startTime: string
  startShift: RequestShift
  leaveDays: number | null
  deductAnnualLeave: boolean | null
  handover: string | null
  hours: number | null
  offsiteKind: OffsiteWorkKind | null
  user: PersonRef & {
    email: string
    employmentType: EmploymentType
    department: { id: string; name: string } | null
  }
  approver: PersonRef | null
  /** Gửi ai duyệt; `routeNote` ghi vì sao không tới trưởng nhóm phụ trách. null = đơn cũ, trước khi có chọn người duyệt. */
  routedTo: LeaveRequestRoute | null
  routeNote: string | null
  /** Người nhận đơn đích danh, chọn lúc gửi theo hệ thống quản lý nhân sự. */
  approvers: PersonRef[]
  reviewedBy: PersonRef | null
  reviewedAt: string | null
  reviewNote: string | null
  /** Phép đã trừ vào các tháng (đơn nghỉ có trừ phép đã duyệt). */
  leaveDeduction: LeaveAllocation[] | null
  attachments: LeaveRequestAttachment[]
  createdAt: string
}

export type LeaveBalanceInfo =
  | { year: number; exists: false }
  | {
      year: number
      exists: true
      entitledDays: number
      accruedMonths: number
      accruedDays: number
      usedDays: number
      remainingDays: number
    }

export interface LeaveRequestDetail extends LeaveRequest {
  /** Phép sẽ trừ (chưa duyệt) hoặc đã trừ (đã duyệt) theo tháng; null khi đơn không trừ phép. */
  leavePlan: LeaveAllocation[] | null
  leaveBalances: LeaveBalanceInfo[]
  /** Đi muộn / về sớm: giờ chấm công của ca trong đơn; null khi ngày đó chưa có chấm công. */
  attendance: {
    shift: 'morning' | 'afternoon'
    inAt: string | null
    outAt: string | null
    lateMinutes: number | null
    /** Phút muộn còn tính khi đơn đi muộn được duyệt. */
    countedLateMinutes: number | null
    /** Phút được miễn khi đơn đi muộn được duyệt, trừ vào quỹ có phép của tháng. */
    excusedLateMinutes: number
    /** Quỹ phút đi muộn có phép của tháng còn lại ngay trước ca này, trên tổng `excuseQuota`. */
    excuseQuotaLeft: number
    excuseQuota: number
    earlyMinutes: number | null
  } | null
  canCancel: boolean
  canApprove: boolean
  canReject: boolean
}

export type LeaveRequestCounts = Record<LeaveRequestStatus | 'all', number>

export interface LeaveRequestPage {
  items: LeaveRequest[]
  total: number
  page: number
  pageSize: number
  counts: LeaveRequestCounts
}

export interface LeaveRequestListParams {
  status?: LeaveRequestStatus
  type?: LeaveRequestType
  q?: string
  approver?: 'me'
  page: number
}

export interface ApproverOption {
  id: string
  name: string
  role: UserRole
  departmentName: string | null
}

export interface CreateLeaveRequestInput {
  type: LeaveRequestType
  reason: string
  startDate: string
  startTime: string
  leaveDays?: number
  deductAnnualLeave?: boolean
  handover?: string
  hours?: number
  offsiteKind?: OffsiteWorkKind
  /** Bỏ trống khi ô chọn người duyệt đang ẩn. */
  approverId?: string
  acknowledged: boolean
  attachments: File[]
}
