import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { attendanceRate, minutesText, rateText, type MonthDepartmentRow } from './overview.types'

/** Tỷ lệ đi làm thấp nhất lên đầu; bỏ bộ phận không ai có lịch làm (chỉ có part-time không có ca). */
function byRate(rows: MonthDepartmentRow[]): (MonthDepartmentRow & { rate: number })[] {
  return rows
    .flatMap((r) => {
      const rate = attendanceRate(r)
      return rate === null ? [] : [{ ...r, rate }]
    })
    .sort((a, b) => a.rate - b.rate || b.people - a.people)
}

/** Từng bộ phận trong tháng: tỷ lệ đi làm (có thanh), lượt nghỉ phép, lượt vắng không phép, số lần đi muộn. */
export function MonthDepartments({ rows, className }: { rows: MonthDepartmentRow[]; className?: string }) {
  return (
    <Card className={cn('min-w-0 gap-2 pb-1', className)}>
      <CardHeader>
        <CardTitle>Theo bộ phận</CardTitle>
        <CardDescription>Bộ phận có tỷ lệ đi làm thấp nhất ở trên. Lượt = một người trong một ngày.</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto px-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Bộ phận</TableHead>
              <TableHead className="text-right">Nhân sự</TableHead>
              <TableHead className="w-[34%] min-w-44">Tỷ lệ đi làm</TableHead>
              <TableHead className="text-right">Nghỉ phép</TableHead>
              <TableHead className="text-right">Vắng</TableHead>
              <TableHead className="text-right">Đi muộn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byRate(rows).map(({ rate, ...row }) => {
              return (
                <TableRow key={row.id ?? 'none'}>
                  <TableCell className={cn('max-w-48 truncate font-medium', row.id === null && 'font-normal text-muted-foreground')}>
                    {row.name}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{row.people}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${rate}%` }} />
                      </span>
                      <span className="w-12 text-right font-semibold tabular-nums">{rateText(rate)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.leave || <Zero />}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', row.absent > 0 && 'font-medium text-rose-700 dark:text-rose-400')}>
                    {row.absent || <Zero />}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" title={row.lateMinutes ? `Tổng ${minutesText(row.lateMinutes)}` : undefined}>
                    {row.lateShifts ? `${row.lateShifts} lần` : <Zero />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function Zero() {
  return <span className="text-muted-foreground/60">0</span>
}
