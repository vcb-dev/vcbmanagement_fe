import { AlertCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AnnualLeaveRow } from './annual-leaves.types'
import { formatDays } from './leave-status'
import { useRecordLeave } from './use-annual-leaves'

interface RecordLeaveDialogProps {
  rows: AnnualLeaveRow[]
  year: number
  initialRowId?: string | null
  open: boolean
  onOpenChange(open: boolean): void
}

const QUICK_DAYS = [0.5, 1, 1.5, 2, 3]

export function RecordLeaveDialog({
  rows,
  year,
  initialRowId,
  open,
  onOpenChange,
}: RecordLeaveDialogProps) {
  const today = todayYmd()
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))

  const defaultMonth = year === currentYear ? currentMonth : 1

  const [selectedRowId, setSelectedRowId] = useState<string>('')
  const [month, setMonth] = useState<number>(defaultMonth)
  const [days, setDays] = useState<number>(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recordMutation = useRecordLeave()

  useEffect(() => {
    if (open) {
      setErrorMessage(null)
      setDays(1)
      const m = year === currentYear ? currentMonth : 1
      setMonth(m)

      if (initialRowId && rows.some((r) => r.id === initialRowId)) {
        setSelectedRowId(initialRowId)
      } else if (rows.length > 0) {
        setSelectedRowId(rows[0].id)
      } else {
        setSelectedRowId('')
      }
    }
  }, [open, initialRowId, rows, year, currentYear, currentMonth])

  const selectedRow = rows.find((r) => r.id === selectedRowId)

  // Xem trước:
  // Tháng m: a → b ngày
  // Còn lại: x → y ngày (y < 0 thì tô đỏ kèm "vượt phép được hưởng")
  const currentMonthDays = selectedRow ? selectedRow.months[month - 1] : 0
  const nextMonthDays = currentMonthDays + (isNaN(days) ? 0 : days)

  const currentRemaining = selectedRow ? selectedRow.remainingDays : 0
  const nextRemaining = currentRemaining - (isNaN(days) ? 0 : days)

  const handleRecord = async () => {
    if (!selectedRowId) return
    setErrorMessage(null)
    try {
      await recordMutation.mutateAsync({
        id: selectedRowId,
        month,
        days,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi nhận nghỉ phép</DialogTitle>
          <DialogDescription>
            Cộng nhanh số ngày nghỉ vào một tháng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Chọn nhân sự */}
          <div className="space-y-2">
            <Label htmlFor="record-user-select">Nhân sự</Label>
            <Select value={selectedRowId} onValueChange={setSelectedRowId}>
              <SelectTrigger id="record-user-select" className="w-full">
                <SelectValue placeholder="Chọn nhân sự" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.user.name}
                    {r.user.departmentName ? ` · ${r.user.departmentName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chọn tháng */}
          <div className="space-y-2">
            <Label htmlFor="record-month-select">Tháng</Label>
            <Select
              value={String(month)}
              onValueChange={(val) => setMonth(Number(val))}
            >
              <SelectTrigger id="record-month-select" className="w-full">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const isBeforeContract = selectedRow
                    ? m < selectedRow.startMonth
                    : false
                  const isLocked = selectedRow
                    ? selectedRow.lockedMonths.includes(m)
                    : false
                  const disabled = isBeforeContract || isLocked

                  let labelExtra = ''
                  if (isLocked) labelExtra = ' (Đã chốt công)'
                  else if (isBeforeContract) labelExtra = ' (Trước ngày ký HĐ)'

                  return (
                    <SelectItem
                      key={m}
                      value={String(m)}
                      disabled={disabled}
                    >
                      Tháng {m} {labelExtra}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Số ngày nghỉ */}
          <div className="space-y-2">
            <Label htmlFor="record-days-input">Số ngày nghỉ</Label>
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {QUICK_DAYS.map((qd) => (
                <Button
                  key={qd}
                  type="button"
                  variant={days === qd ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDays(qd)}
                >
                  {formatDays(qd)} ngày
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="record-days-input"
                type="number"
                min={0.5}
                max={31}
                step={0.5}
                value={isNaN(days) ? '' : days}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setDays(isNaN(val) ? 0 : val)
                }}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">ngày</span>
            </div>
          </div>

          {/* Xem trước */}
          {selectedRow && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tháng {month}:</span>
                <span className="font-medium">
                  {formatDays(currentMonthDays)} → {formatDays(nextMonthDays)} ngày
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Còn lại:</span>
                <span
                  className={cn(
                    'font-medium',
                    nextRemaining < 0 && 'text-destructive font-semibold',
                  )}
                >
                  {formatDays(currentRemaining)} → {formatDays(nextRemaining)} ngày
                  {nextRemaining < 0 && ' (vượt phép được hưởng)'}
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleRecord}
            disabled={!selectedRowId || days <= 0 || recordMutation.isPending}
          >
            {recordMutation.isPending ? 'Đang ghi nhận...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
