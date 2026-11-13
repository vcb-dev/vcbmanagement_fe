import type { User } from '@/features/auth/auth.types'
import type { FaceMe } from '@/features/face/face.types'

export type AttendanceSlot = 'morning_in' | 'morning_out' | 'afternoon_in' | 'afternoon_out'
export type ShiftKey = 'morning' | 'afternoon'

export interface ShiftRecord {
  inAt: string | null
  outAt: string | null
  lateMinutes: number | null
  earlyMinutes: number | null
  workedMinutes: number | null
}

export interface AttendancePunch {
  slot: AttendanceSlot
  at: string
  note: string | null
  /** Khoảng cách tới công ty lúc chấm (mét), null nếu không kiểm tra GPS. */
  distanceMeters: number | null
  /** Giờ / ngày máy tính lúc chấm, vd "09:18" và "04/11". */
  screenTime: string | null
  screenDate: string | null
  faceScore: number | null
  sceneScore: number | null
  floorNote: string | null
}

export interface AttendanceRecord {
  id: string
  workDate: string
  morning: ShiftRecord
  afternoon: ShiftRecord
  workedMinutes: number | null
  /** Tổng phút muộn của cả 2 ca. */
  lateMinutes: number
  /** Số ca đi muộn trong ngày (0–2). */
  lateCount: number
  earlyCount: number
  /** Mỗi lượt chấm đều kèm ảnh. */
  punches: AttendancePunch[]
}

export interface WorkSchedule {
  timezone: string
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
}

export interface Geofence {
  latitude: number
  longitude: number
  radiusMeters: number
  maxAccuracyMeters: number
}

export interface AttendanceToday {
  date: string
  serverTime: string
  schedule: WorkSchedule
  /** null = công ty chưa cấu hình vị trí, không kiểm tra GPS. */
  geofence: Geofence | null
  record: AttendanceRecord | null
  /** null = đã chấm đủ trong ngày. */
  nextSlot: AttendanceSlot | null
  face: FaceMe
}

export interface AttendanceSummary {
  workDays: number
  /** Số ca đi muộn. */
  lateCount: number
  earlyLeaveCount: number
  totalWorkedMinutes: number
  totalLateMinutes: number
}

export interface AttendanceRange {
  summary: AttendanceSummary
  records: AttendanceRecord[]
}

export interface AttendanceDaily {
  date: string
  schedule: WorkSchedule
  summary: { total: number; present: number; late: number; absent: number }
  rows: { user: User; record: AttendanceRecord | null }[]
}

export const SLOT_LABEL: Record<AttendanceSlot, string> = {
  morning_in: 'Vào ca sáng',
  morning_out: 'Ra ca sáng',
  afternoon_in: 'Vào ca chiều',
  afternoon_out: 'Ra ca chiều',
}

export const SHIFT_LABEL: Record<ShiftKey, string> = { morning: 'Sáng', afternoon: 'Chiều' }
