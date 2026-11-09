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
  fullTimeCount: number
  partTimeCount: number
}

export interface DepartmentInput extends ShiftTimes {
  name: string
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

/** Số giờ làm một ngày, vd 7,75. */
export function hoursPerDay(s: ShiftTimes): number {
  const minutes = toMinutes(s.morningEnd) - toMinutes(s.morningStart) + toMinutes(s.afternoonEnd) - toMinutes(s.afternoonStart)
  return Math.round((minutes / 60) * 100) / 100
}

export function shiftLabel(s: ShiftTimes): string {
  return `${s.morningStart}–${s.morningEnd} · ${s.afternoonStart}–${s.afternoonEnd}`
}

/** Vị trí trên thanh thời gian 07:00–19:00, theo phần trăm. */
export function timelineSegment(start: string, end: string): { left: string; width: string } {
  const AXIS_START = 7 * 60
  const AXIS_END = 19 * 60
  const span = AXIS_END - AXIS_START
  const from = Math.max(toMinutes(start), AXIS_START)
  const to = Math.min(toMinutes(end), AXIS_END)
  return {
    left: `${(((from - AXIS_START) / span) * 100).toFixed(2)}%`,
    width: `${(Math.max(0, to - from) / span * 100).toFixed(2)}%`,
  }
}
