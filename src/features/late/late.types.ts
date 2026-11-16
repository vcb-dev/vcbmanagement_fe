import type { EmploymentType } from '@/features/auth/auth.types'

export type LateShift = 'morning' | 'afternoon'

/** Một lần đi muộn: mỗi ca vào sau giờ vào ca là một lần, một ngày có thể có hai lần. */
export interface LateEvent {
  date: string
  shift: LateShift
  minutes: number
}

export interface LateReportRow {
  user: { id: string; email: string; fullName: string | null; isActive: boolean }
  department: { id: string; name: string } | null
  employmentType: EmploymentType
  lateCount: number
  lateMinutes: number
  /** Các lần đi muộn trong tháng, tăng dần theo ngày. */
  events: LateEvent[]
}

export interface LateReport {
  month: string
  summary: { totalPeople: number; latePeople: number; lateCount: number; lateMinutes: number }
  rows: LateReportRow[]
}

/** Hai dòng của mỗi nhân sự trên bảng. */
export const LATE_SHIFTS = [
  { key: 'morning', label: 'Sáng' },
  { key: 'afternoon', label: 'Chiều' },
] as const satisfies readonly { key: LateShift; label: string }[]

export const SHIFT_LABEL: Record<LateShift, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
}

export interface LateTotal {
  count: number
  minutes: number
}

/** Số lần và tổng phút đi muộn, chỉ tính các ngày trong `days` và ca `shift` khi có truyền. */
export function lateTotal(events: readonly LateEvent[], days?: ReadonlySet<string>, shift?: LateShift): LateTotal {
  const total: LateTotal = { count: 0, minutes: 0 }
  for (const e of events) {
    if ((shift && e.shift !== shift) || (days && !days.has(e.date))) continue
    total.count += 1
    total.minutes += e.minutes
  }
  return total
}

/** Phút muộn theo ngày của từng ca, để tra ô trên bảng. */
export function lateByShift(events: readonly LateEvent[]): Record<LateShift, Map<string, number>> {
  const index = { morning: new Map<string, number>(), afternoon: new Map<string, number>() }
  for (const e of events) index[e.shift].set(e.date, e.minutes)
  return index
}
