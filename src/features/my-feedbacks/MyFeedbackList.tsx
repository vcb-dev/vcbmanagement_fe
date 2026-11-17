import { ArrowRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatFeedbackTime } from '@/features/feedbacks/feedback-format'
import { FeedbackStatusBadge } from '@/features/feedbacks/FeedbackListPanel'
import type { FeedbackListItem } from '@/features/feedbacks/feedbacks.types'
import { formatMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MonthGroup {
  month: string
  items: FeedbackListItem[]
}

/** Nhóm feedback theo tháng công, tháng mới nhất trước; trong một tháng giữ thứ tự gửi (mới trước) của API. */
function groupByMonth(items: FeedbackListItem[]): MonthGroup[] {
  const groups = new Map<string, FeedbackListItem[]>()
  for (const item of items) {
    const list = groups.get(item.sheet.month) ?? []
    list.push(item)
    groups.set(item.sheet.month, list)
  }
  return [...groups.entries()]
    .map(([month, list]) => ({ month, items: list }))
    .sort((a, b) => b.month.localeCompare(a.month))
}

/**
 * Danh sách feedback của nhân viên, nhóm theo tháng công. Không hiện người gửi (đều là chính mình),
 * mỗi nhóm có lối về công tháng đó để đối chiếu số liệu.
 */
export function MyFeedbackList({
  items,
  selectedId,
  onSelect,
}: {
  items: FeedbackListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      {groupByMonth(items).map((group) => (
        <section key={group.month} className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-[13px] font-semibold">Công {formatMonth(group.month).toLowerCase()}</h3>
            <Link
              to={`/my-timesheet?month=${group.month}`}
              className="inline-flex items-center gap-0.5 rounded text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Xem công
              <ArrowRight className="size-3" />
            </Link>
          </div>
          {group.items.map((item) => {
            const selected = item.id === selectedId
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex w-full flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors',
                  'hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  selected ? 'border-primary bg-primary/5 shadow-xs dark:bg-primary/10' : 'border-border/80 bg-card',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <FeedbackStatusBadge status={item.status} />
                  <span className="text-[11px] text-muted-foreground tabular-nums">{formatFeedbackTime(item.createdAt)}</span>
                </span>
                <span
                  className={cn(
                    'line-clamp-2 text-[13px] leading-relaxed text-foreground/80',
                    item.status === 'open' && 'font-medium text-foreground',
                  )}
                >
                  {item.content}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    item.replyCount > 0 ? 'font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  <MessageSquare className="size-3" />
                  {item.replyCount > 0 ? `${item.replyCount} trả lời` : 'Chưa có trả lời'}
                </span>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
