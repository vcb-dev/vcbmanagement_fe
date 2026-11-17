import type { AttendanceSlot } from '@/features/attendance/attendance.types'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import type { WorkShift } from '@/features/part-time/part-time.types'
import { formatDuration, formatTime } from '@/lib/format'
import { lateLevelLabel } from '@/lib/late-levels'
import { SHIFT_NAME, type LedgerDay, type LedgerShift } from './day-ledger'

export type LedgerVariant = 'full_time' | 'part_time'

/** Màu chữ của lời ghi chú và trạng thái ngày. */
export type Tone = 'error' | 'warn' | 'live' | 'info' | 'ot' | 'ok' | 'muted'

export const TONE_TEXT: Record<Tone, string> = {
  error: 'text-rose-700 dark:text-rose-400',
  warn: 'text-amber-800 dark:text-amber-300',
  live: 'text-primary',
  info: 'text-sky-700 dark:text-sky-400',
  ot: 'text-violet-700 dark:text-violet-400',
  ok: 'text-emerald-700 dark:text-emerald-400',
  muted: 'text-muted-foreground',
}

/** Thứ tự ưu tiên khi gộp nhiều lời ghi chú thành một màu. */
const TONE_RANK: Tone[] = ['error', 'warn', 'live', 'info', 'ot', 'ok', 'muted']

export function strongestTone(tones: Tone[]): Tone {
  return TONE_RANK.find((t) => tones.includes(t)) ?? 'muted'
}

/** Một ô giờ của bảng: giờ chấm và lời ghi chú nằm ngay dưới. */
export interface SlotView {
  time: string
  /** normal: giờ thường; off: muộn hoặc về sớm; missing: quên chấm; empty: không có giờ. */
  state: 'normal' | 'off' | 'missing' | 'empty'
  caption: string | null
  tone: Tone
  /** Lời ghi chú ngắn cho dòng ca trên điện thoại, vd "quên ra". */
  short: string | null
  /** Chú thích khi rê chuột: khoảng phút của mốc muộn, ghi chú của quản lý khi bổ sung giờ. */
  title?: string
}

const EMPTY: SlotView = { time: '–', state: 'empty', caption: null, tone: 'muted', short: null }

const SLOT_OF: Record<WorkShift, [AttendanceSlot, AttendanceSlot] | null> = {
  morning: ['morning_in', 'morning_out'],
  afternoon: ['afternoon_in', 'afternoon_out'],
  evening: null,
}

/** Lượt quản lý đã bổ sung hoặc sửa: giờ đang dùng khác lượt chấm gốc (lượt gốc nằm ở `punches`). */
function slotAdjusted(day: LedgerDay, shift: WorkShift, which: 0 | 1, iso: string): boolean {
  const record = day.record
  const slot = SLOT_OF[shift]?.[which]
  if (!record?.adjustment || !slot) return false
  const punch = record.punches.find((p) => p.slot === slot)
  return !punch || formatTime(punch.at) !== formatTime(iso)
}

/** Ô Vào (`which` = 0) hoặc Ra (`which` = 1) của một ca. */
export function slotView(day: LedgerDay, s: LedgerShift, which: 0 | 1, thresholds: readonly number[]): SlotView {
  const iso = which === 0 ? s.inAt : s.outAt
  if (!iso) {
    // Vào sáng, ra chiều, không chấm trưa: ra sáng và vào chiều trống nhưng không phải quên chấm.
    if (day.noLunch && s.key === 'morning' && which === 1) {
      return { ...EMPTY, caption: 'không chấm trưa', short: 'không chấm trưa' }
    }
    if (which === 1 && s.inProgress) return { ...EMPTY, caption: 'đang trong ca', tone: 'live', short: 'đang làm' }
    if (s.missing) {
      return { time: '--:--', state: 'missing', caption: 'quên chấm', tone: 'error', short: which === 0 ? 'quên vào' : 'quên ra' }
    }
    return EMPTY
  }

  const view: SlotView = { time: formatTime(iso), state: 'normal', caption: null, tone: 'muted', short: null }
  if (which === 0 && s.lateMinutes > 0) {
    const level = s.lateLevel != null && thresholds.length ? ` · M${s.lateLevel}` : ''
    view.state = 'off'
    view.tone = 'warn'
    view.caption = `muộn ${formatDuration(s.lateMinutes)}${level}`
    view.title = s.lateLevel != null ? lateLevelLabel(s.lateLevel, thresholds) : undefined
  } else if (which === 1 && s.earlyMinutes > 0) {
    view.state = 'off'
    view.tone = 'warn'
    view.caption = `về sớm ${formatDuration(s.earlyMinutes)}`
  }
  if (slotAdjusted(day, s.key, which, iso)) {
    const note = day.record?.adjustment?.note.trim()
    view.title = [view.title, note ? `Quản lý đã bổ sung giờ: ${note}` : 'Quản lý đã bổ sung giờ'].filter(Boolean).join('\n')
    if (view.caption) {
      view.caption += ' · QL bổ sung'
    } else {
      view.caption = 'quản lý bổ sung'
      view.tone = 'info'
    }
  }
  view.short = view.caption
  return view
}

/** Ca không có giờ vào, ra cụ thể (part-time làm online, hoặc giờ quản lý bổ sung): gộp hai ô thành một. */
export function mergedShift(s: LedgerShift): { text: string; caption: string | null; tone: Tone } | null {
  if (s.mode === 'online') return { text: 'Online', caption: s.workedMinutes ? formatDuration(s.workedMinutes) : null, tone: 'info' }
  if (s.mode !== 'none' && !s.inAt && !s.outAt && s.workedMinutes) {
    return { text: 'Bổ sung', caption: formatDuration(s.workedMinutes), tone: 'info' }
  }
  return null
}

const sum = (list: LedgerShift[], pick: (s: LedgerShift) => number) => list.reduce((n, s) => n + pick(s), 0)

/** Trạng thái ngắn của một ngày, theo mức cần chú ý: quên chấm, muộn, về sớm, đang làm, không chấm, tăng ca, đủ công. */
export function dayStatus(day: LedgerDay, variant: LedgerVariant): { text: string; tone: Tone } {
  const missing = day.shifts.filter((s) => s.missing)
  if (missing.length === 1) {
    const s = missing[0]
    return { text: `Quên ${s.inAt ? 'ra' : 'vào'} ${SHIFT_NAME[s.key].toLowerCase()}`, tone: 'error' }
  }
  if (missing.length > 1) return { text: `Quên ${missing.length} mốc`, tone: 'error' }

  const late = sum(day.shifts, (s) => s.lateMinutes)
  if (late > 0) return { text: `Muộn ${formatDuration(late)}`, tone: 'warn' }
  const early = sum(day.shifts, (s) => s.earlyMinutes)
  if (early > 0) return { text: `Về sớm ${formatDuration(early)}`, tone: 'warn' }

  if (day.kind === 'live') return { text: 'Đang làm', tone: 'live' }
  if (day.kind === 'absent') {
    if (day.isToday) return { text: 'Chưa chấm công', tone: 'muted' }
    return variant === 'full_time' ? { text: 'Không chấm công', tone: 'error' } : { text: 'Không làm', tone: 'muted' }
  }
  if (day.kind === 'sunday') return { text: 'Nghỉ', tone: 'muted' }
  if (day.overtime > 0) return { text: `Tăng ca ${formatOvertime(day.overtime)} giờ`, tone: 'ot' }
  if (variant === 'part_time') {
    if (day.kind === 'online') return { text: `Online ${formatDuration(day.onlineMinutes)}`, tone: 'info' }
    return { text: formatDuration(day.workedMinutes ?? 0), tone: 'muted' }
  }
  if (day.kind === 'half') return { text: 'Nửa ngày', tone: 'muted' }
  return { text: 'Đủ công', tone: 'ok' }
}

/** "07:54 – 17:34": giờ vào đầu tiên và giờ ra cuối cùng trong ngày; trống khi không có ca nào có giờ. */
export function timesLine(day: LedgerDay): string {
  const active = day.shifts.filter((s) => s.inAt || s.outAt)
  if (active.length === 0) return ''
  const first = active[0]
  const last = active[active.length - 1]
  const start = first.inAt ? formatTime(first.inAt) : '--:--'
  const end = last.outAt ? formatTime(last.outAt) : last.inProgress ? '…' : '--:--'
  return `${start} – ${end}`
}

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Câu tổng ở chân lịch cho khoảng đang xem, vd "Tuần 3: 5 công · đi muộn 2 lần · quên chấm 3 mốc · tăng ca 1,5 giờ". */
export function periodSummary(days: LedgerDay[], variant: LedgerVariant, label: string): string {
  const late = days.reduce((n, d) => n + d.lateCount, 0)
  const missing = days.reduce((n, d) => n + d.missingCount, 0)
  if (variant === 'full_time') {
    const workdays = days.reduce((n, d) => n + (d.workdays ?? 0), 0)
    const overtime = days.reduce((n, d) => n + d.overtime, 0)
    return `${label}: ${num(workdays)} công · đi muộn ${late} lần · quên chấm ${missing} mốc · tăng ca ${formatOvertime(overtime)} giờ`
  }
  const offline = days.reduce((n, d) => n + d.offlineMinutes, 0)
  const online = days.reduce((n, d) => n + d.onlineMinutes, 0)
  return `${label}: offline ${formatDuration(offline)} · online ${formatDuration(online)} · đi muộn ${late} lần · quên chấm ${missing} mốc`
}
