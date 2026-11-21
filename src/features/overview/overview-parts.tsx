import { ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LeaveStatusBadge } from '@/features/leave-requests/LeaveRequestBadges'
import { displayName, initials } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { COLOR, type ColorKey, type OverviewPerson } from './overview.types'

export function Dot({ color, className }: { color: ColorKey; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', COLOR[color], className)} aria-hidden />
}

export interface Stat {
  key: string
  label: string
  color: ColorKey
  value: ReactNode
  /** Chữ nhỏ cạnh số: "/ 48", "lượt", "đơn". */
  unit?: ReactNode
  note?: ReactNode
  /** Giải thích cách tính, hiện khi rê chuột. */
  hint?: string
  /** Bấm để mở danh sách người tương ứng. */
  onClick?: () => void
}

/**
 * Hàng thẻ số chính của một tab: nhãn có chấm màu, số lớn, một dòng giải thích. Thẻ có `onClick` thì cả thẻ bấm được
 * (nút phủ kín thẻ); link trong dòng giải thích (vd "2 đơn chờ duyệt") nằm trên nút đó nên bấm được riêng.
 */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((s, i) => {
        const head = (
          <>
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Dot color={s.color} />
              {s.label}
              {s.onClick && (
                <ChevronRight
                  className="ml-auto size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  aria-hidden
                />
              )}
            </span>
            <span className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{s.value}</span>
              {s.unit && <span className="text-sm text-muted-foreground">{s.unit}</span>}
            </span>
          </>
        )
        return (
          <div
            key={s.key}
            title={s.hint}
            className={cn(
              'group relative flex min-w-0 flex-col rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10',
              s.onClick && 'transition-colors hover:bg-muted/50',
              i === 0 && 'col-span-2 lg:col-span-1',
            )}
          >
            {s.onClick ? (
              <button
                type="button"
                onClick={s.onClick}
                className="flex flex-col text-left before:absolute before:inset-0 before:rounded-xl focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
              >
                {head}
              </button>
            ) : (
              head
            )}
            {s.note && (
              <span className="pointer-events-none relative mt-2 block text-xs text-muted-foreground [&_a]:pointer-events-auto">
                {s.note}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Link "N đơn chờ duyệt →" (màu cam) sang trang Duyệt đơn xin phép. */
export function PendingLink({ count, to }: { count: number; to: string }) {
  return (
    <Link
      to={to}
      title="Mở trang Duyệt đơn xin phép"
      className="inline-flex items-center gap-0.5 rounded-sm font-medium text-amber-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-amber-400"
    >
      {count} đơn chờ duyệt
      <ArrowRight className="size-3" aria-hidden />
    </Link>
  )
}

/** "2 đơn chờ duyệt →" (link sang trang duyệt), "Đã duyệt hết", "Không có đơn". */
export function RequestNote({ total, pending, to }: { total: number; pending: number; to: string }) {
  if (total === 0) return <>Không có đơn</>
  if (pending === 0) return <>Đã duyệt hết</>
  return <PendingLink count={pending} to={to} />
}

/** Nhãn "Chờ duyệt" của một đơn, bấm để mở đúng đơn đó ở trang Duyệt đơn xin phép. */
export function PendingBadgeLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      title="Mở đơn này ở trang Duyệt đơn xin phép"
      className="group/badge inline-flex items-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <LeaveStatusBadge status="pending" />
      <ArrowRight
        className="size-3.5 text-muted-foreground transition-transform group-hover/badge:translate-x-0.5 group-hover/badge:text-foreground"
        aria-hidden
      />
    </Link>
  )
}

/** Chữ viết tắt tên trong vòng tròn + họ tên + bộ phận. */
export function PersonCell({ person, className }: { person: OverviewPerson; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
        aria-hidden
      >
        {initials(person)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{displayName(person)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {person.department?.name ?? 'Chưa có bộ phận'}
          {person.employmentType === 'part_time' && ' · Part-time'}
        </p>
      </div>
    </div>
  )
}

/** Trạng thái trống có biểu tượng, tiêu đề và một dòng giải thích. */
export function EmptyState({ icon: Icon, title, note }: { icon: LucideIcon; title: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Icon className="size-7 text-muted-foreground/60" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {note && <p className="max-w-72 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
