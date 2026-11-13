import { AlarmClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-client'
import { lateLevelRange, lateLevelTone } from '@/lib/late-levels'
import { EMPLOYMENT_LABEL } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import type { Department, LateThreshold } from './departments.types'
import { LateThresholdFormDialog, type ThresholdTarget } from './LateThresholdFormDialog'
import { useDeleteLateThreshold, useLateThresholds } from './use-departments'

interface ThresholdGroup extends ThresholdTarget {
  key: string
  departmentName: string | null
  rows: LateThreshold[]
}

/** Gom các mốc theo đối tượng, giữ thứ tự API trả về (bộ mốc chung trước, số phút tăng dần). */
function groupByTarget(rows: LateThreshold[]): ThresholdGroup[] {
  const groups = new Map<string, ThresholdGroup>()
  for (const row of rows) {
    const key = `${row.departmentId ?? ''}|${row.employmentType ?? ''}`
    const group = groups.get(key)
    if (group) group.rows.push(row)
    else {
      groups.set(key, {
        key,
        departmentId: row.departmentId,
        departmentName: row.departmentName,
        employmentType: row.employmentType,
        rows: [row],
      })
    }
  }
  return [...groups.values()]
}

function targetLabel(t: Pick<ThresholdGroup, 'departmentName' | 'employmentType'>) {
  const department = t.departmentName ?? 'Mọi bộ phận'
  const type = t.employmentType ? EMPLOYMENT_LABEL[t.employmentType] : 'mọi loại nhân sự'
  return `${department} · ${type}`
}

function LevelBadge({ level, thresholds }: { level: number; thresholds: readonly number[] }) {
  return (
    <Badge variant="secondary" className={cn('w-16 justify-center tabular-nums', lateLevelTone(level, thresholds))}>
      Mốc {level}
    </Badge>
  )
}

export function LateThresholdsPanel({ departments, canEdit }: { departments: Department[]; canEdit: boolean }) {
  const { data, isPending, isError, error, refetch } = useLateThresholds()
  const remove = useDeleteLateThreshold()
  /** `undefined` = đóng; `threshold: null` = thêm mới, có thể điền sẵn đối tượng. */
  const [form, setForm] = useState<{ threshold: LateThreshold | null; target?: ThresholdTarget }>()
  const [deleting, setDeleting] = useState<LateThreshold | null>(null)
  const groups = useMemo(() => groupByTarget(data ?? []), [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mốc đi muộn</CardTitle>
        <CardDescription>
          Vào ca sau giờ vào ca là tính đi muộn, các mốc dùng để xếp lần đi muộn đó theo số phút muộn. Mỗi người dùng bộ mốc của
          đối tượng khớp cụ thể nhất: bộ phận và loại nhân sự, rồi chỉ bộ phận, chỉ loại nhân sự, cuối cùng là bộ mốc chung. Đổi
          mốc có hiệu lực từ tháng hiện tại, các tháng trước giữ nguyên.
        </CardDescription>
        {canEdit && (
          <CardAction>
            <Button size="sm" onClick={() => setForm({ threshold: null })}>
              <Plus />
              Thêm mốc
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {getApiErrorMessage(error)}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Thử lại
            </button>
          </p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlarmClock className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Chưa có mốc đi muộn nào</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Khi chưa có mốc, đi muộn vẫn được ghi nhận số phút nhưng chưa xếp vào mốc nào.
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.map((group) => {
              const thresholds = group.rows.map((r) => r.thresholdMinutes)
              return (
                <section key={group.key} className="overflow-hidden rounded-lg border">
                  <header className="flex items-center justify-between gap-3 border-b bg-muted/40 py-1 pr-1 pl-3">
                    <h3 className="min-w-0 truncate text-sm font-medium" title={targetLabel(group)}>
                      {targetLabel(group)}
                    </h3>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        aria-label={`Thêm mốc cho ${targetLabel(group)}`}
                        onClick={() =>
                          setForm({
                            threshold: null,
                            target: { departmentId: group.departmentId, employmentType: group.employmentType },
                          })
                        }
                      >
                        <Plus />
                        Thêm mốc
                      </Button>
                    )}
                  </header>
                  <ul className="divide-y">
                    {group.rows.map((row, i) => (
                      <li key={row.id} className="flex min-h-10 items-center gap-3 py-1 pr-1 pl-3 text-sm">
                        <LevelBadge level={i + 1} thresholds={thresholds} />
                        <span className="flex-1 tabular-nums">Muộn {lateLevelRange(i + 1, thresholds)}</span>
                        {canEdit && (
                          <span className="flex shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setForm({ threshold: row })}
                              aria-label={`Sửa mốc ${row.thresholdMinutes} phút của ${targetLabel(group)}`}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(row)}
                              aria-label={`Xoá mốc ${row.thresholdMinutes} phút của ${targetLabel(group)}`}
                            >
                              <Trash2 />
                            </Button>
                          </span>
                        )}
                      </li>
                    ))}
                    <li className="flex min-h-10 items-center gap-3 py-1 pr-3 pl-3 text-sm">
                      <LevelBadge level={thresholds.length + 1} thresholds={thresholds} />
                      <span className="flex-1 tabular-nums">Muộn {lateLevelRange(thresholds.length + 1, thresholds)}</span>
                      <span className="text-xs text-muted-foreground">Tự động, theo mốc lớn nhất</span>
                    </li>
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </CardContent>

      {form && (
        <LateThresholdFormDialog
          key={form.threshold?.id ?? 'new'}
          threshold={form.threshold}
          target={form.target}
          departments={departments}
          onClose={() => setForm(undefined)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Xoá mốc đi muộn?"
        description={
          deleting
            ? `Mốc ${deleting.thresholdMinutes} phút của ${targetLabel(deleting)} sẽ bị xoá từ tháng này: các lần đi muộn trong tháng được xếp theo những mốc còn lại, các tháng trước giữ nguyên.`
            : ''
        }
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
      />
    </Card>
  )
}
