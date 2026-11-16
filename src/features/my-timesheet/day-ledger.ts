import type { WorkSchedule } from '@/features/attendance/attendance.types'
import type { PartTimeDayView, PartTimeShiftView, WorkShift } from '@/features/part-time/part-time.types'
import { daysOfMonth, isShiftMissing, isWholeDayWithoutLunch } from './day-status'
import type { DayRecord, DayShift, OvertimeDay } from './my-timesheet.types'

/** Một ca trong một ngày của bảng theo ngày, chung cho toàn thời gian và part-time. */
export interface LedgerShift {
  key: WorkShift
  /** Giờ ca chuẩn, phút tính từ 00:00. */
  window: { start: number; end: number }
  mode: 'offline' | 'online' | 'none'
  inAt: string | null
  outAt: string | null
  lateMinutes: number
  lateLevel: number | null
  earlyMinutes: number
  /** Thiếu giờ vào hoặc giờ ra (hôm nay chưa tính là thiếu). */
  missing: boolean
  /** Hôm nay đã vào nhưng chưa ra. */
  inProgress: boolean
  workedMinutes: number | null
  /** Giờ do quản lý ghi (part-time: ca online hoặc giờ bổ sung). */
  entry: PartTimeShiftView['entry']
}

export type LedgerDayKind = 'worked' | 'half' | 'online' | 'missing' | 'live' | 'absent' | 'sunday'

export interface LedgerDay {
  date: string
  isToday: boolean
  kind: LedgerDayKind
  shifts: LedgerShift[]
  /** Vào sáng, ra chiều, không chấm trưa: vẫn đủ ngày. */
  noLunch: boolean
  workedMinutes: number | null
  /** Toàn thời gian: công máy của ngày (0 / 0,5 / 1). */
  workdays: number | null
  /** Part-time: số phút offline và online trong ca. */
  offlineMinutes: number
  onlineMinutes: number
  overtime: number
  record: DayRecord | undefined
  lateCount: number
  earlyCount: number
  missingCount: number
}

export const SHIFT_NAME: Record<WorkShift, string> = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' }

export const LEDGER_KIND_LABEL: Record<LedgerDayKind, string> = {
  worked: 'Đủ ngày',
  half: 'Nửa ngày',
  online: 'Online',
  missing: 'Thiếu mốc',
  live: 'Đang làm',
  absent: 'Không chấm công',
  sunday: 'Chủ nhật',
}

const TZ = 'Asia/Ho_Chi_Minh'
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ })

/** ISO → số phút tính từ 00:00 theo giờ Việt Nam. */
export function minuteOfDay(iso: string): number {
  const [h, m] = clock.format(new Date(iso)).split(':').map(Number)
  return h * 60 + m
}

/** "08:00" → 480 */
export function hhmm(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function isSunday(ymd: string): boolean {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay() === 0
}

/** Các ngày hiện trên bảng: cả tháng nếu tháng đã qua, tới hôm nay nếu là tháng đang chạy. */
export function ledgerDates(month: string, today: string): string[] {
  return daysOfMonth(month).filter((ymd) => ymd <= today)
}

function fullTimeShift(key: 'morning' | 'afternoon', shift: DayShift, record: DayRecord, window: LedgerShift['window'], live: boolean): LedgerShift {
  const has = !!(shift.inAt || shift.outAt)
  return {
    key,
    window,
    mode: has ? 'offline' : 'none',
    inAt: shift.inAt,
    outAt: shift.outAt,
    lateMinutes: shift.lateMinutes ?? 0,
    lateLevel: shift.lateLevel,
    earlyMinutes: shift.earlyMinutes ?? 0,
    missing: isShiftMissing(shift, record, live),
    inProgress: live && !!shift.inAt && !shift.outAt,
    workedMinutes: shift.workedMinutes,
    entry: null,
  }
}

/**
 * Công máy của một ngày, cùng cách tính với BE: ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công.
 * Quên một mốc vẫn được tính công, chỉ ghi nhận là thiếu chấm.
 */
export function machineWorkdays(record: DayRecord): number {
  const half = (s: DayShift) => (s.inAt || s.outAt ? 0.5 : 0)
  return half(record.morning) + half(record.afternoon)
}

function kindOf(shifts: LedgerShift[], ymd: string, isToday: boolean, noLunch: boolean): LedgerDayKind {
  const active = shifts.filter((s) => s.mode !== 'none')
  if (active.length === 0) return isSunday(ymd) ? 'sunday' : 'absent'
  if (active.some((s) => s.missing)) return 'missing'
  if (isToday && active.some((s) => s.inProgress)) return 'live'
  if (active.every((s) => s.mode === 'online')) return 'online'
  if (noLunch) return 'worked'
  const scheduled = shifts.filter((s) => s.key !== 'evening').length
  return active.length >= scheduled ? 'worked' : 'half'
}

/** Bảng theo ngày của nhân sự toàn thời gian, dựng từ chấm công và tăng ca theo ngày. */
export function fullTimeLedger(
  dates: string[],
  records: Map<string, DayRecord>,
  overtimeDays: OvertimeDay[],
  schedule: WorkSchedule,
  today: string,
): LedgerDay[] {
  const overtime = new Map(overtimeDays.map((o) => [o.date, o.workdays]))
  const windows = {
    morning: { start: hhmm(schedule.morningStart), end: hhmm(schedule.morningEnd) },
    afternoon: { start: hhmm(schedule.afternoonStart), end: hhmm(schedule.afternoonEnd) },
  }
  return dates.map((date) => {
    const record = records.get(date)
    const isToday = date === today
    const shifts: LedgerShift[] = record
      ? [
          fullTimeShift('morning', record.morning, record, windows.morning, isToday),
          fullTimeShift('afternoon', record.afternoon, record, windows.afternoon, isToday),
        ]
      : (['morning', 'afternoon'] as const).map((key) => emptyShift(key, windows[key]))
    const noLunch = !!record && isWholeDayWithoutLunch(record)
    return {
      date,
      isToday,
      kind: kindOf(shifts, date, isToday, noLunch),
      shifts,
      noLunch,
      workedMinutes: record?.workedMinutes ?? null,
      workdays: record ? machineWorkdays(record) : null,
      offlineMinutes: 0,
      onlineMinutes: 0,
      overtime: overtime.get(date) ?? 0,
      record,
      lateCount: shifts.filter((s) => s.lateMinutes > 0).length,
      earlyCount: shifts.filter((s) => s.earlyMinutes > 0).length,
      missingCount: shifts.filter((s) => s.missing).length,
    }
  })
}

function emptyShift(key: WorkShift, window: LedgerShift['window']): LedgerShift {
  return {
    key,
    window,
    mode: 'none',
    inAt: null,
    outAt: null,
    lateMinutes: 0,
    lateLevel: null,
    earlyMinutes: 0,
    missing: false,
    inProgress: false,
    workedMinutes: null,
    entry: null,
  }
}

/** Bảng theo ngày của nhân sự part-time, dựng từ các ca đã tính ở `/timesheets/me/days`. */
export function partTimeLedger(
  dates: string[],
  days: Map<string, PartTimeDayView>,
  records: Map<string, DayRecord>,
  schedule: WorkSchedule,
  today: string,
): LedgerDay[] {
  const fallback: { key: WorkShift; start: string; end: string }[] = [
    { key: 'morning', start: schedule.morningStart, end: schedule.morningEnd },
    { key: 'afternoon', start: schedule.afternoonStart, end: schedule.afternoonEnd },
    ...(schedule.evening ? [{ key: 'evening' as const, start: schedule.evening.start, end: schedule.evening.end }] : []),
  ]
  return dates.map((date) => {
    const day = days.get(date)
    const isToday = date === today
    const shifts: LedgerShift[] = fallback.map(({ key, start, end }) => {
      const s = day?.shifts.find((x) => x.shift === key)
      if (!s) return emptyShift(key, { start: hhmm(start), end: hhmm(end) })
      return {
        key,
        window: { start: hhmm(s.window.start), end: hhmm(s.window.end) },
        mode: s.mode,
        inAt: s.inAt,
        outAt: s.outAt,
        lateMinutes: s.lateMinutes,
        lateLevel: s.lateLevel,
        earlyMinutes: s.earlyMinutes,
        missing: s.missing,
        inProgress: s.inProgress,
        workedMinutes: s.mode === 'none' ? null : s.minutes,
        entry: s.entry,
      }
    })
    const record = records.get(date)
    const offline = day?.offlineMinutes ?? 0
    const online = day?.onlineMinutes ?? 0
    const kind = kindOf(shifts, date, isToday, false)
    return {
      date,
      isToday,
      // Part-time tự chọn ca nên không có "nửa ngày": làm ca nào cũng là có làm.
      kind: kind === 'half' ? 'worked' : kind,
      shifts,
      noLunch: false,
      workedMinutes: day ? offline + online : null,
      workdays: null,
      offlineMinutes: offline,
      onlineMinutes: online,
      overtime: 0,
      record,
      lateCount: shifts.filter((s) => s.lateMinutes > 0).length,
      earlyCount: shifts.filter((s) => s.earlyMinutes > 0).length,
      missingCount: shifts.filter((s) => s.missing).length,
    }
  })
}

/** Ngày cần chú ý: có đi muộn, về sớm hoặc thiếu giờ vào, ra. */
export function needsAttention(day: LedgerDay): boolean {
  return day.lateCount > 0 || day.earlyCount > 0 || day.missingCount > 0
}

/** Số ngày của từng bộ lọc trên bảng theo ngày. */
export function ledgerCounts(days: LedgerDay[]) {
  return {
    attention: days.filter(needsAttention).length,
    overtime: days.filter((d) => d.overtime > 0).length,
    online: days.filter((d) => d.onlineMinutes > 0).length,
  }
}
