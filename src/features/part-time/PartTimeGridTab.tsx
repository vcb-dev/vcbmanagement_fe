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
import { moveAnchor, rangeFor, rangeLabel, type GridMode } from './grid-range'
import { PartTimeGrid } from './PartTimeGrid'
import type { PartTimeGridRow, PartTimeShiftView } from './part-time.types'
import { ShiftHoursDialog } from './ShiftHoursDialog'
import { usePartTimeGrid } from './use-part-time-admin'

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

  const range = useMemo(() => rangeFor(mode, anchor), [mode, anchor])
  const dates = useMemo(() => getDatesInRange(range.from, range.to), [range.from, range.to])

  const { data: rows = [], isLoading } = usePartTimeGrid(range.from, range.to)

  const isNextDisabled = useMemo(() => {
    const nextRange = rangeFor(mode, moveAnchor(mode, anchor, 1))
    return nextRange.from > todayYmd()
  }, [mode, anchor])

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

  const handlePrev = () => setAnchor((prev) => moveAnchor(mode, prev, -1))
  const handleNext = () => {
    if (!isNextDisabled) {
      setAnchor((prev) => moveAnchor(mode, prev, 1))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode('week')
                setAnchor(todayYmd())
              }}
              className={`rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'week'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('month')
                setAnchor(todayYmd())
              }}
              className={`rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'month'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrev}
              title="Lùi lại"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[170px] text-center text-sm font-semibold">
              {rangeLabel(mode, range)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNext}
              disabled={isNextDisabled}
              title="Tiến tới"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="h-9 w-44 text-xs">
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
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Giờ ca lấy theo bộ phận (sáng, chiều và ca tối nếu bộ phận có): chỉ tính phần trong giờ
        ca, tối đa bằng độ dài ca. Ô quản lý đã sửa lấy đúng số giờ đã nhập, không tính đi muộn.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Đang tải bảng chấm công...</span>
        </div>
      ) : (
        <PartTimeGrid
          rows={filteredRows}
          dates={dates}
          onEdit={(row, date, shift) => setEditingCell({ row, date, shift })}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Hiển thị {filteredRows.length} trên {rows.length} nhân viên
        </span>
        <span>Bấm ô để nhập hoặc sửa số giờ</span>
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
