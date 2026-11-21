import type { EmploymentType } from '@/features/auth/auth.types'
import type {
  LeaveRequestStatus,
  LeaveRequestType,
  OffsiteWorkKind,
  RequestShift,
} from '@/features/leave-requests/leave-requests.types'

/**
 * Mỗi người một tình trạng trong ngày (cộng lại bằng sĩ số):
 * có mặt (có chấm công) → nghỉ phép → ngoài văn phòng → không có ca (Chủ nhật, part-time) → vắng.
 */
export type DayStatus = 'present' | 'leave' | 'offsite' | 'absent' | 'off'
export type DayPart = 'full' | 'morning' | 'afternoon'
export type LateShift = 'morning' | 'afternoon'

export interface OverviewPerson {
  id: string
  email: string
  fullName: string | null
  employmentType: EmploymentType
  department: { id: string; name: string } | null
}

export type StatusCounts = Record<DayStatus, number>

export interface RequestCount {
  total: number
  pending: number
}

export interface OverviewSummary {
  total: number
  fullTime: number
  partTime: number
  statuses: StatusCounts
  onTime: number
  late: number
  lateMinutes: number
  leave: RequestCount & { paid: number; unpaid: number }
  lateRequests: RequestCount
  earlyRequests: RequestCount
  offsite: RequestCount
  early: number
}

export interface DepartmentRow extends StatusCounts {
  id: string | null
  name: string
  total: number
  late: number
}

export interface LeaveRequestRef {
  id: string
  status: LeaveRequestStatus
  part: DayPart
  leaveDays: number
  deductAnnualLeave: boolean
  startDate: string
  endDate: string
}

export interface LeaveItem {
  person: OverviewPerson
  status: DayStatus
  request: LeaveRequestRef
}

export interface ShiftRequestItem {
  person: OverviewPerson
  request: { id: string; status: LeaveRequestStatus; shift: RequestShift; hours: number | null }
  actualMinutes: number | null
}

export interface LateItem {
  person: OverviewPerson
  minutes: number
  shifts: { shift: LateShift; minutes: number }[]
  excused: boolean
}

export interface OffsiteItem {
  person: OverviewPerson
  status: DayStatus
  request: { id: string; status: LeaveRequestStatus; offsiteKind: OffsiteWorkKind | null } | null
  online: boolean
}

/** Tab Ngày: `GET /overview?date=`. */
export interface Overview {
  date: string
  today: string
  isSunday: boolean
  summary: OverviewSummary
  departments: DepartmentRow[]
  lists: {
    leave: LeaveItem[]
    lateRequests: ShiftRequestItem[]
    late: LateItem[]
    absent: { person: OverviewPerson }[]
    offsite: OffsiteItem[]
    earlyRequests: ShiftRequestItem[]
  }
}

export interface TrendPoint extends StatusCounts {
  date: string
  total: number
  /** Số người có ít nhất một ca đi muộn. */
  late: number
}

export interface TopLate {
  person: OverviewPerson
  /** Số ca đi muộn, như màn Đi muộn. */
  lateCount: number
  lateMinutes: number
}

export interface MonthDepartmentRow extends StatusCounts {
  id: string | null
  name: string
  people: number
  lateShifts: number
  lateMinutes: number
}

/**
 * Tab Tháng: `GET /overview/month?month=`. Tính từ đầu tháng tới cuối tháng, hoặc tới hết hôm qua với tháng này.
 * Lượt = một người trong một ngày.
 */
export interface MonthOverview {
  month: string
  today: string
  from: string
  /** null khi tháng này chưa có ngày nào xong (hôm nay là mùng 1). */
  to: string | null
  days: number
  statuses: StatusCounts
  attendanceRate: number | null
  lateShifts: number
  lateMinutes: number
  latePeople: number
  lateRequests: RequestCount
  earlyRequests: RequestCount
  trend: TrendPoint[]
  departments: MonthDepartmentRow[]
  topLate: TopLate[]
}

/** Các nhóm người trong ngày (nghỉ phép, đi muộn, chưa chấm công…). */
export type ListKey = keyof Overview['lists']

/** Bộ lọc bộ phận: chuỗi rỗng là tất cả, `NO_DEPARTMENT` là người chưa có bộ phận. */
export const ALL_DEPARTMENTS = ''
export const NO_DEPARTMENT = 'none'

export function departmentKey(department: { id: string | null } | null): string {
  return department?.id ?? NO_DEPARTMENT
}

/**
 * Màu cố định của từng chỉ số, dùng chung cho thẻ số, biểu đồ và bảng bộ phận (đã kiểm độ tương phản và lệch màu cho
 * người mù màu ở cả nền sáng và nền tối); luôn đi kèm nhãn nên không phân biệt chỉ bằng màu.
 */
export const COLOR = {
  working: 'bg-emerald-600',
  notWorking: 'bg-rose-600',
  absent: 'bg-rose-600',
  leave: 'bg-sky-600',
  late: 'bg-amber-600',
  request: 'bg-violet-600 dark:bg-violet-500',
} as const

export type ColorKey = keyof typeof COLOR

/**
 * Link sang trang Duyệt đơn xin phép, mở sẵn tab Chờ duyệt theo hình thức đơn. Có `email` + `id` thì lọc theo người đó
 * và chọn sẵn đúng đơn. Trang duyệt không lọc theo ngày nên có thể hiện cả đơn chờ của ngày khác.
 */
export function approvalLink({ type, email, id }: { type: LeaveRequestType; email?: string; id?: string }): string {
  const search = new URLSearchParams({ status: 'pending', type })
  if (email) search.set('q', email)
  if (id) search.set('id', id)
  return `/leave-requests?${search}`
}

/** Hôm nay người chưa chấm công chưa hẳn là vắng. */
export function absentLabel(isToday: boolean): string {
  return isToday ? 'Chưa chấm công' : 'Vắng không phép'
}

export const PART_LABEL: Record<DayPart, string> = {
  full: 'Nghỉ cả ngày',
  morning: 'Nghỉ buổi sáng',
  afternoon: 'Nghỉ buổi chiều',
}

export const SHIFT_NAME: Record<RequestShift, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  evening: 'Ca tối',
}

export const OFFSITE_NAME: Record<OffsiteWorkKind, string> = {
  store: 'Làm tại cửa hàng',
  online: 'Làm việc online',
  outside: 'Làm việc bên ngoài',
}

/** Tỷ lệ phần trăm làm tròn, "—" khi mẫu bằng 0. */
export function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

/** 1.5 → "1,5" */
export function viNumber(n: number): string {
  return String(n).replace('.', ',')
}

/** 637 → "10 giờ 37 phút", 45 → "45 phút" */
export function minutesText(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  return m ? `${h} giờ ${m} phút` : `${h} giờ`
}

/** Khoá của `weekdayShort` → tên thứ đầy đủ. */
export const WEEKDAY_LONG: Record<string, string> = {
  CN: 'Chủ nhật',
  T2: 'Thứ Hai',
  T3: 'Thứ Ba',
  T4: 'Thứ Tư',
  T5: 'Thứ Năm',
  T6: 'Thứ Sáu',
  T7: 'Thứ Bảy',
}

/**
 * Đi làm / không đi làm, dùng chung cho cả hai tab:
 * - đi làm = có chấm công + làm ngoài văn phòng;
 * - không đi làm = nghỉ phép + vắng không phép (hôm nay: chưa chấm công);
 * - người không có lịch (part-time không có ca, Chủ nhật) không thuộc bên nào.
 */
export function workSplit(s: StatusCounts): { working: number; notWorking: number; scheduled: number } {
  const working = s.present + s.offsite
  const notWorking = s.leave + s.absent
  return { working, notWorking, scheduled: working + notWorking }
}

/** % đi làm trên số người có lịch làm, một chữ số thập phân; null khi không ai có lịch. */
export function attendanceRate(s: StatusCounts): number | null {
  const { working, scheduled } = workSplit(s)
  return scheduled > 0 ? Math.round((working / scheduled) * 1000) / 10 : null
}

/** 95.2 → "95,2%", null → "—" */
export function rateText(rate: number | null): string {
  return rate === null ? '—' : `${viNumber(rate)}%`
}
