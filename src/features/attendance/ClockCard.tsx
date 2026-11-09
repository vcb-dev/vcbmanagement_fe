import { AlarmClock, CircleAlert, Clock3, Loader2, LocateFixed, LogIn, LogOut, MapPin, MapPinOff, PartyPopper, RotateCw, ScanFace, ShieldCheck, ShieldX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDuration, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  SHIFT_LABEL,
  SLOT_LABEL,
  type AttendanceSlot,
  type ShiftKey,
  type ShiftRecord,
  type WorkSchedule,
} from './attendance.types'
import { AttendanceStatus } from './AttendanceStatus'
import { CameraCapture } from './CameraCapture'
import { useAttendanceToday, usePhotoCheck, usePunch } from './use-attendance'
import { geoVerdict, useGeolocation, type GeoVerdict } from './use-geolocation'

const VN_TZ = 'Asia/Ho_Chi_Minh'

function vnDateLabel(d: Date) {
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: VN_TZ,
  })
}

function vnHms(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return { hour: get('hour'), minute: get('minute'), second: get('second') }
}

/** Đồng hồ hệ thống (VN): neo theo giờ server, chạy bằng performance.now() nên không bị kéo theo khi đổi giờ máy. */
function useSystemNow(serverTime?: string, intervalMs = 1000) {
  const [now, setNow] = useState(() => (serverTime ? new Date(serverTime) : new Date()))
  useEffect(() => {
    const originServer = serverTime ? new Date(serverTime).getTime() : Date.now()
    const originPerf = performance.now()
    const tick = () => setNow(new Date(originServer + (performance.now() - originPerf)))
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [serverTime, intervalMs])
  return now
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function slotTime(schedule: WorkSchedule, slot: AttendanceSlot) {
  return {
    morning_in: schedule.morningStart,
    morning_out: schedule.morningEnd,
    afternoon_in: schedule.afternoonStart,
    afternoon_out: schedule.afternoonEnd,
  }[slot]
}

const isInSlot = (slot: AttendanceSlot) => slot.endsWith('_in')

export function ClockCard({ className }: { className?: string }) {
  const { data, isPending } = useAttendanceToday()
  const now = useSystemNow(data?.serverTime)
  const punch = usePunch()
  const photoCheck = usePhotoCheck()
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)

  const record = data?.record ?? null
  const nextSlot = data?.nextSlot ?? null
  const busy = punch.isPending || photoCheck.isPending
  const photoOk = !!photo && photoCheck.isSuccess
  const fence = data?.geofence ?? null
  const geo = useGeolocation(!!fence && !!nextSlot)
  const verdict = fence ? geoVerdict(fence, geo.state) : null
  const locationOk = !verdict || verdict.allowed
  const face = data?.face
  const faceRequired = !!face?.required
  const faceApproved = face?.profile?.status === 'approved'
  const clock = vnHms(now)
  const nowMinutes = toMinutes(`${clock.hour}:${clock.minute}`)

  /** Ca đang mở thì tính "đã làm" theo thời gian thực. */
  const liveWorked = (shift: ShiftRecord | undefined) => {
    if (!shift?.inAt) return null
    if (shift.outAt) return shift.workedMinutes
    return Math.max(0, Math.round((now.getTime() - new Date(shift.inAt).getTime()) / 60_000))
  }

  const submit = () => {
    if (!photo || !photoOk || !nextSlot || !locationOk || (faceRequired && !faceApproved)) return
    punch.mutate(
      {
        slot: nextSlot,
        photo,
        note: note.trim() || undefined,
        location: geo.state.status === 'ok' ? geo.state.reading : undefined,
      },
      {
        onSuccess: () => {
          setNote('')
          setPhoto(null)
          photoCheck.reset()
        },
      },
    )
  }

  const target = data && nextSlot ? slotTime(data.schedule, nextSlot) : null
  const lateNow = target && nextSlot && isInSlot(nextSlot) ? Math.max(0, nowMinutes - toMinutes(target)) : 0
  const activeShift: ShiftKey | null = nextSlot ? (nextSlot.startsWith('morning') ? 'morning' : 'afternoon') : null

  return (
    <Card className={cn('relative gap-0 overflow-hidden p-0', className)}>
      <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-4 text-white sm:p-6">
        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-indigo-100 capitalize">{vnDateLabel(now)}</p>
            {data && (
              <div className="flex flex-wrap gap-1.5">
                <SchedulePill label="Sáng" from={data.schedule.morningStart} to={data.schedule.morningEnd} />
                <SchedulePill label="Chiều" from={data.schedule.afternoonStart} to={data.schedule.afternoonEnd} />
              </div>
            )}
          </div>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {clock.hour}:{clock.minute}
            <span className="text-2xl text-indigo-200">:{clock.second}</span>
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr] bg-muted/50 text-xs text-muted-foreground">
              <span className="px-3 py-2">Ca</span>
              <span className="py-2 text-center">Giờ vào</span>
              <span className="py-2 text-center">Giờ ra</span>
              <span className="py-2 text-center">Đã làm</span>
            </div>
            {(['morning', 'afternoon'] as const).map((key) => {
              const shift = record?.[key]
              return (
                <div
                  key={key}
                  className={cn(
                    'grid grid-cols-[3.5rem_1fr_1fr_1fr] items-center border-t',
                    activeShift === key && 'bg-primary/5',
                  )}
                >
                  <span className="px-3 py-3 text-sm font-medium">{SHIFT_LABEL[key]}</span>
                  <TimeCell value={formatTime(shift?.inAt)} late={shift?.lateMinutes} />
                  <TimeCell value={formatTime(shift?.outAt)} early={shift?.earlyMinutes} />
                  <TimeCell value={formatDuration(liveWorked(shift))} />
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="whitespace-nowrap text-muted-foreground">Trạng thái</span>
            {data && <AttendanceStatus record={record} live hideLate />}
          </div>
          {record && (
            <div className="flex items-center justify-between gap-3">
              <span className="whitespace-nowrap text-muted-foreground">Đi muộn hôm nay</span>
              {record.lateMinutes > 0 ? (
                <span className="text-right font-medium text-amber-600 tabular-nums dark:text-amber-400">
                  {formatDuration(record.lateMinutes)}
                  {record.lateCount > 1 && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      (sáng {formatDuration(record.morning.lateMinutes)}, chiều {formatDuration(record.afternoon.lateMinutes)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Không</span>
              )}
            </div>
          )}
        </div>

        {data && !nextSlot ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            <PartyPopper className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p>
              Bạn đã chấm công đủ 2 ca hôm nay. <span className="text-muted-foreground">Nghỉ ngơi nhé!</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">Chụp ảnh xác nhận</span>
              {nextSlot && target && (
                <span className="text-xs text-muted-foreground">
                  {SLOT_LABEL[nextSlot]} · giờ chuẩn <span className="font-medium text-foreground">{target}</span>
                </span>
              )}
            </div>
            {verdict && <LocationBox verdict={verdict} onRetry={geo.retry} />}
            {faceRequired && !faceApproved && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm">
                <ScanFace className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {face?.profile?.status === 'pending'
                      ? 'Khuôn mặt đang chờ quản lý duyệt'
                      : face?.profile?.status === 'rejected'
                        ? 'Đăng ký khuôn mặt bị từ chối'
                        : 'Chưa đăng ký khuôn mặt'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {face?.profile?.rejectReason ?? 'Vào mục Khuôn mặt để đăng ký trước khi chấm công.'}
                  </p>
                  <Button asChild variant="link" className="h-auto px-0 text-xs">
                    <Link to="/face">Mở mục Khuôn mặt</Link>
                  </Button>
                </div>
              </div>
            )}
            <p className="-mt-1 text-xs text-muted-foreground">
              Mở camera và chụp. Ảnh cần có <b className="font-medium text-foreground">mặt bạn</b> và nền{' '}
              <b className="font-medium text-foreground">văn phòng tầng 5</b>. Ngày giờ lấy từ đồng hồ điện thoại /
              máy tính, phải khớp hệ thống Việt Nam.
            </p>
            <CameraCapture
              photo={photo}
              onChange={(blob) => {
                punch.reset()
                setPhoto(blob)
                if (blob) photoCheck.mutate(blob)
                else photoCheck.reset()
              }}
              disabled={isPending || busy}
            />
            {photo && <PhotoCheckBox check={photoCheck} />}
            {punch.isError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{getApiErrorMessage(punch.error)}</p>
              </div>
            )}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (không bắt buộc), vd: làm việc tại văn phòng"
              maxLength={255}
              disabled={isPending || busy}
            />
            {lateNow > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlarmClock className="size-3.5" />
                Chấm bây giờ sẽ tính đi muộn {formatDuration(lateNow)}
              </p>
            )}
            <Button
              size="lg"
              onClick={submit}
              disabled={
                isPending ||
                busy ||
                !photoOk ||
                !nextSlot ||
                !locationOk ||
                (faceRequired && !faceApproved)
              }
              title={
                faceRequired && !faceApproved
                  ? 'Cần đăng ký khuôn mặt và được duyệt'
                  : !locationOk
                      ? 'Bạn cần ở công ty để chấm công'
                      : photoOk
                        ? undefined
                        : 'Cần ảnh hợp lệ trước khi chấm công'
              }
              className={cn(
                'h-11 w-full text-base shadow-md',
                nextSlot && !isInSlot(nextSlot)
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/25 hover:from-rose-400 hover:to-orange-400'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500',
              )}
            >
              {busy ? <Loader2 className="animate-spin" /> : nextSlot && !isInSlot(nextSlot) ? <LogOut /> : <LogIn />}
              {photoCheck.isPending
                ? 'Đang kiểm tra ảnh…'
                : punch.isPending
                  ? 'Đang chấm công…'
                  : nextSlot
                  ? `Chấm công ${SLOT_LABEL[nextSlot].toLowerCase()}`
                  : 'Chấm công'}
            </Button>
            {(!photoOk || !locationOk || (faceRequired && !faceApproved)) && (
              <p className="text-center text-xs text-muted-foreground">
                {faceRequired && !faceApproved
                  ? 'Cần khuôn mặt đã duyệt mới chấm công được'
                  : !locationOk
                      ? 'Cần ở trong khu vực công ty mới chấm công được'
                      : photoCheck.isError
                        ? 'Ảnh chưa đạt — chụp lại để chấm công'
                        : 'Chụp ảnh hợp lệ xong mới chấm công được'}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

const VERDICT_STYLE: Record<GeoVerdict['tone'], { box: string; icon: typeof MapPin }> = {
  ok: { box: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400', icon: MapPin },
  warn: { box: 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400', icon: LocateFixed },
  bad: { box: 'border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-400', icon: MapPinOff },
  pending: { box: 'bg-muted/40 text-muted-foreground', icon: LocateFixed },
}

function LocationBox({ verdict, onRetry }: { verdict: GeoVerdict; onRetry: () => void }) {
  const { box, icon: Icon } = VERDICT_STYLE[verdict.tone]
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3 text-sm', box)}>
      {verdict.tone === 'pending' ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
      ) : (
        <Icon className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{verdict.title}</p>
        {verdict.detail && <p className="text-xs text-muted-foreground">{verdict.detail}</p>}
      </div>
      {verdict.canRetry && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRetry} aria-label="Định vị lại">
          <RotateCw />
        </Button>
      )}
    </div>
  )
}

function PhotoCheckBox({ check }: { check: ReturnType<typeof usePhotoCheck> }) {
  if (check.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Đang kiểm tra ngày giờ máy tính, khuôn mặt và nền văn phòng…
      </div>
    )
  }
  if (check.isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
        <ShieldX className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Ảnh chưa đủ điều kiện chấm công</p>
          <p className="text-xs">{getApiErrorMessage(check.error)}</p>
        </div>
      </div>
    )
  }
  if (check.isSuccess) {
    const { screenTime, screenDate, faceScore, sceneScore } = check.data
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Ảnh hợp lệ</p>
          <p className="text-xs text-muted-foreground">
            Giờ máy {screenTime ?? '—'} · ngày {screenDate ?? '—'} khớp hệ thống
            {faceScore != null && ` · khuôn mặt khớp đã đăng ký (${Math.round(faceScore * 100)}%)`}
            {sceneScore != null && ` · nền văn phòng tầng 5 (${Math.round(sceneScore * 100)}%)`}
          </p>
        </div>
      </div>
    )
  }
  return null
}

function SchedulePill({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-white/20 backdrop-blur">
      <Clock3 className="size-3.5" />
      {label} {from}–{to}
    </div>
  )
}

function TimeCell({ value, late, early }: { value: string; late?: number | null; early?: number | null }) {
  return (
    <div className="px-1 py-2.5 text-center">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      {(late ?? 0) > 0 && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Muộn {formatDuration(late)}</p>
      )}
      {(early ?? 0) > 0 && (
        <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Sớm {formatDuration(early)}</p>
      )}
    </div>
  )
}
