import { Check, ChevronLeft, ChevronRight, Info, Loader2, RotateCcw, Sun, Sunset, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AttendancePhotos } from '@/features/attendance/AttendancePhoto'
import type { ShiftRecord } from '@/features/attendance/attendance.types'
import { DAY_KIND_LABEL, DAY_KIND_STYLE, dayKind, daysOfMonth } from '@/features/my-timesheet/day-status'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDateTime, formatDayMonth, formatDuration, formatWorkDate } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import {
  SLOT_KEYS,
  SLOT_NAMES,
  slotOrderError,
  type BoardDayDetail,
  type BoardPerson,
  type DayTimes,
} from './attendance-board.types'
import { useAdjustDay, useBoardDay, useRestoreDay } from './use-attendance-board'

const NOTE_MAX = 500

/** Phút muộn (ô giờ vào) hoặc về sớm (ô giờ ra) của giờ đang lưu. */
function deviationText(shift: ShiftRecord | undefined, kind: 'in' | 'out'): string | null {
  const minutes = (kind === 'in' ? shift?.lateMinutes : shift?.earlyMinutes) ?? 0
  if (minutes <= 0) return null
  return kind === 'in' ? `Muộn ${formatDuration(minutes)}` : `Về sớm ${formatDuration(minutes)}`
}

function TimeField({
  id,
  label,
  value,
  original,
  deviation,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  /** Giờ gốc khi khác giờ đang lưu; undefined = không hiện. */
  original: string | null | undefined
  deviation: string | null
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </FieldLabel>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card tabular-nums"
      />
      {(deviation || original !== undefined) && (
        <FieldDescription className="text-xs">
          {deviation && <span className="text-amber-700 dark:text-amber-400">{deviation}</span>}
          {deviation && original !== undefined && ' · '}
          {original !== undefined && <span>Gốc: {original ?? 'trống'}</span>}
        </FieldDescription>
      )}
    </Field>
  )
}

function Session({
  icon: Icon,
  name,
  hours,
  children,
}: {
  icon: LucideIcon
  name: string
  hours: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">Ca {hours}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  )
}

function DayForm({ detail, today }: { detail: BoardDayDetail; today: string }) {
  const adjust = useAdjustDay()
  const restore = useRestoreDay()
  const { record, schedule, editable, original } = detail
  const adjustment = record?.adjustment ?? null
  const [values, setValues] = useState<string[]>(() => detail.times.map((t) => t ?? ''))
  const [note, setNote] = useState(adjustment?.note ?? '')
  const [error, setError] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)
  const kind = dayKind(record ?? undefined, detail.date === today)
  const name = displayName(detail.user)
  const shifts = [record?.morning, record?.morning, record?.afternoon, record?.afternoon]

  function field(i: number) {
    const differs = original && original[i] !== detail.times[i]
    return (
      <TimeField
        key={SLOT_KEYS[i]}
        id={`board-${SLOT_KEYS[i]}`}
        label={i % 2 === 0 ? 'Giờ vào' : 'Giờ ra'}
        value={values[i]}
        original={differs ? original[i] : undefined}
        deviation={deviationText(shifts[i], i % 2 === 0 ? 'in' : 'out')}
        disabled={!editable || adjust.isPending}
        onChange={(value) => setValues((list) => list.map((v, j) => (j === i ? value : v)))}
      />
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const times = values.map((v) => v || null) as DayTimes
    const trimmed = note.trim()
    if (times.every((t) => t === null)) {
      return setError(
        adjustment ? 'Cần ít nhất một mốc giờ. Muốn bỏ giờ đã bổ sung thì bấm Khôi phục giờ gốc' : 'Nhập ít nhất một mốc giờ',
      )
    }
    const orderError = slotOrderError(times)
    if (orderError) return setError(orderError)
    if (!trimmed) return setError('Cần ghi chú lý do bổ sung')
    const sameTimes = times.every((t, i) => t === detail.times[i])
    if (sameTimes && (!adjustment || adjustment.note === trimmed)) {
      toast.info('Không có thay đổi')
      return
    }
    adjust.mutate(
      {
        userId: detail.user.id,
        date: detail.date,
        input: { morningIn: times[0], morningOut: times[1], afternoonIn: times[2], afternoonOut: times[3], note: trimmed },
      },
      {
        onSuccess: (saved) =>
          toast.success(
            saved.original
              ? `Đã lưu giờ bổ sung ngày ${formatDayMonth(detail.date)} của ${name}`
              : `Giờ trùng giờ gốc, đã khôi phục ngày ${formatDayMonth(detail.date)} của ${name}`,
          ),
        onError: (err) => setError(getApiErrorMessage(err)),
      },
    )
  }

  function doRestore() {
    restore.mutate(
      { userId: detail.user.id, date: detail.date },
      {
        onSuccess: () => {
          setConfirmRestore(false)
          toast.success(`Đã khôi phục giờ gốc ngày ${formatDayMonth(detail.date)} của ${name}`)
        },
        onError: (err) => {
          setConfirmRestore(false)
          setError(getApiErrorMessage(err))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={DAY_KIND_STYLE[kind]}>
            {DAY_KIND_LABEL[kind]}
          </Badge>
          {adjustment && (
            <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-400">
              Đã bổ sung
            </Badge>
          )}
          {!!record?.lateMinutes && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Muộn {formatDuration(record.lateMinutes)}
            </Badge>
          )}
          {detail.date === today && <span className="text-xs text-muted-foreground">Hôm nay, còn đang chấm công</span>}
        </div>

        {!editable && detail.lockedReason && (
          <p className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            {detail.lockedReason}
          </p>
        )}

        {adjustment && (
          <div className="space-y-1 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
            <p>
              <b className="font-medium">{displayName(adjustment.adjustedBy)}</b> bổ sung lúc{' '}
              <span className="tabular-nums">{formatDateTime(adjustment.adjustedAt)}</span>
            </p>
            <p className="break-words">“{adjustment.note}”</p>
            {original && (
              <p className="text-sky-800/80 tabular-nums dark:text-sky-200/80">
                Giờ gốc: {original.map((t, i) => `${SLOT_NAMES[i].toLowerCase()} ${t ?? 'trống'}`).join(' · ')}
              </p>
            )}
          </div>
        )}

        <Session icon={Sun} name="Buổi sáng" hours={`${schedule.morningStart} – ${schedule.morningEnd}`}>
          {field(0)}
          {field(1)}
        </Session>
        <Session icon={Sunset} name="Buổi chiều" hours={`${schedule.afternoonStart} – ${schedule.afternoonEnd}`}>
          {field(2)}
          {field(3)}
        </Session>

        {editable && (
          <Field className="gap-1.5">
            <FieldLabel htmlFor="board-note">Ghi chú lý do bổ sung</FieldLabel>
            <Textarea
              id="board-note"
              value={note}
              maxLength={NOTE_MAX}
              disabled={adjust.isPending}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Quên chấm giờ ra, đã xác nhận với trưởng bộ phận"
              className="bg-card"
            />
            <FieldDescription className="text-xs">
              Bắt buộc. Lưu xong, công máy, đi muộn và thiếu chấm của tháng tự tính lại; nếu nhân sự đã xác nhận công tháng
              này thì bản chốt về Chờ xác nhận.
            </FieldDescription>
          </Field>
        )}

        {error && <FieldError>{error}</FieldError>}

        {record && record.punches.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-sm text-muted-foreground">Ảnh chấm công gốc</span>
            <AttendancePhotos record={record} title={name} />
          </div>
        )}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
          {adjustment ? (
            <Button type="button" variant="outline" onClick={() => setConfirmRestore(true)} disabled={adjust.isPending}>
              <RotateCcw />
              Khôi phục giờ gốc
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={adjust.isPending}>
            {adjust.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            Lưu điều chỉnh
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestore}
        title="Khôi phục giờ gốc?"
        description={`Bỏ giờ đã bổ sung và ghi chú của ngày ${formatDayMonth(detail.date)}, trả về giờ chấm gốc của ${name}. Công tháng tự tính lại.`}
        confirmLabel="Khôi phục"
        variant="default"
        pending={restore.isPending}
        onConfirm={doRestore}
        onCancel={() => setConfirmRestore(false)}
      />
    </form>
  )
}

/** Chi tiết chấm công một ngày của một người: xem 4 mốc, ảnh, và bổ sung / sửa giờ của ngày đã qua. */
export function BoardDaySheet({
  month,
  person,
  date,
  today,
  onDateChange,
  onClose,
}: {
  month: string
  person: BoardPerson
  date: string
  today: string
  onDateChange: (date: string) => void
  onClose: () => void
}) {
  const { data, isPending, isError, error, refetch } = useBoardDay(person.user.id, date)
  const days = daysOfMonth(month).filter((d) => d <= today)
  const index = days.indexOf(date)

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{displayName(person.user)}</SheetTitle>
          <SheetDescription>
            {person.department?.name ?? 'Chưa gán bộ phận'} · {EMPLOYMENT_LABEL[person.employmentType]}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={index <= 0}
            onClick={() => onDateChange(days[index - 1])}
            aria-label="Ngày trước"
          >
            <ChevronLeft />
          </Button>
          <Select value={date} onValueChange={onDateChange}>
            <SelectTrigger aria-label="Ngày chấm công" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={d}>
                  <span className="capitalize">{formatWorkDate(d, { long: true })}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={index === -1 || index >= days.length - 1}
            onClick={() => onDateChange(days[index + 1])}
            aria-label="Ngày sau"
          >
            <ChevronRight />
          </Button>
        </div>
        {isPending ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <p className="p-4 text-sm text-destructive">
            {getApiErrorMessage(error)}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Thử lại
            </button>
          </p>
        ) : (
          <DayForm
            key={`${data.date}|${data.times.join(',')}|${data.record?.adjustment?.adjustedAt ?? ''}`}
            detail={data}
            today={today}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

