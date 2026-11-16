import type { EmploymentType } from '@/features/auth/auth.types'

export interface ShiftTimes {
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
}

export interface Department extends ShiftTimes {
  id: string
  name: string
  eveningStart: string | null
  eveningEnd: string | null
  fullTimeCount: number
  partTimeCount: number
}

export interface DepartmentInput extends ShiftTimes {
  name: string
  eveningStart: string | null
  eveningEnd: string | null
}

export interface LateThreshold {
  id: string
  thresholdMinutes: number
  departmentId: string | null
  departmentName: string | null
  employmentType: EmploymentType | null
}

export interface LateThresholdInput {
  thresholdMinutes: number
  departmentId: string | null
  employmentType: EmploymentType | null
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function shiftOrderValid(s: ShiftTimes): boolean {
  const [a, b, c, d] = [s.morningStart, s.morningEnd, s.afternoonStart, s.afternoonEnd].map(toMinutes)
  return a < b && b <= c && c < d
}

export function eveningOrderValid(
  afternoonEnd: string,
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = start?.trim() || null
  const e = end?.trim() || null
  if ((s && !e) || (!s && e)) {
    return 'Nhập đủ giờ vào và giờ ra ca tối, hoặc để trống cả hai'
  }
  if (!s || !e) return null
  const endAfternoon = toMinutes(afternoonEnd)
  const startEvening = toMinutes(s)
  const endEvening = toMinutes(e)
  if (!(endAfternoon <= startEvening && startEvening < endEvening)) {
    return 'Ca tối phải bắt đầu từ giờ ra ca chiều và giờ vào trước giờ ra'
  }
  return null
}

/** Số giờ làm một ngày, vd 7,75. */
export function hoursPerDay(s: ShiftTimes): number {
  const minutes = toMinutes(s.morningEnd) - toMinutes(s.morningStart) + toMinutes(s.afternoonEnd) - toMinutes(s.afternoonStart)
  return Math.round((minutes / 60) * 100) / 100
}

export function shiftLabel(s: ShiftTimes & { eveningStart?: string | null; eveningEnd?: string | null }): string {
  const base = `${s.morningStart}–${s.morningEnd} · ${s.afternoonStart}–${s.afternoonEnd}`
  if (s.eveningStart && s.eveningEnd) {
    return `${base} · tối ${s.eveningStart}–${s.eveningEnd}`
  }
  return base
}

/** Vị trí trên thanh thời gian 07:00–23:00, theo phần trăm. */
export function timelineSegment(start: string, end: string): { left: string; width: string } {
  const AXIS_START = 7 * 60
  const AXIS_END = 23 * 60
  const span = AXIS_END - AXIS_START
  const from = Math.max(toMinutes(start), AXIS_START)
  const to = Math.min(toMinutes(end), AXIS_END)
  return {
    left: `${(((from - AXIS_START) / span) * 100).toFixed(2)}%`,
    width: `${((Math.max(0, to - from) / span) * 100).toFixed(2)}%`,
  }
}
