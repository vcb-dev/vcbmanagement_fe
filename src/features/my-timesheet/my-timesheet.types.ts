import type { AttendanceRecord, ShiftRecord, WorkSchedule } from '@/features/attendance/attendance.types'
import type { EmploymentType, User } from '@/features/auth/auth.types'
import type { PartTimeMonthSummary, PartTimeSheetRef } from '@/features/part-time/part-time.types'

/** Giờ ca của người dùng kèm bộ mốc đi muộn áp dụng trong tháng. */
export interface TimesheetSchedule extends WorkSchedule {
  /** Bộ mốc đi muộn (phút, tăng dần). Rỗng = chưa cấu hình. */
  lateThresholds: number[]
}

export interface DayShift extends ShiftRecord {
  /** Lần đi muộn này thuộc mốc thứ mấy (từ 1), null nếu không muộn hoặc chưa cấu hình mốc. */
  lateLevel: number | null
}

/** Lần quản lý bổ sung hoặc sửa giờ của một ngày. */
export interface DayAdjustment {
  note: string
  adjustedAt: string
  adjustedBy: Pick<User, 'id' | 'email' | 'fullName'>
}

/** Một ngày chấm công trên các màn công: giờ đang dùng, mốc đi muộn từng ca, lần bổ sung giờ nếu có. */
export interface DayRecord extends Omit<AttendanceRecord, 'morning' | 'afternoon'> {
  morning: DayShift
  afternoon: DayShift
  /** null khi giờ là giờ chấm gốc. Các lượt chấm ở `punches` luôn là lượt gốc. */
  adjustment: DayAdjustment | null
}

export interface FullTimeSummary {
  machineWorkdays: number
  onlineWorkdays: number
  holidayWorkdays: number
  leaveWorkdays: number
  /** Xin muộn / về sớm / ra ngoài, không cộng vào tổng công. */
  excusedWorkdays: number
  /** Tổng giờ tăng ca của tháng (tên field giữ từ trước). Chỉ để hiển thị, không cộng vào tổng công. */
  overtimeWorkdays: number
  /** Tăng ca từng ngày do quản lý nhập (giờ), cộng lại bằng `overtimeWorkdays`. */
  overtimeDays: OvertimeDay[]
  totalWorkdays: number
  standardWorkdays: number
}

export interface OvertimeDay {
  /** "YYYY-MM-DD" */
  date: string
  workdays: number
}

export interface PartTimeSummary {
  onlineHours: number
  offlineHours: number
  totalHours: number
}

export interface LeaveSummary {
  year: number
  /** Phép cả năm. */
  entitledDays: number
  /** Số tháng đã tích phép tới tháng đang chạy (các tháng đã hết, kể từ tháng bắt đầu tính phép). */
  accruedMonths: number
  /** Phép có đến nay: mỗi tháng đã hết (từ tháng bắt đầu tính phép) được 1 ngày, không vượt cả năm. */
  accruedDays: number
  usedDays: number
  /** Có đến nay − đã nghỉ. */
  remainingDays: number
  usedInMonth: number
  /** Số ngày phép đã nghỉ của từng tháng (1–12), chỉ các tháng có nghỉ. */
  months: { month: number; usedDays: number }[]
}

export interface LateLevelCount {
  /** Mốc thứ mấy, từ 1. */
  level: number
  fromMinutes: number
  /** null = mốc cuối, không có giới hạn trên. */
  toMinutes: number | null
  count: number
}

export type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed'

/** Xác nhận công tháng của bản chốt toàn thời gian. */
export interface TimesheetConfirmation {
  status: ConfirmationStatus
  confirmedAt: string | null
  /** Tháng đã kết thúc và đang chờ xác nhận. */
  canConfirm: boolean
  /** Lý do chưa xác nhận được, null khi xác nhận được hoặc đã xác nhận. */
  reason: string | null
  /** Gửi kèm khi xác nhận, để chắc số chưa đổi từ lúc xem. */
  version: string
}

export interface MyTimesheet {
  month: string
  /**
   * Tháng đã có bản chốt công. Bản chốt toàn thời gian tự tạo và tự cập nhật theo chấm công,
   * nên `false` chỉ còn khi tài khoản chưa có trong tháng đó, hoặc part-time chưa chốt.
   */
  closed: boolean
  profile: {
    fullName: string | null
    email: string
    employmentType: EmploymentType
    department: { id: string; name: string } | null
    contractStartDate: string | null
  }
  schedule: TimesheetSchedule
  attendance: {
    workDays: number
    lateCount: number
    lateMinutes: number
    /** Số lần đi muộn theo từng mốc. Rỗng khi chưa cấu hình mốc. */
    lateLevels: LateLevelCount[]
    missingPunchCount: number
  }
  /** Từng ngày có chấm công trong tháng, mới nhất trước. */
  records: DayRecord[]
  fullTime: FullTimeSummary | null
  partTime: PartTimeSummary | null
  leave: LeaveSummary | null
  sheet: PartTimeSheetRef | null
  live: PartTimeMonthSummary | null
  /** null = part-time, hoặc tài khoản không có bản chốt của tháng này. */
  confirmation: TimesheetConfirmation | null
}
