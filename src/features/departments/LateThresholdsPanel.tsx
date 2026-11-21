import { AlarmClock, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
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
        {/* Ghim hàng cho từng phần: nút "Thêm mốc" đã ghim chỗ nên phần còn lại không tự rơi sang cột của nút. */}
        <CardTitle className="col-start-1 row-start-1">Mốc đi muộn</CardTitle>
        <CardDescription className="col-start-1 row-start-2">
          Xếp lần đi muộn theo số phút muộn. Đổi mốc áp dụng từ tháng này, các tháng trước giữ nguyên.
        </CardDescription>
        <details className="group col-start-1 row-start-3 text-sm">
          <summary className="inline-flex min-h-7 cursor-pointer list-none items-center gap-1 rounded-sm font-medium text-foreground/80 outline-none select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:min-h-10 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Mỗi người dùng bộ mốc nào?
          </summary>
          <div className="mt-1 w-fit max-w-full rounded-lg bg-muted/60 px-3 py-2.5 pr-6 text-muted-foreground">
            <p>Bộ mốc khớp cụ thể nhất, xét lần lượt:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>Đúng bộ phận và loại nhân sự</li>
              <li>Chỉ bộ phận</li>
              <li>Chỉ loại nhân sự</li>
              <li>Bộ mốc chung</li>
            </ol>
          </div>
        </details>
        {canEdit && (
          // Điện thoại: nút xuống cuối phần đầu thẻ và rộng hết hàng; từ sm trở lên về góc phải như thẻ khác.
          <CardAction className="col-start-1 row-start-4 mt-2 justify-self-stretch sm:col-start-2 sm:mt-0 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
            <Button size="sm" className="w-full sm:w-auto pointer-coarse:h-10" onClick={() => setForm({ threshold: null })}>
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
                        className="shrink-0 pointer-coarse:h-10"
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
                              className="pointer-coarse:size-10"
                              onClick={() => setForm({ threshold: row })}
                              aria-label={`Sửa mốc ${row.thresholdMinutes} phút của ${targetLabel(group)}`}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive pointer-coarse:size-10"
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
                      <span className="flex-1 tabular-nums">
                        Muộn {lateLevelRange(thresholds.length + 1, thresholds)}
                        {/* Điện thoại: chú thích xuống dòng dưới, không chen ngang làm số phút bị ngắt dòng. */}
                        <span className="block text-xs text-muted-foreground sm:hidden">Tự động, theo mốc lớn nhất</span>
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">Tự động, theo mốc lớn nhất</span>
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
