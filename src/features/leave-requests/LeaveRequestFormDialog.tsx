import { Info, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAttendanceToday } from '@/features/attendance/use-attendance'
import { useMe } from '@/features/auth/use-auth'
import { getApiErrorMessage } from '@/lib/api-client'
import { FEATURES } from '@/lib/features'
import { todayYmd } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { AttachmentDropzone } from './AttachmentDropzone'
import { LATE_EXCUSE_MINUTES, MAX_ATTACHMENTS, MAX_ATTACHMENT_MB, OFFSITE_LABEL, TYPE_META, TYPE_ORDER, formatNumber } from './leave-request-format'
import type { LeaveRequestDetail, LeaveRequestType, OffsiteWorkKind } from './leave-requests.types'
import { useApprovers, useCreateLeaveRequest } from './use-leave-requests'

const LAST_APPROVER_KEY = 'vcb.leave-requests.approver'
/** Ô chọn người duyệt đang tạm ẩn (bật lại ở lib/features.ts). */
const PICK_APPROVER = FEATURES.leaveApproverPicker
const QUICK_DAYS = [0.5, 1, 2, 3]
const QUICK_HOURS = [0.5, 1, 1.5, 2]

const DATE_LABEL: Record<LeaveRequestType, [string, string]> = {
  leave: ['Nghỉ từ ngày', 'Từ giờ'],
  late_arrival: ['Ngày đi muộn', 'Giờ dự kiến đến'],
  early_leave: ['Ngày về sớm', 'Giờ ra về'],
  offsite: ['Ngày làm ngoài', 'Từ giờ'],
}

function readLastApprover(): string {
  try {
    return localStorage.getItem(LAST_APPROVER_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveLastApprover(id: string) {
  try {
    localStorage.setItem(LAST_APPROVER_KEY, id)
  } catch {
    // Không lưu được thì lần sau chọn lại, không ảnh hưởng gửi đơn.
  }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Nhóm lựa chọn dạng thẻ, bấm để chọn một. */
function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: {
  label: string
  value: T | null
  options: { value: T; title: string; hint?: string; disabled?: boolean }[]
  onChange: (value: T) => void
  columns?: 1 | 2
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
      {options.map((o) => {
        const checked = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-h-11 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              checked ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10' : 'hover:bg-muted/50',
            )}
          >
            <span className="text-sm font-medium">{o.title}</span>
            {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

function QuickPicks({ values, current, unit, onPick }: { values: number[]; current: number; unit: string; onPick: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((n) => (
        <Button
          key={n}
          type="button"
          size="sm"
          variant={current === n ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => onPick(n)}
        >
          {formatNumber(n)} {unit}
        </Button>
      ))}
    </div>
  )
}

/**
 * Form xin phép thay cho form Lark: họ tên, mã nhân viên lấy từ tài khoản đăng nhập; các trường riêng hiện theo hình thức.
 * Như form Lark, mọi trường hiện ra đều bắt buộc, trừ file xác nhận duyệt nghỉ của quản lý (chọn, dán hoặc kéo thả, lưu trên R2).
 */
export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (detail: LeaveRequestDetail) => void
}) {
  const { data: me } = useMe()
  const { data: today } = useAttendanceToday()
  const { data: approvers = [], isLoading: approversLoading } = useApprovers(open && PICK_APPROVER)
  const create = useCreateLeaveRequest()

  const schedule = today?.schedule
  const isPartTime = me?.employmentType === 'part_time'

  const [type, setType] = useState<LeaveRequestType>('leave')
  const [startDate, setStartDate] = useState(todayYmd())
  const [startTime, setStartTime] = useState('08:00')
  const [leaveDays, setLeaveDays] = useState(1)
  const [deduct, setDeduct] = useState<boolean | null>(null)
  const [handover, setHandover] = useState('')
  const [hours, setHours] = useState(1)
  const [offsiteKind, setOffsiteKind] = useState<OffsiteWorkKind | null>(null)
  const [reason, setReason] = useState('')
  const [approverId, setApproverId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Giờ mặc định theo ca của người gửi: về sớm lấy giờ hết ca chiều, còn lại lấy giờ vào ca sáng. */
  const defaultTime = (t: LeaveRequestType) =>
    (t === 'early_leave' ? schedule?.afternoonEnd : schedule?.morningStart)?.slice(0, 5) ?? (t === 'early_leave' ? '17:30' : '08:00')

  // Xoá form mỗi lần mở.
  useEffect(() => {
    if (!open) return
    setType('leave')
    setStartDate(todayYmd())
    setStartTime(defaultTime('leave'))
    setLeaveDays(1)
    setDeduct(null)
    setHandover('')
    setHours(1)
    setOffsiteKind(null)
    setReason('')
    setFiles([])
    setAcknowledged(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Chọn sẵn người duyệt lần trước (nếu vẫn còn trong danh sách).
  useEffect(() => {
    if (!open || !PICK_APPROVER || approversLoading) return
    const last = readLastApprover()
    setApproverId(approvers.some((a) => a.id === last) ? last : approvers.length === 1 ? approvers[0].id : '')
  }, [open, approversLoading, approvers])

  function changeType(next: LeaveRequestType) {
    setType(next)
    setStartTime(defaultTime(next))
    setError(null)
  }

  const shiftHint = useMemo(() => {
    if (!schedule || !/^\d{2}:\d{2}$/.test(startTime)) return null
    return toMinutes(startTime) < toMinutes(schedule.morningEnd.slice(0, 5)) ? 'ca sáng' : 'ca chiều'
  }, [schedule, startTime])

  const [dateLabel, timeLabel] = DATE_LABEL[type]
  const excuse = type === 'late_arrival' || type === 'early_leave'
  /** Các trường bắt buộc còn trống, theo thứ tự trên form. */
  const missingFields = [
    !startDate && dateLabel.toLowerCase(),
    !startTime && timeLabel.toLowerCase(),
    type === 'leave' && !(leaveDays > 0) && 'số ngày nghỉ',
    type === 'leave' && deduct === null && 'có trừ phép năm không',
    type === 'leave' && !handover.trim() && 'người nhận bàn giao',
    excuse && !(hours > 0) && 'số giờ xin phép',
    type === 'offsite' && !offsiteKind && 'chi tiết công việc bên ngoài',
    !reason.trim() && 'lý do xin phép',
    PICK_APPROVER && !approverId && 'quản lý trực tiếp',
    !acknowledged && 'xác nhận đã nắm rõ quy định',
  ].filter((f): f is string => typeof f === 'string')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (missingFields.length) {
      setError(`Còn thiếu: ${missingFields.join(', ')}.`)
      return
    }
    setError(null)
    try {
      const res = await create.mutateAsync({
        type,
        reason: reason.trim(),
        startDate,
        startTime,
        approverId: PICK_APPROVER ? approverId : undefined,
        acknowledged,
        attachments: files,
        ...(type === 'leave' ? { leaveDays, deductAnnualLeave: deduct!, handover: handover.trim() } : {}),
        ...(excuse ? { hours } : {}),
        ...(type === 'offsite' ? { offsiteKind: offsiteKind! } : {}),
      })
      if (PICK_APPROVER) saveLastApprover(approverId)
      onCreated(res.data)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={submit} className="flex max-h-[92dvh] min-h-0 flex-col">
          <DialogHeader className="border-b px-5 pt-5 pb-4">
            <DialogTitle>Tạo đơn xin phép</DialogTitle>
            <DialogDescription className="text-xs">
              Đơn gửi tới {PICK_APPROVER ? 'quản lý trực tiếp' : 'các leader và quản lý'} để duyệt. Các trường đều bắt buộc, trừ file xác nhận của quản lý. Họ tên và mã nhân viên lấy theo
              tài khoản của bạn{me ? ` (${me.fullName || me.email})` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-2">
              <Label className="text-xs font-medium">Hình thức</Label>
              <div role="radiogroup" aria-label="Hình thức" className="grid grid-cols-2 gap-2">
                {TYPE_ORDER.map((t) => {
                  const meta = TYPE_META[t]
                  const checked = type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => changeType(t)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        checked ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', meta.tone)}>
                        <meta.icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-tight font-medium">{meta.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{meta.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lr-date" className="text-xs font-medium">
                  {dateLabel}
                </Label>
                <Input id="lr-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lr-time" className="text-xs font-medium">
                  {timeLabel}
                </Label>
                <Input id="lr-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              {shiftHint && type !== 'leave' && type !== 'offsite' && (
                <p className="col-span-2 -mt-1 text-xs text-muted-foreground">Tính vào {shiftHint} ngày đó.</p>
              )}
            </section>

            {type === 'leave' && (
              <section className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lr-days" className="text-xs font-medium">
                    Số ngày nghỉ
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="lr-days"
                      type="number"
                      inputMode="decimal"
                      min={0.5}
                      max={60}
                      step={0.5}
                      value={Number.isNaN(leaveDays) ? '' : leaveDays}
                      onChange={(e) => setLeaveDays(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    <QuickPicks values={QUICK_DAYS} current={leaveDays} unit="ngày" onPick={setLeaveDays} />
                  </div>
                  <p className="text-xs text-muted-foreground">Tính theo 0,5 ngày, không tính Chủ nhật.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Trừ vào ngày nghỉ phép năm?</Label>
                  <ChoiceGroup
                    label="Trừ vào ngày nghỉ phép năm"
                    value={deduct === null ? null : deduct ? 'yes' : 'no'}
                    onChange={(v) => setDeduct(v === 'yes')}
                    options={[
                      {
                        value: 'yes',
                        title: 'Có',
                        hint: isPartTime ? 'Part-time không có phép năm' : 'Nghỉ có hưởng lương',
                        disabled: isPartTime,
                      },
                      { value: 'no', title: 'Không', hint: 'Nghỉ không lương' },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lr-handover" className="text-xs font-medium">
                    Công việc đã bàn giao cho ai trong thời gian nghỉ?
                  </Label>
                  <Input
                    id="lr-handover"
                    value={handover}
                    onChange={(e) => setHandover(e.target.value)}
                    maxLength={300}
                    placeholder="Họ tên + mã nhân viên người tiếp nhận"
                  />
                </div>
              </section>
            )}

            {(type === 'late_arrival' || type === 'early_leave') && (
              <section className="space-y-1.5">
                <Label htmlFor="lr-hours" className="text-xs font-medium">
                  Thời gian {type === 'late_arrival' ? 'đi muộn' : 'về sớm'} xin phép (số giờ)
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="lr-hours"
                    type="number"
                    inputMode="decimal"
                    min={0.1}
                    max={8}
                    step={0.1}
                    value={Number.isNaN(hours) ? '' : hours}
                    onChange={(e) => setHours(parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <QuickPicks values={QUICK_HOURS} current={hours} unit="giờ" onPick={setHours} />
                </div>
                {type === 'late_arrival' && (
                  <p className="flex gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <Info className="mt-px size-3.5 shrink-0" />
                    <span>
                      Mỗi tháng bạn có {LATE_EXCUSE_MINUTES} phút đi muộn có phép. Đơn được duyệt thì số phút muộn của ca đó
                      được trừ vào quỹ này và không tính là đi muộn; dùng hết {LATE_EXCUSE_MINUTES} phút thì đi muộn có đơn
                      vẫn tính như bình thường.
                    </span>
                  </p>
                )}
              </section>
            )}

            {type === 'offsite' && (
              <section className="space-y-1.5">
                <Label className="text-xs font-medium">Chi tiết công việc bên ngoài</Label>
                <ChoiceGroup
                  label="Chi tiết công việc bên ngoài"
                  value={offsiteKind}
                  onChange={setOffsiteKind}
                  columns={1}
                  options={(Object.keys(OFFSITE_LABEL) as OffsiteWorkKind[]).map((k) => ({ value: k, title: OFFSITE_LABEL[k] }))}
                />
              </section>
            )}

            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="lr-reason" className="text-xs font-medium">
                  Lý do xin phép
                </Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">{reason.length}/1000</span>
              </div>
              <Textarea
                id="lr-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-y text-sm"
                placeholder="Ví dụ: Đưa con đi khám"
              />
            </section>

            {PICK_APPROVER && (
              <section className="space-y-1.5">
                <Label className="text-xs font-medium">Quản lý trực tiếp (người duyệt)</Label>
                <Select value={approverId} onValueChange={setApproverId} disabled={approversLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={approversLoading ? 'Đang tải…' : 'Chọn người duyệt'} />
                  </SelectTrigger>
                  <SelectContent>
                    {approvers.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        <span className="text-muted-foreground">
                          {' '}
                          · {ROLE_LABEL[a.role]}
                          {a.departmentName ? ` · ${a.departmentName}` : ''}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            )}

            <section className="space-y-1.5">
              <Label className="block text-xs font-medium">
                Xác nhận bằng văn bản duyệt nghỉ của quản lý{' '}
                <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Đơn nghỉ phép viết tay hoặc ảnh chụp tin nhắn có sự đồng ý. Ảnh hoặc PDF, tối đa {MAX_ATTACHMENTS} file, mỗi
                file ≤ {MAX_ATTACHMENT_MB}MB.
              </p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Nếu chưa có sự đồng ý mà nghỉ thì coi là nghỉ không phép.
              </p>
              <AttachmentDropzone files={files} onChange={setFiles} onError={setError} disabled={create.isPending} />
            </section>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>Tôi đã nắm rõ quy định của công ty về việc nghỉ phép.</span>
            </label>
          </div>

          {/* Ngoài vùng cuộn để bấm Gửi đơn là thấy ngay còn thiếu gì. */}
          {error && (
            <p role="alert" className="border-t bg-destructive/10 px-5 py-2.5 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="mx-0 mb-0 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Huỷ
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Gửi đơn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
