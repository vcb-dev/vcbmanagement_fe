import { Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EmptyState } from './overview-parts'
import { absentLabel, departmentKey, pct, workSplit, type DepartmentRow } from './overview.types'

/**
 * Bộ phận đi làm ít nhất (trên số người có lịch) lên đầu; bằng nhau thì bộ phận đông người trước. Bỏ bộ phận không ai
 * có lịch làm (chỉ có part-time không có ca, hoặc Chủ nhật không ai đi làm).
 */
function byWorking(rows: DepartmentRow[]): DepartmentRow[] {
  const share = (r: DepartmentRow) => {
    const { working, scheduled } = workSplit(r)
    return working / scheduled
  }
  return rows.filter((r) => workSplit(r).scheduled > 0).sort((a, b) => share(a) - share(b) || b.total - a.total)
}

/**
 * Từng bộ phận trong ngày: đi làm trên số người có lịch và số người chưa chấm công / vắng. Bấm một bộ phận để lọc
 * danh sách người. Trên màn rộng thẻ cao bằng thẻ danh sách bên cạnh, phần danh sách tự cuộn.
 */
export function DepartmentList({
  rows,
  isToday,
  selected,
  onSelect,
}: {
  rows: DepartmentRow[]
  isToday: boolean
  /** Khoá bộ phận đang lọc (xem `departmentKey`), chuỗi rỗng là không lọc. */
  selected: string
  onSelect: (department: string) => void
}) {
  const sorted = byWorking(rows)
  return (
    <Card className="min-w-0 xl:[contain:size]">
      <CardHeader>
        <CardTitle>Theo bộ phận</CardTitle>
        <CardDescription>Đi làm trên số người có lịch, bộ phận thiếu người nhiều nhất ở trên.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {sorted.length === 0 && <EmptyState icon={Building2} title="Không bộ phận nào có lịch làm ngày này" />}
        <ul className="-mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-0.5">
          {sorted.map((row) => {
            const key = departmentKey(row)
            const isSelected = selected === key
            const { working, scheduled } = workSplit(row)
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? '' : key)}
                  title={isSelected ? 'Bỏ lọc bộ phận' : 'Lọc danh sách theo bộ phận này'}
                  aria-label={`${row.name}: ${working} trên ${scheduled} người đi làm, ${absentLabel(isToday).toLowerCase()} ${row.absent}`}
                  className={cn(
                    'w-full rounded-lg px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isSelected ? 'bg-accent ring-1 ring-primary/40' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn('min-w-0 flex-1 truncate font-medium', row.id === null && 'font-normal text-muted-foreground')}>
                      {row.name}
                    </span>
                    {row.absent > 0 && (
                      <span className="shrink-0 text-xs font-medium text-rose-700 dark:text-rose-400">
                        {row.absent} {isToday ? 'chưa chấm' : 'vắng'}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {working}/{scheduled}
                    </span>
                    <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{pct(working, scheduled)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-emerald-600"
                      style={{ width: `${scheduled > 0 ? (working / scheduled) * 100 : 0}%` }}
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
