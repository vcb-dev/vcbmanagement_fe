import { CalendarPlus, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AnnualLeaveRow } from '@/features/annual-leaves/annual-leaves.types'
import { AddLeaveRowDialog } from '@/features/annual-leaves/AddLeaveRowDialog'
import { AnnualLeaveTable } from '@/features/annual-leaves/AnnualLeaveTable'
import { LeaveEditSheet } from '@/features/annual-leaves/LeaveEditSheet'
import {
  filterLeaveRows,
  hasLeaveThisYear,
  isLowOnLeave,
  sortLeaveRows,
  type LeaveFilter,
  type LeaveSort,
} from '@/features/annual-leaves/leave-table'
import { RecordLeaveDialog } from '@/features/annual-leaves/RecordLeaveDialog'
import {
  useAnnualLeaves,
  useDeleteLeaveRow,
} from '@/features/annual-leaves/use-annual-leaves'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'

export function AnnualLeavesPage() {
  const currentYear = useMemo(() => Number(todayYmd().slice(0, 4)), [])
  const [year, setYear] = useState<number>(currentYear)
  const [filter, setFilter] = useState<LeaveFilter>('all')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<LeaveSort>('added')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [recordRowId, setRecordRowId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<AnnualLeaveRow | null>(null)
  const [deletingRow, setDeletingRow] = useState<AnnualLeaveRow | null>(null)

  const { data: rows = [], isLoading } = useAnnualLeaves(year)
  const deleteMutation = useDeleteLeaveRow()

  const recordableRows = useMemo(() => rows.filter(hasLeaveThisYear), [rows])

  const tabCounts = useMemo(() => {
    let low = 0
    let none = 0
    let nocontract = 0
    for (const r of rows) {
      if (isLowOnLeave(r)) low++
      if (r.usedDays === 0) none++
      if (r.user.contractStartDate === null) nocontract++
    }
    return {
      all: rows.length,
      low,
      none,
      nocontract,
    }
  }, [rows])

  const displayedRows = useMemo(() => {
    const filtered = filterLeaveRows(rows, filter, search)
    return sortLeaveRows(filtered, sort)
  }, [rows, filter, search, sort])

  const yearOptions = useMemo(() => {
    const options: number[] = []
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      options.push(y)
    }
    return options
  }, [currentYear])

  const handleOpenRecordTop = () => {
    if (rows.length === 0) {
      toast('Chưa có dòng phép năm nào. Hãy thêm trước.')
      return
    }
    if (recordableRows.length === 0) {
      toast(`Chưa có nhân sự nào có phép năm ${year}.`)
      return
    }
    setRecordRowId(null)
    setRecordDialogOpen(true)
  }

  const handleRecordRow = (row: AnnualLeaveRow) => {
    setRecordRowId(row.id)
    setRecordDialogOpen(true)
  }

  const handleEditRow = (row: AnnualLeaveRow) => {
    setEditingRow(row)
  }

  const handleDeleteRow = (row: AnnualLeaveRow) => {
    setDeletingRow(row)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRow) return
    try {
      await deleteMutation.mutateAsync(deletingRow.id)
      setDeletingRow(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
      setDeletingRow(null)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Phép năm ${year}`}
        description="Mỗi người một dòng phép năm: số ngày được hưởng và số ngày nghỉ từng tháng. Số còn lại hệ thống tự tính. Tháng trước ngày ký hợp đồng hiện sọc chéo; chưa có ngày ký hợp đồng thì chưa có phép. Chỉ áp dụng cho nhân sự toàn thời gian."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={String(year)}
              onValueChange={(val) => setYear(Number(val))}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleOpenRecordTop}
            >
              <CalendarPlus className="size-4" />
              <span>Ghi nhận nghỉ phép</span>
            </Button>

            <Button
              className="gap-1.5"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="size-4" />
              <span>Thêm dòng phép</span>
            </Button>
          </div>
        }
      />

      {/* Bộ lọc và Tìm kiếm */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter(val as LeaveFilter)}
          className="w-full lg:w-auto"
        >
          <TabsList className="grid grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="all">Tất cả ({tabCounts.all})</TabsTrigger>
            <TabsTrigger value="low">Sắp hết phép ({tabCounts.low})</TabsTrigger>
            <TabsTrigger value="none">Chưa nghỉ ngày nào ({tabCounts.none})</TabsTrigger>
            <TabsTrigger value="nocontract">Chưa có ngày ký HĐ ({tabCounts.nocontract})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên nhân sự..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select
            value={sort}
            onValueChange={(val) => setSort(val as LeaveSort)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="added">Theo thứ tự thêm</SelectItem>
              <SelectItem value="name">Tên A → Z</SelectItem>
              <SelectItem value="remain">Còn lại ít nhất</SelectItem>
              <SelectItem value="used">Đã dùng nhiều nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bảng dữ liệu hoặc Trạng thái trống */}
      {isLoading ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Đang tải phép năm {year}...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Chưa có dòng phép năm {year}. Bấm "Thêm dòng phép" để bắt đầu.</p>
        </div>
      ) : displayedRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Không có nhân sự phù hợp</p>
        </div>
      ) : (
        <AnnualLeaveTable
          rows={displayedRows}
          year={year}
          onEdit={handleEditRow}
          onRecord={handleRecordRow}
          onDelete={handleDeleteRow}
        />
      )}

      {/* Dialog Thêm dòng phép */}
      <AddLeaveRowDialog
        year={year}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Dialog Ghi nhận nghỉ phép */}
      <RecordLeaveDialog
        rows={recordableRows}
        year={year}
        initialRowId={recordRowId}
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
      />

      {/* Drawer Chỉnh sửa phép */}
      <LeaveEditSheet
        row={editingRow}
        year={year}
        open={editingRow !== null}
        onOpenChange={(open) => !open && setEditingRow(null)}
      />

      {/* Hộp xác nhận xóa */}
      {deletingRow && (
        <ConfirmDialog
          open={deletingRow !== null}
          title={`Xóa dòng phép năm ${year}?`}
          description={`Dòng phép năm của ${deletingRow.user.name} và số ngày nghỉ các tháng sẽ bị xóa.`}
          confirmLabel="Xóa"
          pending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingRow(null)}
        />
      )}
    </PageContainer>
  )
}
