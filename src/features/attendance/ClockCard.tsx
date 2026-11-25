import { AlarmClock, CircleAlert, Loader2, LocateFixed, LogIn, LogOut, MapPin, MapPinOff, PartyPopper, RotateCw, ScanFace, ShieldCheck, ShieldX, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/use-auth'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDuration, formatTime, formatWorkDate } from '@/lib/format'
import { isManagerRole } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import {
  SHIFT_LABEL,
  SLOT_LABEL,
  type AttendanceSlot,
  type AttendanceToday,
  type ShiftKey,
  type ShiftRecord,
  type WorkSchedule,
} from './attendance.types'
import { AttendanceStatus } from './AttendanceStatus'
import { CameraCapture } from './CameraCapture'
import { useAttendanceToday, usePhotoCheck, usePunch, useRegisterOfficeWifi, useUnregisterOfficeWifi } from './use-attendance'
import { geoVerdict, useGeolocation, type GeoVerdict } from './use-geolocation'

const VN_TZ = 'Asia/Ho_Chi_Minh'

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
  if (slot === 'overtime_in' || slot === 'overtime_out') return null
  return {
    morning_in: schedule.morningStart,
    morning_out: schedule.morningEnd,
    afternoon_in: schedule.afternoonStart,
    afternoon_out: schedule.afternoonEnd,
  }[slot]
}

const isInSlot = (slot: AttendanceSlot) => slot.endsWith('_in')

export function ClockCard({ className }: { className?: string }) {
  const { data: me } = useMe()
  const { data, isPending } = useAttendanceToday()
  const now = useSystemNow(data?.serverTime, 15_000)
  const punch = usePunch()
  const photoCheck = usePhotoCheck()
  const registerWifi = useRegisterOfficeWifi()
  const unregisterWifi = useUnregisterOfficeWifi()
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [registerFloor, setRegisterFloor] = useState<'4' | '5' | '6'>('5')
  const [mode, setMode] = useState<'shift' | 'overtime'>('shift')
  const [openCheck, setOpenCheck] = useState<'gps' | 'wifi' | null>(null)

  const record = data?.record ?? null
  const nextSlot = data?.nextSlot ?? null
  const canManageWifi = isManagerRole(me?.role)
  const busy = punch.isPending || photoCheck.isPending || registerWifi.isPending || unregisterWifi.isPending
  const photoOk = !!photo && photoCheck.isSuccess
  const fence = data?.geofence ?? null
  const geo = useGeolocation(!!fence && (mode === 'overtime' || !!nextSlot || canManageWifi))
  const verdict = fence ? geoVerdict(fence, geo.state) : null
  const locationOk = !verdict || verdict.allowed
  const wifi = data?.officeWifi
  const assignedFloor = wifi?.assignedFloor ?? me?.officeFloor ?? null
  const wifiOk = !wifi?.required || !!wifi.floorMatch
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

  const overtime = record?.overtime ?? null
  const overtimeSlot: AttendanceSlot | null = !overtime?.inAt ? 'overtime_in' : !overtime.outAt ? 'overtime_out' : null
  const punchSlot = mode === 'overtime' ? overtimeSlot : nextSlot
  const overtimeShift: ShiftRecord | undefined = overtime
    ? { inAt: overtime.inAt, outAt: overtime.outAt, lateMinutes: null, earlyMinutes: null, workedMinutes: overtime.workedMinutes }
    : undefined

  const submit = () => {
    if (!photo || !photoOk || !punchSlot || !locationOk || !wifiOk || (faceRequired && !faceApproved)) return
    punch.mutate(
      {
        slot: punchSlot,
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

  const target = data && mode === 'shift' && nextSlot ? slotTime(data.schedule, nextSlot) : null
  const lateNow = target && nextSlot && isInSlot(nextSlot) ? Math.max(0, nowMinutes - toMinutes(target)) : 0
  const activeShift: ShiftKey | null = mode === 'shift' && nextSlot ? (nextSlot.startsWith('morning') ? 'morning' : 'afternoon') : null
  const finished = mode === 'overtime' ? !overtimeSlot : !nextSlot
  const blocked = isPending || busy || !photoOk || !punchSlot || !locationOk || !wifiOk || (faceRequired && !faceApproved)

  return (
    <Card className={cn('relative w-full min-w-0 gap-0 p-0', className)}>
      <div className="flex min-w-0 flex-col gap-3 p-3 md:gap-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full bg-muted p-1">
            <ModeButton active={mode === 'shift'} onClick={() => setMode('shift')}>
              Ca làm
            </ModeButton>
            <ModeButton active={mode === 'overtime'} onClick={() => setMode('overtime')}>
              Tăng ca
            </ModeButton>
          </div>
          <div className="flex items-center gap-2">
            {verdict && (
              <CheckIconButton
                label="Vị trí"
                open={openCheck === 'gps'}
                tone={verdict.tone}
                icon={verdict.tone === 'ok' ? MapPin : verdict.tone === 'bad' ? MapPinOff : LocateFixed}
                onClick={() => setOpenCheck(openCheck === 'gps' ? null : 'gps')}
              />
            )}
            {(wifi?.required || canManageWifi) && (
              <CheckIconButton
                label="Wi-Fi"
                open={openCheck === 'wifi'}
                tone={wifi?.required ? (wifiOk ? 'ok' : 'bad') : 'warn'}
                icon={wifi?.required && wifiOk ? Wifi : WifiOff}
                onClick={() => setOpenCheck(openCheck === 'wifi' ? null : 'wifi')}
              />
            )}
          </div>
        </div>
        {openCheck === 'gps' && verdict && <LocationBox verdict={verdict} onRetry={geo.retry} />}
        {openCheck === 'wifi' && (wifi?.required || canManageWifi) && (
          <WifiPanel
            wifi={wifi}
            wifiOk={wifiOk}
            assignedFloor={assignedFloor}
            canManageWifi={canManageWifi}
            registerFloor={registerFloor}
            setRegisterFloor={setRegisterFloor}
            busy={busy}
            locationOk={locationOk}
            onRegister={() =>
              registerWifi.mutate({
                location: geo.state.status === 'ok' ? geo.state.reading : undefined,
                floor: Number(registerFloor) as 4 | 5 | 6,
              })
            }
            onUnregister={() => unregisterWifi.mutate()}
            registerPending={registerWifi.isPending}
          />
        )}

        <div className="order-3">
        {mode === 'overtime' ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <OvertimeFact label="Ngày làm" value={data ? formatWorkDate(data.date) : '—'} />
            <OvertimeFact label="Check in" value={formatTime(overtime?.inAt)} />
            <OvertimeFact label="Check out" value={formatTime(overtime?.outAt)} />
            <OvertimeFact label="Tổng giờ" value={formatDuration(liveWorked(overtimeShift))} />
          </div>
        ) : isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <div className="grid min-w-[17rem] grid-cols-[2.75rem_1fr_1fr_1fr] bg-muted text-xs text-muted-foreground">
              <span className="px-2 py-2 sm:px-3">Ca</span>
              <span className="py-2 text-center">Giờ vào</span>
              <span className="py-2 text-center">Giờ ra</span>
              <span className="py-2 text-center">Đã làm</span>
            </div>
            {(
              (['morning', 'afternoon'] as const).map((key) => {
                const shift = record?.[key]
                return (
                  <div
                    key={key}
                    className={cn(
                      'grid min-w-[17rem] grid-cols-[2.75rem_1fr_1fr_1fr] items-center border-t text-foreground',
                      activeShift === key && 'bg-accent',
                    )}
                  >
                    <span className="px-3 py-3 text-sm font-medium">{SHIFT_LABEL[key]}</span>
                    <TimeCell value={formatTime(shift?.inAt)} late={shift?.lateMinutes} />
                    <TimeCell value={formatTime(shift?.outAt)} early={shift?.earlyMinutes} />
                    <TimeCell value={formatDuration(liveWorked(shift))} />
                  </div>
                )
              })
            )}
          </div>
        )}
        </div>

        {mode === 'shift' && (
        <div className="order-4 space-y-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="whitespace-nowrap text-muted-foreground">Trạng thái</span>
            {data && <AttendanceStatus record={record} live hideLate />}
          </div>
          {record && (
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Đi muộn hôm nay</span>
              {record.lateMinutes > 0 ? (
                <span className="min-w-0 text-right font-medium text-amber-600 tabular-nums dark:text-amber-400">
                  {formatDuration(record.lateMinutes)}
                  {record.lateCount > 1 && (
                    <span className="block font-normal text-muted-foreground">
                      sáng {formatDuration(record.morning.lateMinutes)}, chiều {formatDuration(record.afternoon.lateMinutes)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Không</span>
              )}
            </div>
          )}
        </div>
        )}

        <div className="order-2">
        {data && finished ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            <PartyPopper className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p>
              {mode === 'overtime' ? (
                <>Đã check in và check out tăng ca hôm nay.</>
              ) : (
                <>
                  Bạn đã chấm công đủ 2 ca hôm nay. <span className="text-muted-foreground">Còn tăng ca thì chuyển sang mục Tăng ca.</span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">Chụp ảnh xác nhận</span>
              {punchSlot && (
                <span className="text-xs text-muted-foreground">
                  {mode === 'overtime' ? (punchSlot === 'overtime_out' ? 'Check out' : 'Check in') : SLOT_LABEL[punchSlot]}
                  {target && (
                    <>
                      {' '}
                      · giờ chuẩn <span className="font-medium text-foreground">{target}</span>
                    </>
                  )}
                </span>
              )}
            </div>
            {faceRequired && !faceApproved && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 text-sm">
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
                    {face?.profile?.rejectReason ?? 'Hãy đăng ký khuôn mặt trước khi chấm công.'}
                  </p>
                  <Button asChild variant="link" className="h-auto px-0 text-xs">
                    <Link to="/face">Mở đăng ký khuôn mặt</Link>
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] md:grid-rows-[minmax(11rem,auto)_auto] md:items-stretch md:gap-x-6 md:gap-y-2">
            <CameraCapture
              className="md:col-start-1 md:row-span-2 md:grid md:h-auto md:grid-rows-subgrid md:gap-y-2"
              photo={photo}
              onChange={(blob) => {
                punch.reset()
                setPhoto(blob)
                if (blob) photoCheck.mutate(blob)
                else photoCheck.reset()
              }}
              disabled={isPending || busy}
            />
            <div className="flex flex-col gap-3 md:col-start-2 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-y-2">
            <div className="flex flex-col gap-3">
            <p className="text-xs leading-5 text-muted-foreground">
              Chụp trực tiếp từ camera: <b className="font-medium text-foreground">mặt nhìn thẳng</b>, nền{' '}
              <b className="font-medium text-foreground">
                {assignedFloor ? `văn phòng tầng ${assignedFloor}` : 'văn phòng tầng 5 hoặc 6'}
              </b>
              . Không dùng ảnh có sẵn.
            </p>
            {photo && <PhotoCheckBox check={photoCheck} />}
            {punch.isError && (
              <div
                className="flex items-start gap-2 rounded-xl border p-3 text-sm"
                style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' }}
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <p className="min-w-0 break-words">{getApiErrorMessage(punch.error)}</p>
              </div>
            )}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (không bắt buộc)"
              maxLength={255}
              disabled={isPending || busy}
              className="h-11 text-base md:h-9 md:text-sm"
            />
            {lateNow > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlarmClock className="size-3.5" />
                Chấm bây giờ sẽ tính đi muộn {formatDuration(lateNow)}
              </p>
            )}
            </div>
            <Button
              size="lg"
              onClick={submit}
              disabled={blocked}
              title={
                faceRequired && !faceApproved
                  ? 'Cần đăng ký khuôn mặt và được duyệt'
                  : !wifiOk
                    ? 'Cần Wi‑Fi đúng tầng để chấm công'
                    : !locationOk
                      ? 'Bạn cần ở công ty để chấm công'
                      : photoOk
                        ? undefined
                        : 'Cần ảnh hợp lệ trước khi chấm công'
              }
              className="h-12 min-h-11 w-full bg-clip-border text-base text-white disabled:opacity-100"
              style={{
                backgroundColor: blocked ? '#c7d2fe' : mode === 'overtime' ? '#6d28d9' : punchSlot && !isInSlot(punchSlot) ? '#e11d48' : '#4f46e5',
                color: '#fff',
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : punchSlot && !isInSlot(punchSlot) ? <LogOut /> : <LogIn />}
              {photoCheck.isPending
                ? 'Đang kiểm tra ảnh…'
                : punch.isPending
                  ? 'Đang chấm công…'
                  : mode === 'overtime'
                    ? punchSlot === 'overtime_out'
                      ? 'Check out'
                      : 'Check in'
                    : punchSlot
                      ? `Chấm công ${SLOT_LABEL[punchSlot].toLowerCase()}`
                      : 'Chấm công'}
            </Button>
            </div>
            </div>
            {(!photoOk || !locationOk || !wifiOk || (faceRequired && !faceApproved)) && (
              <p className="text-center text-xs text-zinc-500">
                {faceRequired && !faceApproved
                  ? 'Cần khuôn mặt đã duyệt mới chấm công được'
                  : !wifiOk
                    ? 'Cần Wi‑Fi đúng tầng mới chấm công được'
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
      </div>
    </Card>
  )
}

const VERDICT_STYLE: Record<GeoVerdict['tone'], { box: string; icon: typeof MapPin }> = {
  ok: { box: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]', icon: MapPin },
  warn: { box: 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]', icon: LocateFixed },
  bad: { box: 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]', icon: MapPinOff },
  pending: { box: 'border-zinc-200 bg-zinc-50 text-zinc-500', icon: LocateFixed },
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
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" onClick={onRetry} aria-label="Định vị lại">
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
        Đang kiểm tra ngày giờ, khuôn mặt, nền văn phòng và ảnh thật…
      </div>
    )
  }
  if (check.isError) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border p-3 text-sm"
        style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#9f1239' }}
      >
        <ShieldX className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">Ảnh chưa đủ điều kiện chấm công</p>
          <p className="mt-1 text-xs leading-5 break-words" style={{ color: '#881337' }}>
            {getApiErrorMessage(check.error) || 'Không kiểm tra được ảnh. Hãy chụp lại.'}
          </p>
        </div>
      </div>
    )
  }
  if (check.isSuccess) {
    const { screenTime, screenDate, faceScore, sceneScore, floorNote, replayScore } = check.data
    return (
      <div
        className="flex items-start gap-2 rounded-xl border p-3 text-sm"
        style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">Ảnh hợp lệ</p>
          <p className="mt-1 text-xs leading-5 break-words" style={{ color: '#3f3f46' }}>
            Giờ {screenTime ?? '—'} · ngày {screenDate ?? '—'} khớp hệ thống
            {faceScore != null && ` · khuôn mặt khớp đã đăng ký (${Math.round(faceScore * 100)}%)`}
            {sceneScore != null &&
              ` · nền văn phòng ${floorNote ?? 'tầng 5–6'} (${Math.round(sceneScore * 100)}%)`}
            {replayScore != null && ` · không phải giơ màn hình (điểm ${Math.round(replayScore * 100)}%)`}
          </p>
        </div>
      </div>
    )
  }
  return null
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-full px-3 py-1.5 text-sm font-medium', active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
    >
      {children}
    </button>
  )
}

function CheckIconButton({
  label,
  open,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string
  open: boolean
  tone: GeoVerdict['tone']
  icon: typeof MapPin
  onClick: () => void
}) {
  const toneClass = {
    ok: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]',
    warn: 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]',
    bad: 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]',
    pending: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  }[tone]
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      title={label}
      onClick={onClick}
      className={cn('flex size-10 items-center justify-center rounded-full border', toneClass)}
    >
      {tone === 'pending' ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
    </button>
  )
}

function WifiPanel({
  wifi,
  wifiOk,
  assignedFloor,
  canManageWifi,
  registerFloor,
  setRegisterFloor,
  busy,
  locationOk,
  onRegister,
  onUnregister,
  registerPending,
}: {
  wifi: AttendanceToday['officeWifi']
  wifiOk: boolean
  assignedFloor: 4 | 5 | 6 | null
  canManageWifi: boolean
  registerFloor: '4' | '5' | '6'
  setRegisterFloor: (floor: '4' | '5' | '6') => void
  busy: boolean
  locationOk: boolean
  onRegister: () => void
  onUnregister: () => void
  registerPending: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 text-sm',
        wifi?.required
          ? wifiOk
            ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]'
            : 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'
          : 'border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100',
      )}
    >
      {wifi?.required && wifiOk ? <Wifi className="mt-0.5 size-4 shrink-0" /> : <WifiOff className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">
          {!wifi?.required
            ? 'Chưa bật lọc Wi‑Fi công ty'
            : wifiOk
              ? `Đang dùng Wi‑Fi ${wifi.wifiFloor ? `tầng ${wifi.wifiFloor}` : 'công ty'}`
              : !assignedFloor && !canManageWifi
                ? 'Chưa được gán tầng chấm công'
                : wifi?.connected && wifi.wifiFloor && assignedFloor && wifi.wifiFloor !== assignedFloor
                  ? `Sai tầng: đang ở tầng ${wifi.wifiFloor}`
                  : 'Chưa kết nối Wi‑Fi đúng tầng'}
        </p>
        <p className="text-xs text-muted-foreground">
          {!wifi?.required
            ? 'Gán tầng cho nhân sự, rồi ghi nhận Wi‑Fi từng tầng.'
            : wifiOk
              ? canManageWifi
                ? 'Quản lý được chấm ở tầng 4, 5 hoặc 6.'
                : `Bạn chấm công tầng ${assignedFloor}.`
              : !assignedFloor && !canManageWifi
                ? 'Liên hệ quản lý gán tầng 4, 5 hoặc 6.'
                : `Nối Wi‑Fi ${assignedFloor ? `tầng ${assignedFloor}` : 'đúng tầng'} rồi tải lại trang.`}
          {wifi?.clientIp ? ` IP: ${wifi.clientIp}.` : ''}
        </p>
        {canManageWifi && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={registerFloor} onValueChange={(v) => setRegisterFloor(v as '4' | '5' | '6')}>
              <SelectTrigger aria-label="Tầng của Wi‑Fi này" className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Tầng 4</SelectItem>
                <SelectItem value="5">Tầng 5</SelectItem>
                <SelectItem value="6">Tầng 6</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="secondary" className="h-9" disabled={busy || !locationOk} onClick={onRegister}>
              {registerPending ? <Loader2 className="animate-spin" /> : <Wifi />}
              Ghi nhận Wi‑Fi này
            </Button>
            {wifi?.required && wifi.connected && (
              <Button type="button" size="sm" variant="ghost" className="h-9" disabled={busy} onClick={onUnregister}>
                Gỡ IP này
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OvertimeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function TimeCell({ value, late, early }: { value: string; late?: number | null; early?: number | null }) {
  return (
    <div className="px-1 py-2.5 text-center">
      <p className="text-sm font-semibold text-foreground sm:text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {(late ?? 0) > 0 && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Muộn {formatDuration(late)}</p>
      )}
      {(early ?? 0) > 0 && (
        <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Sớm {formatDuration(early)}</p>
      )}
    </div>
  )
}
