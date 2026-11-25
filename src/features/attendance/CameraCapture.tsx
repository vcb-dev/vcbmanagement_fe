import { Camera, CameraOff, Loader2, RotateCcw, ScanFace, SwitchCamera, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { attachCameraStream, getCameraStream, videoToJpeg } from '@/lib/camera'
import { cn } from '@/lib/utils'

/** Đủ nét để nhận mặt và nền văn phòng; ~300–600KB, dưới giới hạn 2MB của server. */
const MAX_WIDTH = 1280
const JPEG_QUALITY = 0.85

type CameraState = 'idle' | 'starting' | 'live' | 'error'
type Facing = 'user' | 'environment'

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') return 'Bạn đã chặn quyền camera. Hãy cho phép camera trên trình duyệt rồi thử lại.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy camera trên thiết bị này.'
  if (name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng.'
  if (!navigator.mediaDevices?.getUserMedia) return 'Trình duyệt không hỗ trợ camera (cần HTTPS hoặc localhost).'
  return 'Không mở được camera.'
}

export function CameraCapture({
  photo,
  onChange,
  disabled,
  className,
}: {
  photo: Blob | null
  onChange: (photo: Blob | null) => void
  disabled?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<Facing>('user')
  const facingRef = useRef<Facing>('user')
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  const mirrored = facing === 'user'

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }

  useEffect(() => stop, [])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const attachAndPlay = async (stream: MediaStream) => {
    const video = videoRef.current
    if (!video) throw new Error('Không tìm thấy khung camera')
    await attachCameraStream(video, stream)
  }

  const start = async (nextFacing = facingRef.current) => {
    if (disabled) return
    setError(null)
    setState('starting')
    stop()
    facingRef.current = nextFacing
    setFacing(nextFacing)
    try {
      const stream = await getCameraStream(nextFacing)
      streamRef.current = stream
      await attachAndPlay(stream)
      setState('live')
    } catch (err) {
      stop()
      setError(cameraErrorMessage(err))
      setState('error')
    }
  }

  const flipCamera = () => {
    void start(facingRef.current === 'user' ? 'environment' : 'user')
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      const blob = await videoToJpeg(video, MAX_WIDTH, JPEG_QUALITY)
      if (!blob) {
        setError('Không lấy được ảnh. Hãy chụp lại.')
        return
      }
      stop()
      setState('idle')
      onChange(blob)
    } catch {
      setError('Không lấy được ảnh. Hãy chụp lại.')
    }
  }

  const clearPhoto = (e?: MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onChange(null)
    setError(null)
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col gap-2',
        className,
        state === 'live' &&
          'max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-black max-md:p-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]',
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border bg-zinc-100',
          state === 'live'
            ? 'min-h-52 flex-1 max-md:min-h-0'
            : previewUrl
              ? 'max-md:h-auto md:aspect-[4/3] md:min-h-52 md:flex-1'
              : 'min-h-52 flex-1 md:aspect-[4/3]',
        )}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            'absolute inset-0 size-full object-contain',
            mirrored && '-scale-x-100',
            !previewUrl && state === 'live' ? 'opacity-100' : 'opacity-0',
          )}
        />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Ảnh chấm công"
            className={cn(
              'relative mx-auto block h-auto max-h-[min(70dvh,36rem)] w-full object-contain md:absolute md:inset-0 md:size-full md:max-h-none',
              mirrored && '-scale-x-100',
            )}
          />
        ) : (
          <>
            {state === 'live' && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="aspect-square h-[72%] max-h-[14rem] w-auto rounded-full border-[3px] border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 size-11 rounded-full bg-black/55 text-white hover:bg-black/70"
                  onClick={flipCamera}
                  aria-label="Đổi camera trước / sau"
                >
                  <SwitchCamera />
                </Button>
              </>
            )}
            {state !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                {state === 'starting' ? (
                  <Loader2 className="size-7 animate-spin text-zinc-500" />
                ) : state === 'error' ? (
                  <CameraOff className="size-7" style={{ color: '#e11d48' }} />
                ) : (
                  <ScanFace className="size-8 text-zinc-500" />
                )}
                {state !== 'starting' && (
                  <span className="text-sm font-medium text-zinc-800">Mở camera để chụp ảnh chấm công</span>
                )}
                <span
                  className="max-w-full text-xs break-words"
                  style={{ color: error || state === 'error' ? '#be123c' : '#71717a' }}
                >
                  {state === 'starting' ? 'Đang mở camera…' : (error ?? 'Chỉ chụp trực tiếp từ camera')}
                </span>
              </div>
            )}
          </>
        )}
        {previewUrl && (
          <>
            <span className="absolute top-2 left-2 rounded-full px-2 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: '#10b981' }}>
              Đã chụp
            </span>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 size-11 rounded-full bg-black/55 text-white shadow hover:bg-black/70"
              onClick={clearPhoto}
              disabled={disabled}
              aria-label="Xoá ảnh"
            >
              <X />
            </Button>
          </>
        )}
      </div>

      {previewUrl ? (
        <div className="mt-auto grid shrink-0 grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-12 min-h-11" onClick={clearPhoto} disabled={disabled}>
            <Trash2 />
            Xoá ảnh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 min-h-11"
            onClick={() => {
              onChange(null)
              void start()
            }}
            disabled={disabled}
          >
            <RotateCcw />
            Chụp lại
          </Button>
        </div>
      ) : state === 'live' ? (
        <div className="mt-auto grid shrink-0 grid-cols-[1fr_auto] gap-2">
          <Button
            type="button"
            className="h-12 min-h-11 text-base max-md:bg-white max-md:text-zinc-900 max-md:hover:bg-zinc-100"
            onClick={() => void capture()}
            disabled={disabled}
          >
            <Camera />
            Chụp ảnh
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 min-h-11 min-w-[4.5rem] max-md:text-white max-md:hover:bg-white/15 max-md:hover:text-white"
            onClick={() => {
              stop()
              setState('idle')
            }}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="mt-auto h-12 min-h-11 w-full shrink-0 text-base" onClick={() => void start()} disabled={disabled || state === 'starting'}>
          <ScanFace />
          Mở camera
        </Button>
      )}
    </div>
  )
}
