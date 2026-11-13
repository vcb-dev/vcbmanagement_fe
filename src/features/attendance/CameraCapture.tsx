import { Camera, CameraOff, Loader2, RotateCcw, ScanFace, SwitchCamera, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { getCameraStream, prepareVideoEl } from '@/lib/camera'
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

function jpegFromDataUrl(canvas: HTMLCanvasElement): Blob | null {
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const raw = atob(dataUrl.split(',')[1] ?? '')
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return new Blob([bytes], { type: 'image/jpeg' })
  } catch {
    return null
  }
}

function toJpeg(video: HTMLVideoElement): Promise<Blob | null> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return Promise.resolve(null)

  const scale = Math.min(1, MAX_WIDTH / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve) => {
    let settled = false
    const finish = (blob: Blob | null) => {
      if (settled) return
      settled = true
      resolve(blob)
    }

    const timer = window.setTimeout(() => finish(jpegFromDataUrl(canvas)), 800)
    try {
      canvas.toBlob((blob) => {
        window.clearTimeout(timer)
        finish(blob && blob.size > 0 ? blob : jpegFromDataUrl(canvas))
      }, 'image/jpeg', JPEG_QUALITY)
    } catch {
      window.clearTimeout(timer)
      finish(jpegFromDataUrl(canvas))
    }
  })
}

export function CameraCapture({
  photo,
  onChange,
  disabled,
}: {
  photo: Blob | null
  onChange: (photo: Blob | null) => void
  disabled?: boolean
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
    prepareVideoEl(video)
    video.srcObject = stream
    await video.play()
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
      const blob = await toJpeg(video)
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
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-zinc-100">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            'absolute inset-0 size-full object-cover',
            mirrored && '-scale-x-100',
            !previewUrl && state === 'live' ? 'opacity-100' : 'opacity-0',
          )}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Ảnh chấm công" className={cn('relative size-full object-cover', mirrored && '-scale-x-100')} />
        ) : (
          <>
            {state === 'live' && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="aspect-square w-[62%] rounded-full border-[3px] border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
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
                  className="text-xs"
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
            <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: '#10b981' }}>
              Đã chụp
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute top-2 right-2 size-8 rounded-full bg-black/55 text-white shadow hover:bg-black/70"
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
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-12" onClick={clearPhoto} disabled={disabled}>
            <Trash2 />
            Xoá ảnh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12"
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
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button type="button" variant="secondary" className="h-12 text-base" onClick={() => void capture()} disabled={disabled}>
            <Camera />
            Chụp ảnh
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 min-w-18"
            onClick={() => {
              stop()
              setState('idle')
            }}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={() => void start()} disabled={disabled || state === 'starting'}>
          <ScanFace />
          Mở camera
        </Button>
      )}
    </div>
  )
}
