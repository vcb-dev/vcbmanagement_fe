import { ArrowLeft, ArrowRight, Check, Loader2, ScanFace, ShieldAlert, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { prepareVideoEl } from '@/lib/camera'
import { captureJpeg, openUserCamera } from './capture-frame'
import { STEP_LABEL, type LivenessStep } from './face.types'
import { useScanFrame, useStartScan, type ScanFrameResult } from './use-face'

const TICK_MS = 480

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const busyRef = useRef(false)
  const [live, setLive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [steps, setSteps] = useState<LivenessStep[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [hint, setHint] = useState('Đưa mặt vào khung hình')
  const [poseOk, setPoseOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
    busyRef.current = false
  }

  useEffect(() => () => stop(), [])

  useEffect(() => {
    const video = videoRef.current
    if (!live || !video || !streamRef.current) return
    prepareVideoEl(video)
    video.srcObject = streamRef.current
    void video.play().catch(() => undefined)
  }, [live])

  useEffect(() => {
    if (!live || !sessionId) return
    const id = window.setInterval(() => {
      void tick()
    }, TICK_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, sessionId])

  const tick = async () => {
    const video = videoRef.current
    if (!video || !sessionId || busyRef.current || !video.videoWidth) return
    busyRef.current = true
    try {
      const blob = await captureJpeg(video)
      const result = await frame.mutateAsync({ sessionId, frame: blob })
      setHint(result.hint)
      setStepIndex(result.stepIndex)
      setPoseOk(!!result.poseOk)
      if (result.done) {
        stop()
        setSessionId(null)
        onDone(result)
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // 502/503 khi BE hoặc AI đang khởi động lại — giữ camera, gửi khung hình tiếp.
      if (status === 502 || status === 503 || status === 0) {
        setHint('Đang kết nối lại máy chủ…')
      } else {
        setError(getApiErrorMessage(err))
        stop()
        setSessionId(null)
      }
    } finally {
      busyRef.current = false
    }
  }

  const begin = async () => {
    setError(null)
    try {
      const session = await start.mutateAsync(kind)
      const stream = await openUserCamera()
      streamRef.current = stream
      setSessionId(session.sessionId)
      setSteps(session.steps)
      setStepIndex(session.stepIndex)
      setHint(session.hint)
      setPoseOk(false)
      setLive(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const step = steps[stepIndex] ?? 'center'
  const blocked = /không khớp|nhiều hơn 1|Chỉ được có một|quá nhỏ|gần camera/i.test(hint)

  return (
    <div className="space-y-3">
      {live ? (
        <div className="mx-auto w-full max-w-sm space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" />
            <OvalGuide step={step} poseOk={poseOk} blocked={blocked} />
            <p className="absolute inset-x-0 bottom-4 px-4 text-center text-sm font-semibold text-white drop-shadow">
              {hint}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-white hover:bg-white/15 hover:text-white"
              onClick={stop}
            >
              Huỷ
            </Button>
          </div>
          <StepRail steps={steps} current={stepIndex} poseOk={poseOk} />
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

function OvalGuide({ step, poseOk, blocked }: { step: LivenessStep; poseOk: boolean; blocked: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-square w-[78%] max-w-[20rem]">
        <div className="absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        <div
          className={cn(
            'absolute inset-0 rounded-full border-[3px]',
            blocked ? 'border-rose-400' : poseOk ? 'border-emerald-400' : 'border-white/90',
          )}
        />
        {step !== 'center' && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-white',
              step === 'left' ? '-left-10 animate-pulse' : '-right-10 animate-pulse',
            )}
          >
            {step === 'left' ? <ArrowLeft className="size-8 drop-shadow" /> : <ArrowRight className="size-8 drop-shadow" />}
          </div>
        )}
      </div>
    </div>
  )
}

function StepRail({ steps, current, poseOk }: { steps: LivenessStep[]; current: number; poseOk: boolean }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const Icon = s === 'left' ? ArrowLeft : s === 'right' ? ArrowRight : UserRound
        return (
          <li
            key={`${s}-${i}`}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center text-[11px] leading-tight',
              done && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              active && poseOk && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              active && !poseOk && 'border-primary/40 bg-primary/5 text-foreground',
              !done && !active && 'text-muted-foreground',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-background shadow-sm">
              {done ? (
                <Check className="size-4 text-emerald-600" />
              ) : active && !poseOk ? (
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
