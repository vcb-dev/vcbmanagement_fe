import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { API_BASE_URL } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export function facePhotoSrc(userId: string, index: number, submittedAt?: string) {
  const t = submittedAt ? `?t=${encodeURIComponent(submittedAt)}` : ''
  return `${API_BASE_URL}/face/${userId}/photos/${index}${t}`
}

/** Ảnh đăng ký khuôn mặt (nhìn thẳng / trái / phải) — nhân viên tự xem và quản lý duyệt. */
export function FacePhotos({
  userId,
  count,
  labels,
  submittedAt,
  name,
}: {
  userId: string
  count: number
  labels: string[]
  submittedAt?: string
  name?: string
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (count <= 0) return null

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }, (_, i) => {
          const label = labels[i] ?? `Ảnh ${i + 1}`
          return (
            <li key={`${userId}-${i}-${submittedAt ?? ''}`}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group w-full space-y-1.5 text-left"
              >
                <span className="block aspect-[3/4] overflow-hidden rounded-xl border bg-muted">
                  <Thumb src={facePhotoSrc(userId, i, submittedAt)} alt={`${name ? `${name} · ` : ''}${label}`} />
                </span>
                <span className="block text-center text-xs text-muted-foreground group-hover:text-foreground">
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{open !== null ? (labels[open] ?? 'Ảnh khuôn mặt') : 'Ảnh khuôn mặt'}</DialogTitle>
            <DialogDescription>{name ?? 'Ảnh đã đăng ký, lưu trên kho ảnh công ty.'}</DialogDescription>
          </DialogHeader>
          {open !== null && (
            <div className="aspect-[3/4] overflow-hidden rounded-xl border bg-muted">
              <Thumb src={facePhotoSrc(userId, open, submittedAt)} alt={labels[open] ?? 'Ảnh khuôn mặt'} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="flex size-full items-center justify-center text-muted-foreground">
        <ImageOff className="size-5" aria-hidden />
        <span className="sr-only">Không tải được ảnh</span>
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('size-full -scale-x-100 object-cover')}
    />
  )
}
