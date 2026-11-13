export type LeaveStatus = 'over' | 'zero' | 'low' | 'none' | 'ok'

export interface LeaveSuggestion {
  days: number
  note: string
}

export interface AnnualLeaveRow {
  id: string
  year: number
  /** Phép cả năm: tự tính theo ngày ký HĐ hoặc sửa tay. */
  entitledDays: number
  /** Số tháng đã tích phép tới tháng hiện tại: mỗi tháng đã hết, từ tháng bắt đầu tính phép, được 1 ngày. */
  accruedMonths: number
  /** Phép có đến nay = min(cả năm, số tháng đã tích). */
  accruedDays: number
  usedDays: number
  /** Có đến nay − đã nghỉ, âm khi nghỉ quá. */
  remainingDays: number
  months: number[]
  lockedMonths: number[]
  startMonth: number
  status: LeaveStatus
  suggestion: LeaveSuggestion | null
  user: {
    id: string
    name: string
    departmentName: string | null
    employmentType: 'full_time' | 'part_time'
    contractStartDate: string | null
    isActive: boolean
  }
}

export interface LeaveCandidate {
  id: string
  name: string
  departmentName: string | null
  contractStartDate: string | null
  startMonth: number
  suggestion: LeaveSuggestion | null
}

export type LeaveFilter = 'all' | 'low' | 'none' | 'nocontract'
export type LeaveSort = 'added' | 'name' | 'remain' | 'used'

/** Số dòng theo từng tab trên cả năm; `recordable` = số dòng ghi nghỉ phép được (có phép năm đó). */
export type LeaveCounts = Record<LeaveFilter | 'recordable', number>

export interface AnnualLeavePage {
  items: AnnualLeaveRow[]
  total: number
  page: number
  pageSize: number
  counts: LeaveCounts
}
