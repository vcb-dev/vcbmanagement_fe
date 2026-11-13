import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDayMonth, formatHours, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PartTimeShiftView } from './part-time.types'
import { useDeleteShiftEntry, useUpsertShiftEntry } from './use-part-time-admin'

function windowDurationHours(window: { start: string; end: string }): number {
  const [sh, sm] = window.start.split(':').map(Number)
  const [eh, em] = window.end.split(':').map(Number)
  const diffMin = eh * 60 + em - (sh * 60 + sm)
  return Math.max(0, Math.round((diffMin / 60) * 100) / 100)
}

export function ShiftHoursDialog({
  user,
  date,
  shift,
  open,
  onOpenChange,
}: {
  user: { id: string; name: string }
  date: string
  shift: PartTimeShiftView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const maxHours = windowDurationHours(shift.window)
  const hasMachinePunches = Boolean(shift.inAt || shift.outAt)

  const [kind, setKind] = useState<'online' | 'manual'>('manual')
  const [hours, setHours] = useState<string>('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const upsert = useUpsertShiftEntry()
  const deleteEntry = useDeleteShiftEntry()

  useEffect(() => {
    if (open) {
      const initialKind = shift.entry?.kind ?? (shift.mode === 'online' ? 'online' : 'manual')
      setKind(initialKind)
      if (shift.entry) {
        setHours(String(shift.entry.hours))
        setNote(shift.entry.note)
      } else if (initialKind === 'online') {
        setHours(String(maxHours))
        setNote('')
      } else {
        setHours(formatHours(shift.minutes))
        setNote('')
      }
      setErrorMsg(null)
      setConfirmDeleteOpen(false)
    }
  }, [open, shift, maxHours])

  const handleKindChange = (nextKind: 'online' | 'manual') => {
    setKind(nextKind)
    if (nextKind === 'online' && !shift.entry) {
      setHours(String(maxHours))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numHours = Number(hours)
    if (isNaN(numHours) || numHours < 0) {
      setErrorMsg('Số giờ không hợp lệ')
      return
    }
    if (numHours > maxHours) {
      setErrorMsg(`Số giờ tối đa của ca này là ${maxHours}`)
      return
    }

    try {
      setErrorMsg(null)
      await upsert.mutateAsync({
        userId: user.id,
        workDate: date,
        shift: shift.shift,
        kind,
        hours: numHours,
        note: note.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!shift.entry) return
    try {
      setErrorMsg(null)
      await deleteEntry.mutateAsync(shift.entry.id)
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
      setConfirmDeleteOpen(false)
    }
  }

  const shiftName =
    shift.shift === 'morning' ? 'sáng' : shift.shift === 'afternoon' ? 'chiều' : 'tối'
  const title = `${user.name} · Ca ${shiftName} ${formatDayMonth(date)} (${shift.window.start}–${shift.window.end})`

  let machineText = 'Máy chấm: chưa có giờ'
  if (shift.inAt && shift.outAt) {
    machineText = `Máy chấm: vào ${formatTime(shift.inAt)} · ra ${formatTime(shift.outAt)} → ${formatHours(shift.minutes)} giờ`
  } else if (shift.inAt) {
    machineText = `Máy chấm: vào ${formatTime(shift.inAt)} · chưa có giờ ra`
  } else if (shift.outAt) {
    machineText = `Máy chấm: chưa có giờ vào · ra ${formatTime(shift.outAt)}`
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {machineText}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Hình thức</Label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center space-x-2 text-sm">
                    <input
                      type="radio"
                      name="shift-kind"
                      value="manual"
                      checked={kind === 'manual'}
                      onChange={() => handleKindChange('manual')}
                      className="size-4 accent-primary"
                    />
                    <span>Tại chỗ</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center space-x-2 text-sm',
                      hasMachinePunches ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
                    )}
                  >
                    <input
                      type="radio"
                      name="shift-kind"
                      value="online"
                      checked={kind === 'online'}
                      disabled={hasMachinePunches}
                      onChange={() => handleKindChange('online')}
                      className="size-4 accent-primary"
                    />
                    <span>Online</span>
                  </label>
                </div>
                {hasMachinePunches && (
                  <p className="text-xs text-muted-foreground">Buổi đã có giờ chấm máy</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shift-hours" className="text-xs font-medium">
                    Số giờ làm việc <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">Tối đa: {maxHours} giờ</span>
                </div>
                <Input
                  id="shift-hours"
                  type="number"
                  step="0.25"
                  min="0"
                  max={maxHours}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift-note" className="text-xs font-medium">
                  Lý do
                </Label>
                <Textarea
                  id="shift-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh hoặc làm online (không bắt buộc)..."
                />
              </div>

              {errorMsg && (
                <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <div>
                {shift.entry && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={upsert.isPending || deleteEntry.isPending}
                  >
                    Bỏ sửa
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={upsert.isPending || deleteEntry.isPending}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={upsert.isPending || deleteEntry.isPending}>
                  {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Bỏ sửa ca này?"
        description="Ca làm việc sẽ trở về trạng thái gốc từ máy chấm công."
        confirmLabel="Bỏ sửa"
        pending={deleteEntry.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  )
}
