import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDateTime, formatDayMonth, formatMonth, weekdayShort } from '@/lib/format'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import {
  MANUAL_FIELDS,
  STATUS_LABEL,
  STATUS_TONE,
  formatOvertime,
  formatWorkdays,
  manualValue,
  parseWorkdays,
  type FullTimeTimesheetRow,
  type ManualInput,
  type OvertimeDay,
} from './monthly-timesheets.types'
import { parseOvertime } from '@/features/overtime/overtime.types'
import { useOvertimes, useReplaceOvertimes, useUpdateFullTimeTimesheet } from './use-monthly-timesheets'

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-base font-semibold tabular-nums', tone)}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <h3 className="text-sm font-medium">
      {title}
      {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
    </h3>
  )
}

function ManualForm({ month, row }: { month: string; row: FullTimeTimesheetRow }) {
  const update = useUpdateFullTimeTimesheet(month)
  const [values, setValues] = useState(() =>
    Object.fromEntries(MANUAL_FIELDS.map((f) => [f.field, formatWorkdays(manualValue(row, f.field))])),
  )
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const input: ManualInput = {}
    for (const f of MANUAL_FIELDS) {
      if (f.field === 'leaveDays' && !row.leave) continue
      const value = parseWorkdays(values[f.field], f.field)
      if (value === null) {
        setError(
          f.field === 'leaveDays'
            ? `${f.short}: tính theo 0,5 ngày, từ 0 đến 31`
            : `${f.short}: nhập số từ 0 đến 31, tối đa 2 chữ số thập phân`,
        )
        return
      }
      if (value !== manualValue(row, f.field)) input[f.field] = value
    }
    if (Object.keys(input).length === 0) {
      toast.info('Không có thay đổi')
      return
    }
    update.mutate(
      { id: row.id, input },
      {
        onSuccess: () => toast.success(`Đã lưu công quản lý nhập của ${displayName(row.user)}`),
        onError: (err) => setError(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {MANUAL_FIELDS.map((f) => {
          const locked = f.field === 'leaveDays' && !row.leave
          const id = `manual-${f.field}`
          return (
            <Field key={f.field} className="gap-1.5">
              <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
              <Input
                id={id}
                inputMode="decimal"
                autoComplete="off"
                disabled={locked}
                value={locked ? '' : values[f.field]}
                placeholder={locked ? 'Chưa có phép năm' : '0'}
                onChange={(e) => setValues((v) => ({ ...v, [f.field]: e.target.value }))}
                className="tabular-nums"
              />
              <FieldDescription className="text-xs">
                {f.field === 'leaveDays' && row.leave
                  ? `Phép năm ${row.leave.year} còn ${formatWorkdays(row.leave.remainingDays)} / ${row.leave.entitledDays} ngày`
                  : locked
                    ? 'Cần tạo phép năm trước khi ghi công phép'
                    : f.hint}
              </FieldDescription>
            </Field>
          )
        })}
      </div>
      {error && <FieldError>{error}</FieldError>}
      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Lưu
        </Button>
      </div>
    </form>
  )
}

interface OvertimeDraft {
  key: number
  date: string
  workdays: string
}

function OvertimeForm({ month, row, initial }: { month: string; row: FullTimeTimesheetRow; initial: OvertimeDay[] }) {
  const replace = useReplaceOvertimes(month)
  const nextKey = useRef(initial.length)
  const [items, setItems] = useState<OvertimeDraft[]>(() =>
    initial.map((o, i) => ({ key: i, date: o.date, workdays: formatOvertime(o.workdays) })),
  )
  const [error, setError] = useState('')
  const days = daysOfMonth(month)
  const sum = items.reduce((n, i) => n + (Number(i.workdays.replace(',', '.')) || 0), 0)

  const edit = (key: number, patch: Partial<OvertimeDraft>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  function save() {
    setError('')
    const seen = new Set<string>()
    const parsed: OvertimeDay[] = []
    for (const item of items) {
      if (!item.date.startsWith(month)) return setError(`Chọn ngày trong ${formatMonth(month).toLowerCase()}`)
      if (seen.has(item.date)) return setError(`Ngày ${formatDayMonth(item.date)} bị trùng`)
      seen.add(item.date)
      const value = parseOvertime(item.workdays)
      if (!value) {
        return setError(`Ngày ${formatDayMonth(item.date)}: nhập số công tăng ca lớn hơn 0, tối đa 3 chữ số thập phân, ví dụ 0,5 hoặc 0,375`)
      }
      parsed.push({ date: item.date, workdays: value })
    }
    parsed.sort((a, b) => a.date.localeCompare(b.date))
    replace.mutate(
      { id: row.id, items: parsed },
      {
        onSuccess: () => toast.success(`Đã lưu tăng ca của ${displayName(row.user)}`),
        onError: (err) => setError(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Ngày tăng ca"
                min={days[0]}
                max={days[days.length - 1]}
                value={item.date}
                onChange={(e) => edit(item.key, { date: e.target.value })}
                className="flex-1"
              />
              {item.date && <span className="w-7 text-xs text-muted-foreground">{weekdayShort(item.date)}</span>}
              <Input
                aria-label="Số công tăng ca"
                inputMode="decimal"
                autoComplete="off"
                value={item.workdays}
                placeholder="0,5"
                onChange={(e) => edit(item.key, { workdays: e.target.value })}
                className="w-20 text-right tabular-nums"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Xoá ngày tăng ca"
                onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có ngày tăng ca nào.</p>
      )}
      {error && <FieldError>{error}</FieldError>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems((list) => [...list, { key: nextKey.current++, date: '', workdays: '' }])}
        >
          <Plus />
          Thêm ngày
        </Button>
        <span className="text-xs text-muted-foreground">
          Tổng <b className="font-semibold text-foreground tabular-nums">{formatOvertime(sum)}</b> công
        </span>
        <Button type="button" size="sm" onClick={save} disabled={replace.isPending}>
          {replace.isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Lưu tăng ca
        </Button>
      </div>
    </div>
  )
}

function OvertimeSection({ month, row }: { month: string; row: FullTimeTimesheetRow }) {
  const { data, isPending, isError, error } = useOvertimes(row.id)
  if (isPending) return <Skeleton className="h-20 w-full" />
  if (isError) return <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
  return <OvertimeForm month={month} row={row} initial={data.items} />
}

export function MonthlyDetailSheet({
  month,
  standardWorkdays,
  row,
  focus,
  onClose,
}: {
  month: string
  standardWorkdays: number
  row: FullTimeTimesheetRow
  focus?: 'overtime'
  onClose: () => void
}) {
  const overtimeRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (focus === 'overtime') overtimeRef.current?.scrollIntoView({ block: 'start' })
  }, [focus])

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{displayName(row.user)}</SheetTitle>
          <SheetDescription>
            {row.department?.name ?? 'Chưa gán bộ phận'} · Chốt công {formatMonth(month).toLowerCase()}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="space-y-2">
            <SectionTitle title="Chốt công" />
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="Tổng công"
                value={formatWorkdays(row.totalWorkdays)}
                hint={`/ ${standardWorkdays} công chuẩn`}
                tone="text-primary"
              />
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Xác nhận công</p>
                <Badge variant="secondary" className={cn('mt-1.5', STATUS_TONE[row.confirmationStatus])}>
                  {STATUS_LABEL[row.confirmationStatus]}
                </Badge>
                {row.confirmedAt && (
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">lúc {formatDateTime(row.confirmedAt)}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng công = công máy + từ xa + lễ, bù + phép. Xin phép và tăng ca ghi riêng, không cộng vào.
            </p>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Tự động" hint="từ chấm công, tự cập nhật" />
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Công máy" value={formatWorkdays(row.machineWorkdays)} />
              <Metric
                label="Thiếu chấm"
                value={`${row.missingPunchCount} lần`}
                tone={row.missingPunchCount ? 'text-amber-600 dark:text-amber-400' : undefined}
              />
              <Metric
                label="Đi muộn"
                value={`${row.lateCount} lần`}
                tone={row.lateCount ? 'text-amber-600 dark:text-amber-400' : undefined}
              />
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Quản lý nhập" hint="sửa rồi bấm Lưu" />
            {row.confirmationStatus === 'confirmed' && (
              <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                Nhân viên đã xác nhận. Sửa số công hoặc tăng ca sẽ đưa bản chốt về Chờ xác nhận để nhân viên xác nhận lại.
              </p>
            )}
            <ManualForm month={month} row={row} />
          </section>

          <section ref={overtimeRef} className="scroll-mt-4 space-y-2">
            <SectionTitle title="Tăng ca theo ngày" hint="không cộng vào tổng công" />
            <OvertimeSection month={month} row={row} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
