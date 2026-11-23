import { ArrowLeft, ArrowRight, Check, Loader2, ScanFace, ShieldAlert, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { attachCameraStream } from '@/lib/camera'
import { captureJpeg, openUserCamera } from './capture-frame'
import { STEP_LABEL, type LivenessStep } from './face.types'
import { useScanFrame, useScanStatus, useStartScan, type ScanFrameResult } from './use-face'

const TICK_GAP_MS = 50
const SAVE_POLL_MS = 350
const TRANSIENT = new Set([0, 502, 503, 504])
/** Camera vừa mở thường tối (AE chưa ổn) — đợi rồi mới lấy ảnh nhìn thẳng. */
const CAMERA_WARMUP_MS = 1100

export function FaceScan({
  kind,
  idleLabel,
  onDone,
}: {
  kind: 'enroll' | 'liveness'
  idleLabel: string
  onDone: (result: ScanFrameResult) => void
}) {
  const start = useStartScan()
  const frame = useScanFrame()
  const status = useScanStatus()
  const reconnectsRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const busyRef = useRef(false)
  const liveRef = useRef(false)
  const sessionRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const [live, setLive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [steps, setSteps] = useState<LivenessStep[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [hint, setHint] = useState('Đưa mặt vào khung hình')
  const [poseOk, setPoseOk] = useState(false)
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = () => {
    liveRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
    busyRef.current = false
    savingRef.current = false
  }

  useEffect(() => () => stop(), [])

  useEffect(() => {
    const video = videoRef.current
    if (!live || !sessionId || !video || !streamRef.current) return
    let cancelled = false
    const loop = async () => {
      await attachCameraStream(video, streamRef.current!)
      setHint('Đang chỉnh sáng camera…')
      await new Promise((r) => window.setTimeout(r, CAMERA_WARMUP_MS))
      while (!cancelled && liveRef.current && sessionRef.current) {
        await tick()
        if (cancelled || !liveRef.current) break
        await new Promise((r) => window.setTimeout(r, savingRef.current ? SAVE_POLL_MS : TICK_GAP_MS))
      }
    }
    void loop()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, sessionId])

  const tick = async () => {
    const video = videoRef.current
    const sid = sessionRef.current
    if (!video || !sid || busyRef.current) return
    if (!savingRef.current && !video.videoWidth) return
    busyRef.current = true
    try {
      const result = savingRef.current
        ? await status.mutateAsync(sid)
        : await frame.mutateAsync({ sessionId: sid, frame: await captureJpeg(video) })
      reconnectsRef.current = 0
      setHint(result.hint)
      setStepIndex(result.stepIndex)
      setPoseOk(!!result.poseOk)
      setHoldSeconds(result.holdSeconds ?? null)
      setSaving(!!result.saving)
      savingRef.current = !!result.saving
      if (result.done) {
        stop()
        sessionRef.current = null
        setSessionId(null)
        onDone(result)
      }
    } catch (err) {
      const code = (err as { response?: { status?: number } })?.response?.status ?? 0
      const transient = TRANSIENT.has(code) || !(err as { response?: unknown })?.response
      if (transient && reconnectsRef.current < 12) {
        reconnectsRef.current += 1
        setHint('Đang kết nối lại máy chủ…')
      } else {
        setError(getApiErrorMessage(err))
        stop()
        sessionRef.current = null
        setSessionId(null)
      }
    } finally {
      busyRef.current = false
    }
  }

  const begin = async () => {
    setError(null)
    try {
      // iPhone: getUserMedia phải chạy trong cùng lần chạm, trước await mạng.
      const stream = await openUserCamera()
      streamRef.current = stream
      const session = await start.mutateAsync(kind)
      sessionRef.current = session.sessionId
      liveRef.current = true
      savingRef.current = false
      reconnectsRef.current = 0
      setSessionId(session.sessionId)
      setSteps(session.steps)
      setStepIndex(session.stepIndex)
      setHint(session.hint)
      setPoseOk(false)
      setHoldSeconds(null)
      setSaving(false)
      setLive(true)
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setError(getApiErrorMessage(err))
    }
  }

  const step = steps[stepIndex] ?? 'center'
  const blocked = /không khớp|quá nhỏ|gần camera/i.test(hint)

  return (
    <div className="space-y-3">
      {live ? (
        <div className="mx-auto w-full max-w-sm min-w-0 space-y-3 max-md:fixed max-md:inset-0 max-md:z-50 max-md:flex max-md:max-w-none max-md:flex-col max-md:overflow-y-auto max-md:bg-black max-md:p-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="relative h-[min(70dvh,32rem)] w-full overflow-hidden rounded-3xl border bg-black max-md:min-h-0 max-md:flex-1 sm:h-auto sm:aspect-[3/4]">
            <video ref={videoRef} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" />
            <OvalGuide step={step} poseOk={poseOk} blocked={blocked} saving={saving} holdSeconds={holdSeconds} />
            <p className="absolute inset-x-0 bottom-3 line-clamp-2 px-10 text-center text-sm font-semibold text-white drop-shadow">
              {hint}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-2 right-2 h-11 min-w-11 px-3 text-white hover:bg-white/15 hover:text-white"
              onClick={stop}
            >
              Huỷ
            </Button>
          </div>
          <div className="shrink-0 max-md:rounded-xl max-md:bg-white/95 max-md:p-2">
            <StepRail steps={steps} current={stepIndex} poseOk={poseOk} saving={saving} holding={holdSeconds != null} />
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={begin} disabled={start.isPending}>
          {start.isPending ? <Loader2 className="animate-spin" /> : <ScanFace />}
          {idleLabel}
        </Button>
      )}
      {error && (
        <p className={cn('flex items-start gap-1.5 text-xs text-destructive')}>
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function OvalGuide({
  step,
  poseOk,
  blocked,
  saving,
  holdSeconds,
}: {
  step: LivenessStep
  poseOk: boolean
  blocked: boolean
  saving: boolean
  holdSeconds: number | null
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-square h-[70%] max-h-[16rem] w-auto">
        <div className="absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        <div
          className={cn(
            'absolute inset-0 rounded-full border-[3px]',
            blocked ? 'border-rose-400' : poseOk || saving ? 'border-emerald-400' : 'border-white/90',
          )}
        />
        {holdSeconds != null && !saving && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-6xl font-semibold tabular-nums drop-shadow">{holdSeconds}</span>
          </div>
        )}
        {saving && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <Check className="size-10 drop-shadow" />
            <span className="text-sm font-semibold drop-shadow">Đã nhận</span>
          </div>
        )}
        {step !== 'center' && !saving && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-white',
              step === 'left' ? 'left-2 animate-pulse' : 'right-2 animate-pulse',
            )}
          >
            {step === 'left' ? <ArrowLeft className="size-8 drop-shadow" /> : <ArrowRight className="size-8 drop-shadow" />}
          </div>
        )}
      </div>
    </div>
  )
}

function StepRail({
  steps,
  current,
  poseOk,
  saving,
  holding,
}: {
  steps: LivenessStep[]
  current: number
  poseOk: boolean
  saving: boolean
  holding: boolean
}) {
  return (
    <ol className={cn('grid gap-2', steps.length === 1 ? 'grid-cols-1' : 'grid-cols-3')}>
      {steps.map((s, i) => {
        const done = i < current || (saving && i <= current)
        const active = i === current && !done
        const Icon = s === 'left' ? ArrowLeft : s === 'right' ? ArrowRight : UserRound
        return (
          <li
            key={`${s}-${i}`}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center text-[11px] leading-tight sm:px-2',
              done && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              active && poseOk && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              active && !poseOk && 'border-primary/40 bg-primary/5 text-foreground',
              !done && !active && 'text-muted-foreground',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-background shadow-sm">
              {done || (active && poseOk && !holding) ? (
                <Check className="size-4 text-emerald-600" />
              ) : active ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            {STEP_LABEL[s].replace(' của bạn', '').replace(' vào camera', '')}
          </li>
        )
      })}
    </ol>
  )
}
