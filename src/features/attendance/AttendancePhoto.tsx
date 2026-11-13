import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { API_BASE_URL } from '@/lib/api-client'
import { formatTime, formatWorkDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatMeters } from './use-geolocation'
import { SLOT_LABEL, type AttendanceRecord, type AttendanceSlot } from './attendance.types'

const SHORT_LABEL: Record<AttendanceSlot, string> = {
  morning_in: 'Vào S',
  morning_out: 'Ra S',
  afternoon_in: 'Vào C',
  afternoon_out: 'Ra C',
}

function photoUrl(record: AttendanceRecord, slot: AttendanceSlot) {
  return `${API_BASE_URL}/attendance/${record.id}/photos/${slot}`
}

/** Ảnh thu nhỏ của từng lượt chấm công trong ngày; bấm để xem lớn. */
export function AttendancePhotos({ record, title }: { record: AttendanceRecord | null; title?: string }) {
  const [open, setOpen] = useState(false)
  if (!record || record.punches.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  const punches = record.punches

  return (
    <>
      <div className="flex -space-x-2">
        {punches.map((p) => (
          <button
            key={p.slot}
            type="button"
            onClick={() => setOpen(true)}
            title={`Ảnh ${SLOT_LABEL[p.slot].toLowerCase()}`}
            className="relative size-9 overflow-hidden rounded-lg border-2 border-card bg-muted ring-1 ring-border transition-transform hover:z-10 hover:scale-110"
          >
            <Thumb src={photoUrl(record, p.slot)} />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 text-[9px] leading-3 font-medium text-white">
              {SHORT_LABEL[p.slot]}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={punches.length > 1 ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
          <DialogHeader>
            <DialogTitle>Ảnh chấm công{title ? ` · ${title}` : ''}</DialogTitle>
            <DialogDescription className="capitalize">{formatWorkDate(record.workDate, { long: true })}</DialogDescription>
          </DialogHeader>
          <div className={cn('grid max-h-[70vh] gap-3 overflow-y-auto', punches.length > 1 && 'sm:grid-cols-2')}>
            {punches.map((p) => (
              <figure key={p.slot} className="space-y-1.5">
                <div className="aspect-4/3 overflow-hidden rounded-xl border bg-muted">
                  <Thumb src={photoUrl(record, p.slot)} />
                </div>
                <figcaption className="text-center text-sm text-muted-foreground">
                  {SLOT_LABEL[p.slot]} lúc <span className="font-medium text-foreground">{formatTime(p.at)}</span>
                  {p.screenTime && (
                    <span className="block text-xs">
                      Giờ máy {p.screenTime}
                      {p.screenDate && ` · ${p.screenDate}`}
                    </span>
                  )}
                  {p.faceScore != null && (
                    <span className="block text-xs">Khuôn mặt khớp {Math.round(p.faceScore * 100)}%</span>
                  )}
                  {p.sceneScore != null && (
                    <span className="block text-xs">
                      Nền văn phòng{p.floorNote ? ` ${p.floorNote}` : ''} {Math.round(p.sceneScore * 100)}%
                    </span>
                  )}
                  {p.distanceMeters !== null && (
                    <span className="block text-xs">Cách công ty {formatMeters(p.distanceMeters)}</span>
                  )}
                  {p.note && <span className="block truncate text-xs">“{p.note}”</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Thumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <ImageOff className="size-4" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full -scale-x-100 object-cover"
    />
  )
}
