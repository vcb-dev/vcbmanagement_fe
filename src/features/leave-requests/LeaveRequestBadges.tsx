import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUS_STYLE, TYPE_META } from './leave-request-format'
import type { LeaveRequestStatus, LeaveRequestType } from './leave-requests.types'

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <Badge variant="outline" className={cn('font-normal', STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

/** Ô biểu tượng màu theo hình thức đơn. */
export function LeaveTypeIcon({ type, className }: { type: LeaveRequestType; className?: string }) {
  const meta = TYPE_META[type]
  return (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', meta.tone, className)} aria-hidden>
      <meta.icon className="size-4" />
    </span>
  )
}
