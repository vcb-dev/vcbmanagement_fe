import { Clock, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useDepartments } from '@/features/departments/use-departments'
import { MonthCalendar } from '@/features/my-timesheet/MonthCalendar'
import { formatMonth, todayYmd } from '@/lib/format'
import { FeedbackThread } from './FeedbackThread'
import { OnlineTotalDialog } from './OnlineTotalDialog'
import {
  PART_TIME_DAY_LABEL,
  PART_TIME_DAY_STYLE,
  partTimeDayKind,
} from './part-time-day-status'
import { PartTimeDayDetail } from './PartTimeDayDetail'
import type { PartTimeShiftView, PartTimeDayView, PartTimeSheetRow } from './part-time.types'
import { ShiftHoursDialog } from './ShiftHoursDialog'
import {
  useClearOnlineTotal,
  useDeleteShiftEntry,
  usePartTimeUserDays,
} from './use-part-time-admin'

const PART_TIME_LEGEND = [
  { label: 'Có làm', swatch: 'bg-emerald-500' },
  { label: 'Online', swatch: 'bg-sky-500' },
  { label: 'Thiếu mốc', swatch: 'bg-rose-500' },
  { label: 'Không có ca', swatch: 'bg-muted-foreground/30' },
]

export function PartTimeUserSheet({
  row,
  month,
  onClose,
}: {
  row: PartTimeSheetRow | null
  month: string
  onClose: () => void
}) {
  const today = todayYmd()
  const defaultYmd = today.startsWith(month) ? today : `${month}-01`
  const [selectedYmd, setSelectedYmd] = useState(defaultYmd)

  const [shiftDialog, setShiftDialog] = useState<{
    open: boolean
    shift: PartTimeShiftView | null
  }>({ open: false, shift: null })

  const [onlineTotalOpen, setOnlineTotalOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  const deleteEntry = useDeleteShiftEntry()
  const clearTotal = useClearOnlineTotal()

  const { data: departments = [] } = useDepartments()
  const department = useMemo(
    () => departments.find((d) => d.id === row?.department?.id) ?? null,
    [departments, row?.department?.id],
  )

  const userId = row?.user.id ?? null
  const { data: days = [] } = usePartTimeUserDays(userId, month)

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const emptyRecords = useMemo(() => new Map(), [])

  useEffect(() => {
    const fallback = today.startsWith(month) ? today : `${month}-01`
    setSelectedYmd(fallback)
  }, [month, row?.user.id, today])

  const defaultShifts = useMemo((): PartTimeShiftView[] => {
    if (!row?.department) return []
    const morning: PartTimeShiftView = {
      shift: 'morning',
      window: {
        start: department?.morningStart ?? '08:00',
        end: department?.morningEnd ?? '12:00',
      },
      mode: 'none',
      source: null,
      inAt: null,
      outAt: null,
      minutes: 0,
      lateMinutes: 0,
      lateLevel: null,
      earlyMinutes: 0,
      missing: false,
      inProgress: false,
      entry: null,
    }
    const afternoon: PartTimeShiftView = {
      shift: 'afternoon',
      window: {
        start: department?.afternoonStart ?? '13:30',
        end: department?.afternoonEnd ?? '17:30',
      },
      mode: 'none',
      source: null,
      inAt: null,
      outAt: null,
      minutes: 0,
      lateMinutes: 0,
      lateLevel: null,
      earlyMinutes: 0,
      missing: false,
      inProgress: false,
      entry: null,
    }
    const res: PartTimeShiftView[] = [morning, afternoon]
    if (department?.eveningStart && department?.eveningEnd) {
      res.push({
        shift: 'evening',
        window: {
          start: department.eveningStart,
          end: department.eveningEnd,
        },
        mode: 'none',
        source: null,
        inAt: null,
        outAt: null,
        minutes: 0,
        lateMinutes: 0,
        lateLevel: null,
        earlyMinutes: 0,
        missing: false,
        inProgress: false,
        entry: null,
      })
    }
    return res
  }, [department, row?.department])

  const selectedDay = dayMap.get(selectedYmd)
  const effectiveDay = useMemo((): PartTimeDayView | undefined => {
    if (selectedDay) return selectedDay
    if (!row?.department) return undefined
    return {
      date: selectedYmd,
      shifts: defaultShifts,
      offlineMinutes: 0,
      onlineMinutes: 0,
      lateCount: 0,
      missingCount: 0,
    }
  }, [selectedDay, row?.department, selectedYmd, defaultShifts])

  const isPastOrToday = selectedYmd <= today

  const handleDeleteEntry = async () => {
    if (!deletingEntryId) return
    try {
      await deleteEntry.mutateAsync(deletingEntryId)
      setDeletingEntryId(null)
    } catch {
      // Error handled by mutation
    }
  }

  const handleClearTotal = async () => {
    if (!row?.sheet) return
    try {
      await clearTotal.mutateAsync(row.sheet.id)
      setConfirmClearOpen(false)
    } catch {
      // Error handled by mutation
    }
  }

  if (!row) return null

  return (
    <>
      <Sheet open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex flex-col gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{row.user.name}</SheetTitle>
            <SheetDescription>
              {row.user.email} · {row.department?.name ?? 'Chưa gán bộ phận'} ·{' '}
              {formatMonth(month)}
            </SheetDescription>

            {row.sheet && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOnlineTotalOpen(true)}
                  className="gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Nhập tổng giờ online
                </Button>

                {row.sheet.onlineMonthly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmClearOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    Bỏ nhập tổng
                  </Button>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-6 p-4">
            <div className="rounded-lg border p-3">
              <MonthCalendar
                month={month}
                records={emptyRecords}
                today={today}
                selected={selectedYmd}
                onSelect={setSelectedYmd}
                kind={(ymd) => {
                  const d = dayMap.get(ymd)
                  const k = partTimeDayKind(d)
                  return { label: PART_TIME_DAY_LABEL[k], className: PART_TIME_DAY_STYLE[k] }
                }}
                legend={PART_TIME_LEGEND}
              />
            </div>

            <div className="rounded-lg border p-4">
              <PartTimeDayDetail
                ymd={selectedYmd}
                day={effectiveDay}
                thresholds={[]}
                actions={(shift) => {
                  if (!isPastOrToday) return null
                  return (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setShiftDialog({
                            open: true,
                            shift,
                          })
                        }
                        className="h-6 gap-1 px-2 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        Sửa giờ
                      </Button>
                      {shift.entry && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeletingEntryId(shift.entry!.id)}
                          className="h-6 px-1.5 text-xs text-destructive hover:text-destructive"
                          title="Bỏ sửa"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )
                }}
              />
            </div>

            {row.sheet && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-medium">Trao đổi & khiếu nại</h3>
                <FeedbackThread
                  sheetId={row.sheet.id}
                  mode="manager"
                  readOnly={row.sheet.status === 'confirmed'}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {shiftDialog.shift && (
        <ShiftHoursDialog
          user={{ id: row.user.id, name: row.user.name }}
          date={selectedYmd}
          shift={shiftDialog.shift}
          open={shiftDialog.open}
          onOpenChange={(open) =>
            setShiftDialog((prev) => ({ ...prev, open, shift: open ? prev.shift : null }))
          }
        />
      )}

      {row.sheet && (
        <OnlineTotalDialog
          sheetId={row.sheet.id}
          currentHours={row.sheet.onlineHours}
          open={onlineTotalOpen}
          onOpenChange={setOnlineTotalOpen}
        />
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        title="Bỏ nhập tổng giờ online?"
        description="Hệ thống sẽ tính lại số giờ online từ các ca theo ngày."
        confirmLabel="Bỏ nhập tổng"
        pending={clearTotal.isPending}
        onConfirm={handleClearTotal}
        onCancel={() => setConfirmClearOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deletingEntryId)}
        title="Bỏ sửa ca này?"
        description="Ca làm việc sẽ trở về trạng thái gốc từ máy chấm công."
        confirmLabel="Bỏ sửa"
        pending={deleteEntry.isPending}
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeletingEntryId(null)}
      />
    </>
  )
}
