import { CalendarOff, Clock4, LogOut, MapPin, type LucideIcon } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { LeaveRequest, LeaveRequestStatus, LeaveRequestType, OffsiteWorkKind, RequestShift } from './leave-requests.types'

/**
 * Mỗi người mỗi tháng có bấy nhiêu phút đi muộn có phép (cùng số với BE). Đơn đi muộn được duyệt trừ phút muộn
 * vào quỹ này theo thứ tự ngày; hết quỹ thì đi muộn có đơn vẫn tính như bình thường.
 */
export const LATE_EXCUSE_MINUTES = 60

export const MAX_ATTACHMENTS = 3
export const MAX_ATTACHMENT_MB = 5

export const TYPE_META: Record<LeaveRequestType, { label: string; hint: string; icon: LucideIcon; tone: string }> = {
  leave: {
    label: 'Nghỉ phép',
    hint: 'Nghỉ một hoặc nhiều ngày',
    icon: CalendarOff,
    tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  late_arrival: {
    label: 'Đi muộn',
    hint: `Trừ vào ${LATE_EXCUSE_MINUTES} phút đi muộn có phép mỗi tháng`,
    icon: Clock4,
    tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  early_leave: {
    label: 'Về sớm',
    hint: 'Ra về trước giờ hết ca',
    icon: LogOut,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  offsite: {
    label: 'Làm việc ngoài văn phòng',
    hint: 'Cửa hàng, online hoặc bên ngoài',
    icon: MapPin,
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
}

export const TYPE_ORDER: LeaveRequestType[] = ['leave', 'late_arrival', 'early_leave', 'offsite']

export const STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã rút',
}

export const STATUS_STYLE: Record<LeaveRequestStatus, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300',
  approved:
    'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  rejected: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300',
  cancelled: 'border-border bg-muted text-muted-foreground',
}

export const OFFSITE_LABEL: Record<OffsiteWorkKind, string> = {
  store: 'Làm tại cửa hàng',
  online: 'Làm việc online (hưởng 80% lương cơ bản)',
  outside: 'Làm việc bên ngoài',
}

export const SHIFT_LABEL: Record<RequestShift, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  evening: 'Ca tối',
}

/** 1.5 → "1,5" */
export function formatNumber(n: number): string {
  return String(n).replace('.', ',')
}

/** Phần "bao lâu" của đơn: "1,5 ngày · trừ phép năm", "1 giờ · ca sáng", "Làm tại cửa hàng". */
export function durationLabel(r: Pick<LeaveRequest, 'type' | 'leaveDays' | 'deductAnnualLeave' | 'hours' | 'offsiteKind' | 'startShift'>): string {
  switch (r.type) {
    case 'leave':
      return `${formatNumber(r.leaveDays ?? 0)} ngày · ${r.deductAnnualLeave ? 'trừ phép năm' : 'không lương'}`
    case 'late_arrival':
    case 'early_leave':
      return `${formatNumber(r.hours ?? 0)} giờ · ${SHIFT_LABEL[r.startShift].toLowerCase()}`
    case 'offsite':
      return r.offsiteKind ? OFFSITE_LABEL[r.offsiteKind] : ''
  }
}

/** "08:00 · 17/11/2026" */
export function startLabel(r: Pick<LeaveRequest, 'startDate' | 'startTime'>): string {
  return `${r.startTime} · ${formatDate(r.startDate)}`
}

/** "Tháng 11/2026: 1,5 ngày" */
export function allocationLabel(a: { year: number; month: number; days: number }): string {
  return `Tháng ${a.month}/${a.year}: ${formatNumber(a.days)} ngày`
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
