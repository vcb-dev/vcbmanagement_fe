import { Camera, CameraOff, ImagePlus, Loader2, RotateCcw, ScanFace, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Đủ nét để đọc giờ trên màn hình máy tính phía sau; ~300–600KB, dưới giới hạn 2MB của server. */
const MAX_WIDTH = 1600
const JPEG_QUALITY = 0.88

type CameraState = 'idle' | 'starting' | 'live' | 'error'

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') return 'Bạn đã chặn quyền camera. Hãy cho phép camera trên trình duyệt rồi thử lại.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy camera trên thiết bị này.'
  if (name === 'NotReadableError') return 'Camera đang được ứng dụng khác sử dụng.'
  if (!navigator.mediaDevices?.getUserMedia) return 'Trình duyệt không hỗ trợ camera (cần HTTPS hoặc localhost).'
  return 'Không mở được camera.'
}

function toJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob | null> {
  const scale = Math.min(1, MAX_WIDTH / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
}

function fileToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      URL.revokeObjectURL(url)
      const blob = await toJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
      resolve(blob ?? file)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được ảnh'))
    }
    img.src = url
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
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [mirrored, setMirrored] = useState(false)
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => stop, [])

  useEffect(() => {
    const video = videoRef.current
    if (state !== 'live' || !video || !streamRef.current) return
    video.srcObject = streamRef.current
    void video.play().catch(() => undefined)
  }, [state, previewUrl])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const start = async () => {
    setError(null)
    setState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      })
      streamRef.current = stream
      setState('live')
    } catch (err) {
      setError(cameraErrorMessage(err))
      setState('error')
    }
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const blob = await toJpeg(video, video.videoWidth, video.videoHeight)
    if (!blob) return
    stop()
    setState('idle')
    setMirrored(true)
    onChange(blob)
  }

  const pickFile = async (file: File | Blob | undefined) => {
    if (!file || disabled) return
    try {
      const asFile = file instanceof File ? file : new File([file], 'clipboard.jpg', { type: file.type || 'image/jpeg' })
      const blob = await fileToJpeg(asFile)
      stop()
      setState('idle')
      setMirrored(false)
      setError(null)
      onChange(blob)
    } catch {
      setError('Không đọc được ảnh đã chọn')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const pasteFromClipboard = async () => {
    if (disabled || state === 'live' || state === 'starting') return
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'))
          if (!type) continue
          await pickFile(await item.getType(type))
          return
        }
      }
      setError('Clipboard chưa có ảnh. Copy ảnh rồi bấm lại, hoặc Ctrl+V khi khung đang chọn.')
    } catch {
      frameRef.current?.focus()
      setError('Cho phép dán ảnh từ clipboard, rồi bấm lại hoặc Ctrl+V.')
    }
  }

  const clickTimer = useRef<number>(0)
  const frameRef = useRef<HTMLDivElement>(null)

  const onFrameClick = () => {
    if (disabled || state === 'live' || state === 'starting') return
    window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(() => {
      void pasteFromClipboard()
    }, 280)
  }

  const onFrameDoubleClick = (e: MouseEvent) => {
    e.preventDefault()
    if (disabled || state === 'live' || state === 'starting') return
    window.clearTimeout(clickTimer.current)
    fileRef.current?.click()
  }

  const onFramePaste = (e: ClipboardEvent) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'))
    const file = item?.getAsFile() ?? e.clipboardData.files[0]
    if (!file) return
    e.preventDefault()
    void pickFile(file)
  }

  useEffect(() => () => window.clearTimeout(clickTimer.current), [])

  const clearPhoto = (e?: MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    window.clearTimeout(clickTimer.current)
    onChange(null)
    setError(null)
    setMirrored(false)
    requestAnimationFrame(() => frameRef.current?.focus())
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />
      <div
        ref={frameRef}
        tabIndex={0}
        onClick={onFrameClick}
        onDoubleClick={onFrameDoubleClick}
        onPaste={onFramePaste}
        className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Ảnh chấm công"
            className={cn('size-full object-cover', mirrored && '-scale-x-100')}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn('size-full -scale-x-100 object-cover', state !== 'live' && 'hidden')}
            />
            {state === 'live' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="aspect-square w-[62%] rounded-full border-[3px] border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
              </div>
            )}
            {state !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                {state === 'starting' ? (
                  <Loader2 className="size-7 animate-spin text-muted-foreground" />
                ) : state === 'error' ? (
                  <CameraOff className="size-7 text-destructive" />
                ) : (
                  <ImagePlus className="size-8 text-muted-foreground" />
                )}
                {state !== 'starting' && (
                  <span className="text-sm font-medium">Bấm 1 lần để dán ảnh · bấm 2 lần để chọn file</span>
                )}
                <span className={cn('text-xs', error || state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                  {state === 'starting'
                    ? 'Đang mở camera…'
                    : (error ?? 'Copy ảnh (Ctrl+C) rồi bấm khung, hoặc Ctrl+V')}
                </span>
              </div>
            )}
          </>
        )}
        {previewUrl && (
          <>
            <span className="absolute top-2 left-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white shadow">
              Đã chọn
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
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" onClick={clearPhoto} disabled={disabled}>
            <Trash2 />
            Xoá ảnh
          </Button>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled}>
            <ImagePlus />
            Chọn file
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onChange(null)
              void start()
            }}
            disabled={disabled}
          >
            <RotateCcw />
            Camera
          </Button>
        </div>
      ) : state === 'live' ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button type="button" variant="secondary" onClick={capture} disabled={disabled}>
            <Camera />
            Chụp ảnh
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              stop()
              setState('idle')
            }}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={start} disabled={disabled || state === 'starting'}>
          <ScanFace />
          Hoặc mở camera
        </Button>
      )}
    </div>
  )
}
