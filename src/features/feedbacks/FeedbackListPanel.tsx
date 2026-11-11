import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FEEDBACK_STATUS_LABEL } from '@/features/part-time/part-time.types'
import { EMPLOYMENT_LABEL, initials } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { formatFeedbackTime, sheetLabel } from './feedback-format'
import type { FeedbackListItem, FeedbackStatus } from './feedbacks.types'

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const styles: Record<FeedbackStatus, string> = {
    open: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    in_progress:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    resolved:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  }
  return (
    <Badge variant="outline" className={cn('font-normal', styles[status])}>
      {FEEDBACK_STATUS_LABEL[status]}
    </Badge>
  )
}

interface FeedbackListPanelProps {
  items: FeedbackListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

export function FeedbackListPanel({
  items,
  selectedId,
  onSelect,
  isLoading,
}: FeedbackListPanelProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Đang tải danh sách...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-8 text-center">
        <MessageSquare className="size-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium text-foreground">Không có feedback phù hợp</p>
        <p className="text-xs text-muted-foreground mt-1">
          Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isSelected = selectedId === item.id
        const isOpen = item.status === 'open'
        const dept = item.user.departmentName ?? 'Chưa có bộ phận'
        const emp = item.user.employmentType
          ? EMPLOYMENT_LABEL[item.user.employmentType]
          : 'Chưa phân loại'
        const avatarLetters = initials({ fullName: item.user.name, email: item.user.name })

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all',
              'hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary/5 shadow-xs dark:bg-primary/10'
                : 'border-border/80 bg-card',
            )}
          >
            {/* Top row: Author & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {avatarLetters}
                </span>
                <div className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-sm leading-tight',
                      isOpen ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
                    )}
                  >
                    {item.user.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {dept} · {emp}
                  </span>
                </div>
              </div>
              <FeedbackStatusBadge status={item.status} />
            </div>

            {/* Middle: Content snippet */}
            <p
              className={cn(
                'line-clamp-2 text-xs leading-relaxed text-foreground/80',
                isOpen && 'font-medium text-foreground',
              )}
            >
              {item.content}
            </p>

            {/* Bottom row: Sheet label, replies count & date */}
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
              <span className="truncate max-w-[200px] font-medium text-foreground/70">
                {sheetLabel(item.sheet)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {item.replyCount > 0 && (
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <MessageSquare className="size-3" />
                    {item.replyCount} trả lời
                  </span>
                )}
                <span>{formatFeedbackTime(item.createdAt)}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

