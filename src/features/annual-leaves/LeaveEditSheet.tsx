import { AlertCircle, Lock, Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AnnualLeaveRow } from './annual-leaves.types'
import { formatDays, LEAVE_STATUS_LABEL, leaveStatus } from './leave-status'
import { useDeleteLeaveRow, useSaveLeaveRow } from './use-annual-leaves'

interface LeaveEditSheetProps {
  row: AnnualLeaveRow | null
  year: number
  open: boolean
  onOpenChange(open: boolean): void
}

export function LeaveEditSheet({
  row,
  year,
  open,
  onOpenChange,
}: LeaveEditSheetProps) {
  const [entitledDays, setEntitledDays] = useState<number>(0)
  const [months, setMonths] = useState<number[]>(Array(12).fill(0))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const saveMutation = useSaveLeaveRow()
  const deleteMutation = useDeleteLeaveRow()

  const today = todayYmd()
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))

  useEffect(() => {
    if (row) {
      setEntitledDays(row.entitledDays)
      setMonths([...row.months])
      setErrorMessage(null)
    }
  }, [row])

  const usedDays = useMemo(() => months.reduce((acc, v) => acc + v, 0), [months])
  const remainingDays = useMemo(() => entitledDays - usedDays, [entitledDays, usedDays])
  const currentStatus = useMemo(() => leaveStatus(entitledDays, usedDays), [entitledDays, usedDays])

  const handleMonthChange = (index: number, val: number) => {
    const next = [...months]
    next[index] = Math.max(0, Math.min(31, Math.round(val * 2) / 2))
    setMonths(next)
  }

  const handleSave = async () => {
    if (!row) return
    setErrorMessage(null)
    try {
      await saveMutation.mutateAsync({
        id: row.id,
        entitledDays,
        months,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!row) return
    try {
      await deleteMutation.mutateAsync(row.id)
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
      setConfirmDeleteOpen(false)
    }
  }

  if (!row) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        {/* Độ rộng phải đi kèm data-[side=right]: lớp gốc của Sheet có data-[side=right]:sm:max-w-sm,
            selector mạnh hơn nên `sm:max-w-md` trơn bị lấn, sheet kẹt ở 384px. */}
        <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>{row.user.name}</SheetTitle>
            <SheetDescription>
              Phép năm {year} · sửa số được hưởng và số ngày đã nghỉ từng tháng.
            </SheetDescription>
          </SheetHeader>

          {/* Thân cuộn riêng, đầu và chân (nút Lưu) luôn hiện. */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {/* Khối tóm tắt */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trạng thái</span>
                <Badge
                  variant={
                    currentStatus === 'over'
                      ? 'destructive'
                      : currentStatus === 'ok'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="font-medium"
                >
                  {LEAVE_STATUS_LABEL[currentStatus]}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-background p-2 shadow-xs">
                  <div className="text-[11px] text-muted-foreground">Còn lại</div>
                  <div
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      remainingDays < 0 ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {formatDays(remainingDays)}
                  </div>
                </div>
                <div className="rounded-md bg-background p-2 shadow-xs">
                  <div className="text-[11px] text-muted-foreground">Được hưởng</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatDays(entitledDays)}
                  </div>
                </div>
                <div className="rounded-md bg-background p-2 shadow-xs">
                  <div className="text-[11px] text-muted-foreground">Đã dùng</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatDays(usedDays)}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Còn lại tự tính = được hưởng − tổng các tháng
              </p>
            </div>

            {/* Ô số ngày được hưởng */}
            <div className="space-y-2">
              <Label htmlFor="entitled-days">Phép được hưởng năm {year}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="entitled-days"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  disabled={row.user.contractStartDate === null}
                  value={isNaN(entitledDays) ? '' : entitledDays}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    setEntitledDays(isNaN(v) ? 0 : v)
                  }}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">ngày</span>
              </div>

              {row.suggestion ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Gợi ý: {row.suggestion.note}
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEntitledDays(row.suggestion!.days)}
                    >
                      Dùng số gợi ý
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Chưa có ngày ký HĐ của {row.user.name} nên chưa có phép. Nhập ngày ký ở Danh sách nhân sự.
                </p>
              )}
            </div>

            {/* 12 Ô tháng */}
            <div className="space-y-3">
              <Label>Số ngày đã nghỉ theo tháng</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const val = months[m - 1]
                  const isBeforeContract = m < row.startMonth
                  const isLocked = row.lockedMonths.includes(m)
                  const isThisMonth = year === currentYear && m === currentMonth

                  return (
                    <div
                      key={m}
                      className={cn(
                        'rounded-md border p-2 text-xs flex flex-col gap-1.5',
                        isThisMonth && 'ring-1 ring-primary bg-primary/5',
                        isBeforeContract && 'bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Tháng {m}</span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Lock className="size-2.5" />
                            Đã chốt công
                          </span>
                        ) : isBeforeContract ? (
                          <span className="text-[10px] text-muted-foreground">
                            {row.user.contractStartDate ? 'Trước ngày ký HĐ' : 'Chưa ký HĐ'}
                          </span>
                        ) : isThisMonth ? (
                          <span className="text-[10px] text-primary font-medium">
                            Tháng này
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7 shrink-0"
                          disabled={isLocked || (isBeforeContract && val <= 0)}
                          onClick={() => handleMonthChange(m - 1, val - 0.5)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={31}
                          step={0.5}
                          disabled={isLocked || isBeforeContract}
                          value={isNaN(val) ? '' : val}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value)
                            handleMonthChange(m - 1, isNaN(parsed) ? 0 : parsed)
                          }}
                          className="h-7 p-1 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7 shrink-0"
                          disabled={isLocked || isBeforeContract}
                          onClick={() => handleMonthChange(m - 1, val + 0.5)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <SheetFooter className="border-t">
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-1"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Xóa dòng phép
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Xóa dòng phép năm ${year}?`}
        description={`Dòng phép năm của ${row.user.name} và số ngày nghỉ các tháng sẽ bị xóa.`}
        confirmLabel="Xóa"
        pending={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  )
}
