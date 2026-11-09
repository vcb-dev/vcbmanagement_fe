import type { WorkSchedule } from '@/features/attendance/attendance.types'
import type { EmploymentType } from '@/features/auth/auth.types'

export interface FullTimeSummary {
  machineWorkdays: number
  onlineWorkdays: number
  holidayWorkdays: number
  leaveWorkdays: number
  /** Chỉ để hiển thị, không cộng vào tổng công. */
  overtimeWorkdays: number
  totalWorkdays: number
  standardWorkdays: number
}

export interface PartTimeSummary {
  onlineHours: number
  offlineHours: number
  totalHours: number
}

export interface LeaveSummary {
  year: number
  entitledDays: number
  usedDays: number
  remainingDays: number
  usedInMonth: number
}

export interface LateLevelCount {
  /** Mốc thứ mấy, từ 1. */
  level: number
  fromMinutes: number
  /** null = mốc cuối, không có giới hạn trên. */
  toMinutes: number | null
  count: number
}

export interface MyTimesheet {
  month: string
  /** Tháng đã có bản chốt công. `false` = số tạm tính từ chấm công và phép năm. */
  closed: boolean
  profile: {
    fullName: string | null
    email: string
    employmentType: EmploymentType
    department: { id: string; name: string } | null
    contractStartDate: string | null
  }
  schedule: WorkSchedule
  attendance: {
    workDays: number
    lateCount: number
    lateMinutes: number
    /** Số lần đi muộn theo từng mốc. Rỗng khi chưa cấu hình mốc. */
    lateLevels: LateLevelCount[]
    missingPunchCount: number
  }
  fullTime: FullTimeSummary | null
  partTime: PartTimeSummary | null
  leave: LeaveSummary | null
}
