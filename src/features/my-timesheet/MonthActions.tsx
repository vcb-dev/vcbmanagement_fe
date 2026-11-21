import { CalendarClock, CircleAlert, CircleCheck, Clock3, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DisputeDialog } from '@/features/part-time/DisputeDialog'
import { useConfirmSheet } from '@/features/part-time/use-part-time'
import { cn } from '@/lib/utils'
import { ConfirmTimesheetButton } from './ConfirmTimesheetButton'
import { attentionNote } from './day-ledger'
import { planOf, type Plan, type Tone } from './month-plan'
import type { MyTimesheet } from './my-timesheet.types'

/** Nút ở khối hành động: trên điện thoại cao 44px và chia đều hàng. */
const ACTION = 'h-11 flex-1 md:h-9 md:flex-none'

const TONE: Record<Tone, { box: string; icon: LucideIcon }> = {
  neutral: { box: 'bg-muted/70 text-foreground', icon: CalendarClock },
  live: { box: 'bg-muted/70 text-foreground', icon: Clock3 },
  ok: { box: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300', icon: CircleCheck },
  issue: { box: 'bg-rose-500/10 text-rose-800 dark:text-rose-300', icon: CircleAlert },
}

function DisputeButton({ sheetId, sheetType, label, className }: NonNullable<Plan['dispute']> & { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <DisputeDialog sheetId={sheetId} sheetType={sheetType} open={open} onOpenChange={setOpen} />
    </>
  )
}

function ConfirmPartTimeButton({ sheetId, attention, className }: { sheetId: string; attention: number; className?: string }) {
  const confirm = useConfirmSheet()
  const [asking, setAsking] = useState(false)
  return (
    <>
      <Button className={className} disabled={confirm.isPending} onClick={() => setAsking(true)}>
        <CircleCheck />
        Xác nhận công đúng
      </Button>
      <ConfirmDialog
        open={asking}
        title="Xác nhận bản chốt công?"
        description={`${attentionNote(attention)}Sau khi xác nhận, cần điều chỉnh thì bạn báo trực tiếp với quản lý.`}
        confirmLabel="Xác nhận"
        variant="default"
        pending={confirm.isPending}
        onConfirm={() => confirm.mutate(sheetId, { onSettled: () => setAsking(false) })}
        onCancel={() => setAsking(false)}
      />
    </>
  )
}

/**
 * Khối hành động ở chân thẻ tổng công: một câu trạng thái và đúng những nút dùng được lúc này.
 * Trong kỳ xác nhận, trên điện thoại khi hai nút này đã cuộn khuất thì hiện lại ở thanh dính sát đáy màn hình,
 * để bấm được bằng ngón cái mà không chiếm thêm chỗ lúc nút vẫn đang trong tầm nhìn.
 */
export function MonthActions({
  data,
  attention,
  onShowAttention,
}: {
  data: MyTimesheet
  attention: number
  onShowAttention: () => void
}) {
  const plan = planOf(data)
  const { box, icon: Icon } = TONE[plan.tone]
  const inlineRef = useRef<HTMLDivElement>(null)
  const [inlineVisible, setInlineVisible] = useState(true)

  useEffect(() => {
    const el = inlineRef.current
    if (!plan.confirm || !el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [plan.confirm])

  const buttons = (className: string): ReactNode => (
    <>
      {plan.dispute && <DisputeButton {...plan.dispute} className={className} />}
      {plan.confirm === 'full_time' && data.fullTime && data.confirmation && (
        <ConfirmTimesheetButton
          month={data.month}
          confirmation={data.confirmation}
          summary={data.fullTime}
          attention={attention}
          className={className}
        />
      )}
      {plan.confirm === 'part_time' && data.sheet && (
        <ConfirmPartTimeButton sheetId={data.sheet.id} attention={attention} className={className} />
      )}
    </>
  )

  return (
    <section aria-label="Xác nhận công tháng" className="space-y-3 border-t p-4">
      <div className={cn('flex items-start gap-2.5 rounded-lg px-3 py-2.5', box)}>
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-sm leading-5">
          <p className="font-medium">{plan.title}</p>
          {plan.body && <p className="opacity-80">{plan.body}</p>}
          {plan.confirm && attention > 0 && (
            <button
              type="button"
              onClick={onShowAttention}
              className="mt-0.5 inline-flex min-h-7 items-center text-left font-medium text-amber-800 underline underline-offset-2 hover:no-underline dark:text-amber-300 pointer-coarse:min-h-10"
            >
              Xem {attention} ngày cần chú ý trước khi xác nhận
            </button>
          )}
        </div>
      </div>
      {plan.outdated && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          Số liệu đã đổi sau khi chốt, chờ quản lý chốt lại.
        </p>
      )}

      {(plan.dispute || plan.confirm) && (
        <div ref={inlineRef} className="flex flex-wrap items-center justify-end gap-2">
          {buttons(ACTION)}
        </div>
      )}

      {plan.confirm && !inlineVisible && (
        <div
          className="fixed inset-x-0 z-30 flex gap-2 border-t bg-background px-3 py-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none md:hidden"
          style={{ bottom: 0, paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {buttons(ACTION)}
        </div>
      )}
    </section>
  )
}
