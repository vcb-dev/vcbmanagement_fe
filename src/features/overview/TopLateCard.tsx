import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { EmptyState } from './overview-parts'
import { minutesText, type TopLate } from './overview.types'

/** 5 người đi muộn nhiều phút nhất tháng, mỗi người một thanh dài theo số phút so với người đứng đầu. */
export function TopLateCard({ items, className }: { items: TopLate[]; className?: string }) {
  const top = items[0]?.lateMinutes ?? 0
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>Đi muộn nhiều nhất</CardTitle>
        <CardDescription>Theo tổng số phút trong tháng</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="-mr-2 text-primary hover:text-primary">
            <Link to="/late">
              Xem tất cả
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Không ai đi muộn" />
        ) : (
          <ol>
            {items.map((t, i) => (
              <li key={t.person.id} className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 py-2">
                <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{displayName(t.person)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.person.department?.name ?? 'Chưa có bộ phận'}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">{minutesText(t.lateMinutes)}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{t.lateCount} lần</span>
                </span>
                <span className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-amber-600/15" aria-hidden>
                  <span className="block h-full rounded-r-full bg-amber-600" style={{ width: `${top > 0 ? (t.lateMinutes / top) * 100 : 0}%` }} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
