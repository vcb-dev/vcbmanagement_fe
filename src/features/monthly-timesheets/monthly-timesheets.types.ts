export type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed'

/** Một dòng chốt công tháng của nhân sự toàn thời gian, tính bằng ngày công. */
export interface FullTimeTimesheetRow {
  id: string
  user: { id: string; email: string; fullName: string | null; isActive: boolean }
  department: { id: string; name: string } | null
  // Tự động, tính lại từ chấm công mỗi lần tải.
  machineWorkdays: number
  missingPunchCount: number
  lateCount: number
  // Quản lý nhập.
  offsiteWorkdays: number
  holidayWorkdays: number
  /** Xin muộn / về sớm / ra ngoài, không cộng vào tổng công. */
  excusedWorkdays: number
  leaveWorkdays: number
  /** Tổng các ngày tăng ca, không cộng vào tổng công. */
  overtimeWorkdays: number
  /** Công máy + từ xa + lễ, bù + phép. */
  totalWorkdays: number
  /** Phép năm của năm bản chốt; null = chưa có dòng phép năm, chưa ghi được công phép. */
  leave: {
    year: number
    entitledDays: number
    /** Được hưởng trừ phép các tháng, âm khi đã nghỉ quá. Công phép lưu xong thì server tự trừ. */
    remainingDays: number
    /** Lý do chưa ghi thêm được công phép tháng này (chưa ký HĐ, tháng trước ngày ký HĐ); null = ghi được. */
    blockedReason: string | null
  } | null
  confirmationStatus: ConfirmationStatus
  /** Thời điểm nhân viên xác nhận, chỉ có khi đang ở trạng thái đã xác nhận. */
  confirmedAt: string | null
}

export interface FullTimeTimesheetReport {
  month: string
  /** `false` = tháng đang chạy, số liệu còn thay đổi theo chấm công. */
  monthEnded: boolean
  standardWorkdays: number
  summary: { total: number; confirmed: number; pending: number; disputed: number }
  rows: FullTimeTimesheetRow[]
}

export type ManualField = 'offsiteWorkdays' | 'holidayWorkdays' | 'excusedWorkdays' | 'leaveDays'

export type ManualInput = Partial<Record<ManualField, number>>

export interface OvertimeDay {
  date: string
  workdays: number
}

export interface OvertimeList {
  month: string
  items: OvertimeDay[]
}

export const MANUAL_FIELDS: { field: ManualField; label: string; short: string; hint: string }[] = [
  { field: 'offsiteWorkdays', label: 'Làm ở nhà / cửa hàng', short: 'Từ xa', hint: 'Cộng vào tổng công' },
  { field: 'holidayWorkdays', label: 'Công nghỉ lễ + nghỉ bù', short: 'Lễ + bù', hint: 'Cộng vào tổng công' },
  { field: 'excusedWorkdays', label: 'Xin muộn / về sớm / ra ngoài', short: 'Xin phép', hint: 'Không cộng vào tổng công' },
  { field: 'leaveDays', label: 'Công phép', short: 'Phép', hint: 'Tự trừ vào phép năm, cộng vào tổng công' },
]

/** Giá trị đang lưu của ô quản lý nhập. Công phép đọc từ phép tháng. */
export function manualValue(row: FullTimeTimesheetRow, field: ManualField): number {
  return field === 'leaveDays' ? row.leaveWorkdays : row[field]
}

/** Lý do khoá ô công phép, undefined khi sửa được. Tháng đã có phép thì vẫn mở để giảm hoặc bỏ. */
export function leaveLockReason(row: FullTimeTimesheetRow): string | undefined {
  if (!row.leave) return 'Chưa có phép năm của nhân sự này, thêm ở màn Phép năm trước khi ghi công phép'
  if (row.leave.blockedReason && row.leaveWorkdays === 0) return row.leave.blockedReason
  return undefined
}

/** "Phép năm 2026 còn 4 / 12 ngày", hoặc "đã nghỉ quá 1,5 ngày" khi còn lại âm. */
export function leaveBalanceText(leave: NonNullable<FullTimeTimesheetRow['leave']>): string {
  const head = `Phép năm ${leave.year}`
  return leave.remainingDays < 0
    ? `${head}: ${leave.entitledDays} ngày, đã nghỉ quá ${formatWorkdays(-leave.remainingDays)} ngày`
    : `${head} còn ${formatWorkdays(leave.remainingDays)} / ${leave.entitledDays} ngày`
}

export const isOverLeave = (row: FullTimeTimesheetRow) => !!row.leave && row.leave.remainingDays < 0

export const STATUS_LABEL: Record<ConfirmationStatus, string> = {
  confirmed: 'Đã xác nhận',
  pending: 'Chờ xác nhận',
  disputed: 'Báo sai công',
}

export const STATUS_TONE: Record<ConfirmationStatus, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  disputed: 'bg-destructive/10 text-destructive',
}

export const formatWorkdays = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Tăng ca lưu tới 3 chữ số thập phân, vd 0,375 công = 3 giờ. */
export const formatOvertime = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })

/** "1,5" hoặc "1.5" → 1.5; ô trống là 0. Trả về null khi không phải số hợp lệ trong khoảng cho phép. */
export function parseWorkdays(raw: string, field: ManualField): number | null {
  const text = raw.trim().replace(',', '.')
  if (text === '') return 0
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) return null
  const value = Number(text)
  if (value > 31) return null
  if (field === 'leaveDays' && !Number.isInteger(value * 2)) return null
  return value
}
