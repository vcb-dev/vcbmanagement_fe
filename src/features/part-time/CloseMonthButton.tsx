import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMonth } from '@/lib/format'
import type { CloseMonthResult } from './part-time.types'
import { useCloseMonth } from './use-part-time-admin'

export function CloseMonthButton({
  month,
  label = 'Chốt công tháng',
  variant = 'default',
  size = 'default',
  className = 'gap-2',
}: {
  month: string
  label?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<CloseMonthResult | null>(null)
  const closeMonth = useCloseMonth()

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setResult(null)
    }
  }

  const handleConfirm = async () => {
    try {
      const res = await closeMonth.mutateAsync(month)
      if (res.data) {
        setResult(res.data)
      } else {
        setOpen(false)
      }
    } catch {
      // Error handled by mutation toast
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <Lock className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {result ? 'Kết quả chốt công' : `Chốt công ${formatMonth(month)}`}
            </DialogTitle>
            <DialogDescription>
              {result
                ? `Đã chốt ${result.closed} · Không đổi ${result.unchanged} · Bỏ qua ${result.skipped.length}`
                : `Chốt công ${formatMonth(month)}? Hệ thống sẽ tính lại số giờ và lưu thành bản chốt cho mọi nhân viên part-time active có bộ phận.`}
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>
                  Đã chốt: <b>{result.closed}</b> · Không đổi: <b>{result.unchanged}</b> · Bỏ qua:{' '}
                  <b>{result.skipped.length}</b>
                </span>
              </div>

              {result.skipped.length > 0 && (
                <div className="space-y-1.5 rounded-md border p-3 text-xs">
                  <p className="font-medium text-foreground">
                    Danh sách nhân viên bị bỏ qua ({result.skipped.length}):
                  </p>
                  <div className="max-h-40 divide-y overflow-y-auto">
                    {result.skipped.map((s) => (
                      <div key={s.userId} className="flex items-center justify-between py-1.5">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-destructive">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>Đóng</Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={closeMonth.isPending}
              >
                Huỷ
              </Button>
              <Button onClick={handleConfirm} disabled={closeMonth.isPending}>
                {closeMonth.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận chốt
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
