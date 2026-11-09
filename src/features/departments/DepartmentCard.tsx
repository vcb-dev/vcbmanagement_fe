import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { hoursPerDay, timelineSegment, type Department } from './departments.types'

const AXIS = ['07:00', '10:00', '13:00', '16:00', '19:00']

function peopleLabel(d: Department) {
  const parts = [
    d.fullTimeCount > 0 && `${d.fullTimeCount} toàn thời gian`,
    d.partTimeCount > 0 && `${d.partTimeCount} part-time`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Chưa có nhân sự'
}

export function DepartmentCard({
  department: d,
  canEdit,
  onEdit,
  onDelete,
}: {
  department: Department
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const hours = hoursPerDay(d).toLocaleString('vi-VN')
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" title={d.name}>
            {d.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{peopleLabel(d)}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {hours} giờ / ngày
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Ca sáng</p>
          <p className="font-semibold text-sky-700 tabular-nums dark:text-sky-400">
            {d.morningStart} – {d.morningEnd}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Ca chiều</p>
          <p className="font-semibold text-violet-700 tabular-nums dark:text-violet-400">
            {d.afternoonStart} – {d.afternoonEnd}
          </p>
        </div>
      </div>

      <div aria-hidden="true">
        <div className="relative h-2 rounded-full bg-muted">
          <i className="absolute inset-y-0 rounded-full bg-sky-500" style={timelineSegment(d.morningStart, d.morningEnd)} />
          <i
            className="absolute inset-y-0 rounded-full bg-violet-500"
            style={timelineSegment(d.afternoonStart, d.afternoonEnd)}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
          {AXIS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Sửa
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 />
            Xoá
          </Button>
        </div>
      )}
    </Card>
  )
}
