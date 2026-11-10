import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatWorkDate } from '@/lib/format'
import {
  SHIFT_LABEL,
  type PartTimeShiftView,
} from './part-time.types'
import { useUpsertShiftEntry } from './use-part-time-admin'

function toHhmm(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d)
}

export function ShiftEntryDialog({
  userId,
  workDate,
  shift,
  kind,
  open,
  onOpenChange,
}: {
  userId: string
  workDate: string
  shift: PartTimeShiftView
  kind: 'online' | 'manual'
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const upsert = useUpsertShiftEntry()

  useEffect(() => {
    if (open) {
      setInTime(kind === 'manual' ? toHhmm(shift.inAt) : '')
      setOutTime(kind === 'manual' ? toHhmm(shift.outAt) : '')
      setNote(shift.entry?.note ?? '')
      setErrorMsg(null)
    }
  }, [open, kind, shift])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      setErrorMsg('Vui lòng nhập lý do')
      return
    }

    try {
      setErrorMsg(null)
      await upsert.mutateAsync({
        userId,
        workDate,
        shift: shift.shift,
        kind,
        inTime: kind === 'manual' && inTime ? inTime : undefined,
        outTime: kind === 'manual' && outTime ? outTime : undefined,
        note: note.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
    }
  }

  const title = kind === 'online' ? 'Đánh dấu làm online' : 'Bổ sung giờ làm việc'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {formatWorkDate(workDate, { long: true })} · {SHIFT_LABEL[shift.shift]} (
              {shift.window.start}–{shift.window.end})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {kind === 'manual' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inTime">Giờ vào</Label>
                  <Input
                    id="inTime"
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="outTime">Giờ ra</Label>
                  <Input
                    id="outTime"
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="note">
                Lý do / Ghi chú <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  kind === 'online'
                    ? 'Nhập lý do làm online...'
                    : 'Nhập lý do bổ sung / điều chỉnh giờ...'
                }
              />
            </div>

            {errorMsg && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={upsert.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
