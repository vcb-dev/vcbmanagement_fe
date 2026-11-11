import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDepartments } from '@/features/departments/use-departments'
import { normalizeSearch, shiftYmd, todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  monthLabel,
  moveAnchor,
  rangeFor,
  recentMonths,
  weekLabel,
  weeksOfMonth,
  type GridMode,
} from './grid-range'
import { PartTimeGrid, PartTimeGridLegend } from './PartTimeGrid'
import type { PartTimeGridRow, PartTimeShiftView } from './part-time.types'
import { ShiftHoursDialog } from './ShiftHoursDialog'
import { usePartTimeGrid } from './use-part-time-admin'

const MODE_LABEL: Record<GridMode, string> = {
  week: 'Theo tuần',
  month: 'Theo tháng',
}

function getDatesInRange(from: string, to: string): string[] {
  const list: string[] = []
  let cur = from
  while (cur <= to) {
    list.push(cur)
    cur = shiftYmd(cur, 1)
  }
  return list
}

export function PartTimeGridTab() {
  const [mode, setMode] = useState<GridMode>('week')
  const [anchor, setAnchor] = useState<string>(() => todayYmd())
  const [search, setSearch] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all')
  const [editingCell, setEditingCell] = useState<{
    row: PartTimeGridRow
    date: string
    shift: PartTimeShiftView
  } | null>(null)

  const { data: departments } = useDepartments()

  const today = todayYmd()
  const anchorMonth = anchor.slice(0, 7)
  const range = useMemo(() => rangeFor(mode, anchor), [mode, anchor])
  const dates = useMemo(() => getDatesInRange(range.from, range.to), [range.from, range.to])
  const weeks = useMemo(() => weeksOfMonth(anchorMonth), [anchorMonth])
  const months = useMemo(
    () => recentMonths(today.slice(0, 7), anchorMonth),
    [today, anchorMonth],
  )

  const { data: rows = [], isLoading } = usePartTimeGrid(range.from, range.to)

  const isNextDisabled = rangeFor(mode, moveAnchor(mode, anchor, 1)).from > today

  const filteredRows = useMemo(() => {
    const q = normalizeSearch(search.trim())
    return rows.filter((r) => {
      const matchDept = selectedDeptId === 'all' || r.department?.id === selectedDeptId
      if (!matchDept) return false
      if (!q) return true
      return (
        normalizeSearch(r.user.name).includes(q) || normalizeSearch(r.user.email).includes(q)
      )
    })
  }, [rows, search, selectedDeptId])

  const handleModeChange = (next: GridMode) => {
    setMode(next)
    setAnchor(todayYmd())
  }

  // Tuần vắt tháng (vd 26/10 – 01/11) được chọn từ danh sách tháng 11: neo vào ngày 01
  // để danh sách vẫn là các tuần của tháng 11, nhãn không nhảy thành "Tuần 5" của tháng 10.
  const handleRangeSelect = (value: string) => {
    if (mode === 'month') {
      setAnchor(`${value}-01`)
      return
    }
    const monthFirst = `${anchorMonth}-01`
    setAnchor(value < monthFirst ? monthFirst : value)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Giờ ca lấy theo bộ phận (sáng, chiều và ca tối nếu bộ phận có): chỉ tính phần trong giờ
        ca, tối đa bằng độ dài ca. Ô quản lý đã sửa lấy đúng số giờ đã nhập, không tính đi muộn.
      </p>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4">
          <div role="tablist" aria-label="Kỳ xem" className="flex gap-6">
            {(Object.keys(MODE_LABEL) as GridMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  '-mb-px border-b-2 py-3 text-sm font-medium transition-colors',
                  mode === m
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="py-2">
            <PartTimeGridLegend />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm tên hoặc email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
            />
          </div>

          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Tất cả bộ phận" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bộ phận</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setAnchor((prev) => moveAnchor(mode, prev, -1))}
              aria-label={mode === 'week' ? 'Tuần trước' : 'Tháng trước'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select
              value={mode === 'week' ? range.from : anchorMonth}
              onValueChange={handleRangeSelect}
            >
              <SelectTrigger className="h-9 w-[190px]" aria-label="Chọn kỳ xem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mode === 'week'
                  ? weeks.map((w, i) => (
                      <SelectItem key={w.from} value={w.from} disabled={w.from > today}>
                        {weekLabel(i, w)}
                      </SelectItem>
                    ))
                  : months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {monthLabel(m)}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setAnchor((prev) => moveAnchor(mode, prev, 1))}
              disabled={isNextDisabled}
              aria-label={mode === 'week' ? 'Tuần sau' : 'Tháng sau'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center border-t py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Đang tải bảng chấm công...</span>
          </div>
        ) : (
          <PartTimeGrid
            key={`${range.from}_${range.to}`}
            rows={filteredRows}
            dates={dates}
            onEdit={(row, date, shift) => setEditingCell({ row, date, shift })}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Hiển thị {filteredRows.length} trên {rows.length} nhân viên
          </span>
          <span>Bấm ô để nhập hoặc sửa số giờ · di chuột để xem giờ vào / ra</span>
        </div>
      </div>

      {editingCell && (
        <ShiftHoursDialog
          user={{ id: editingCell.row.user.id, name: editingCell.row.user.name }}
          date={editingCell.date}
          shift={editingCell.shift}
          open={Boolean(editingCell)}
          onOpenChange={(open) => !open && setEditingCell(null)}
        />
      )}
    </div>
  )
}
