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
