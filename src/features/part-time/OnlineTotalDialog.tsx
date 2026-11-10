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
import { getApiErrorMessage } from '@/lib/api-client'
import { useSetOnlineTotal } from './use-part-time-admin'

export function OnlineTotalDialog({
  sheetId,
  currentHours,
  open,
  onOpenChange,
}: {
  sheetId: string
  currentHours: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [hours, setHours] = useState<string>(String(currentHours))
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const setTotal = useSetOnlineTotal()

  useEffect(() => {
    if (open) {
      setHours(String(currentHours))
      setErrorMsg(null)
    }
  }, [open, currentHours])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numHours = parseFloat(hours)
    if (isNaN(numHours) || numHours < 0 || numHours > 9999.99) {
      setErrorMsg('Số giờ phải là số từ 0 đến 9999.99')
      return
    }

    try {
      setErrorMsg(null)
      await setTotal.mutateAsync({ sheetId, hours: numHours })
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nhập tổng giờ online</DialogTitle>
            <DialogDescription>
              Nhập tổng số giờ online cả tháng cho nhân viên (áp dụng khi không ghi nhận theo từng ca).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="onlineHours">
                Tổng số giờ online <span className="text-destructive">*</span>
              </Label>
              <Input
                id="onlineHours"
                type="number"
                step="0.01"
                min="0"
                max="9999.99"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Ví dụ: 12.5"
                required
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
              disabled={setTotal.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={setTotal.isPending}>
              {setTotal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
