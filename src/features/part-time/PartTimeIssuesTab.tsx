import { Eye, Loader2, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MonthNav } from '@/components/month-nav'
import { PaginationFooter } from '@/components/pagination-footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDayMonth, formatMonth, formatTime, todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CloseMonthButton } from './CloseMonthButton'
import {
  ISSUE_TYPE_LABEL,
  SHIFT_LABEL,
  type PartTimeIssue,
  type PartTimeIssueType,
} from './part-time.types'
import { ShiftHoursDialog } from './ShiftHoursDialog'
import { issueToShiftView, usePartTimeIssues } from './use-part-time-admin'

/** Thứ tự loại trong ô lọc. */
const ISSUE_TYPE_OPTIONS: readonly PartTimeIssueType[] = ['missing', 'late', 'early', 'disputed', 'outdated']

const ISSUE_BADGE_STYLE: Record<PartTimeIssueType, string> = {
  missing: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  early: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  disputed: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  outdated: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

export function PartTimeIssuesTab({
  month,
  onMonthChange,
  onOpenUser,
}: {
  month: string
  onMonthChange: (m: string) => void
  onOpenUser: (userId: string) => void
}) {
  const currentMonth = todayYmd().slice(0, 7)
  const [selectedType, setSelectedType] = useState<'all' | PartTimeIssueType>('all')
  const [editingIssue, setEditingIssue] = useState<PartTimeIssue | null>(null)
  // Giữ cùng một object để ShiftHoursDialog không reset ô đang nhập mỗi lần tab render lại.
  const editingShift = useMemo(
    () => (editingIssue ? issueToShiftView(editingIssue) : null),
    [editingIssue],
  )

  // Lọc loại và phân trang làm ở BE. Đổi tháng hoặc loại thì về trang 1.
  const filterKey = `${month}|${selectedType}`
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1

  const { data, isLoading } = usePartTimeIssues({
    month,
    type: selectedType === 'all' ? undefined : selectedType,
    page,
  })
  const issues = data?.items ?? []
  const counts = data?.counts

  const renderDetail = (issue: PartTimeIssue) => {
    switch (issue.type) {
      case 'missing':
        if (issue.inAt) return `Vào ${formatTime(issue.inAt)} · chưa có giờ ra`
        if (issue.outAt) return `Chưa có giờ vào · ra ${formatTime(issue.outAt)}`
        return 'Chưa có giờ chấm'
      case 'late':
        return `Vào ${formatTime(issue.inAt)} · muộn ${issue.lateMinutes} phút${
          issue.lateLevel ? ` (mức ${issue.lateLevel})` : ''
        }`
      case 'early':
        return `Ra ${formatTime(issue.outAt)} · về sớm ${issue.earlyMinutes} phút`
      case 'disputed':
        return issue.feedbackContent ?? 'Có khiếu nại'
      case 'outdated':
        return `Tạm tính ${issue.liveTotalHours}h · đã chốt ${issue.sheetTotalHours}h`
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav month={month} max={currentMonth} onChange={onMonthChange} />
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as 'all' | PartTimeIssueType)}
          >
            <SelectTrigger className="h-9 w-48 text-xs">
              <SelectValue placeholder="Tất cả các loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Tất cả các loại{counts ? ` (${counts.all})` : ''}
              </SelectItem>
              {ISSUE_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {ISSUE_TYPE_LABEL[type]}
                  {counts ? ` (${counts[type]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          {data?.total ?? 0} việc cần đối soát
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Đang tải danh sách đối soát...</span>
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Không có việc cần đối soát trong tháng {formatMonth(month)}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5">Loại</th>
                <th className="px-4 py-2.5">Nhân viên</th>
                <th className="px-4 py-2.5">Bộ phận</th>
                <th className="px-4 py-2.5">Ngày</th>
                <th className="px-4 py-2.5">Buổi</th>
                <th className="px-4 py-2.5">Chi tiết</th>
                <th className="px-4 py-2.5 text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, idx) => (
                <tr
                  key={`${issue.type}-${issue.user.id}-${issue.date ?? idx}-${issue.shift ?? ''}`}
                  className="border-b hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-medium', ISSUE_BADGE_STYLE[issue.type])}
                    >
                      {ISSUE_TYPE_LABEL[issue.type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{issue.user.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {issue.department?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                    {issue.date ? formatDayMonth(issue.date) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {issue.shift ? SHIFT_LABEL[issue.shift] : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">{renderDetail(issue)}</td>
                  <td className="px-4 py-3 text-right">
                    {issue.type === 'missing' || issue.type === 'late' || issue.type === 'early' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingIssue(issue)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa giờ
                      </Button>
                    ) : issue.type === 'disputed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenUser(issue.user.id)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </Button>
                    ) : issue.type === 'outdated' ? (
                      <CloseMonthButton
                        month={month}
                        label="Chốt lại"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (
        <PaginationFooter
          data={data}
          unit="việc"
          onPageChange={(p) => setPaging({ key: filterKey, page: p })}
        />
      )}

      {editingIssue && editingIssue.date && editingShift && (
        <ShiftHoursDialog
          user={editingIssue.user}
          date={editingIssue.date}
          shift={editingShift}
          open={Boolean(editingIssue)}
          onOpenChange={(open) => !open && setEditingIssue(null)}
        />
      )}
    </div>
  )
}
