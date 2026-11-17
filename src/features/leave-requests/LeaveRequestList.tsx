import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LeaveStatusBadge, LeaveTypeIcon } from './LeaveRequestBadges'
import { TYPE_META, durationLabel, startLabel } from './leave-request-format'
import type { LeaveRequest } from './leave-requests.types'

/**
 * Danh sách đơn dạng thẻ, bấm để xem chi tiết. `showUser` hiện người gửi (màn duyệt);
 * màn của nhân sự thì ẩn vì đều là đơn của chính mình.
 */
export function LeaveRequestList({
  items,
  selectedId,
  onSelect,
  showUser = false,
}: {
  items: LeaveRequest[]
  selectedId: string | null
  onSelect: (id: string) => void
  showUser?: boolean
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full gap-3 rounded-xl border p-3.5 text-left transition-colors',
                'hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected ? 'border-primary bg-primary/5 shadow-xs dark:bg-primary/10' : 'border-border/80 bg-card',
              )}
            >
              <LeaveTypeIcon type={item.type} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {showUser ? item.user.name : TYPE_META[item.type].label}
                    </span>
                    {showUser && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {TYPE_META[item.type].label}
                        {item.user.department ? ` · ${item.user.department.name}` : ''}
                      </span>
                    )}
                  </span>
                  <LeaveStatusBadge status={item.status} />
                </span>
                <span className="text-xs text-foreground/80 tabular-nums">
                  {startLabel(item)} · {durationLabel(item)}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{item.reason}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  Gửi {formatDateTime(item.createdAt)}
                  {item.approver ? ` · Người duyệt: ${item.approver.name}` : ''}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
