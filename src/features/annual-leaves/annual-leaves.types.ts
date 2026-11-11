export type LeaveStatus = 'over' | 'zero' | 'low' | 'none' | 'ok'

export interface LeaveSuggestion {
  days: number
  note: string
}

export interface AnnualLeaveRow {
  id: string
  year: number
  entitledDays: number
  usedDays: number
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
