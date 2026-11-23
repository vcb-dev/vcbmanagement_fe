import { ChevronRight, Info } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { formatDayMonth, formatDuration, todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isSunday, needsAttention, type LedgerDay } from './day-ledger'
import type { LedgerFilter } from './DayLedger'
import { daysOfMonth } from './day-status'
import { MonthActions } from './MonthActions'
import { planOf, type BadgeTone } from './month-plan'
import type { MyTimesheet } from './my-timesheet.types'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Màu nhãn trạng thái; chữ đậm hơn một bậc để đạt 4,5:1 trên nền nhạt. */
const BADGE_TONE: Record<BadgeTone, string> = {
  ok: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  issue: 'bg-rose-500/10 text-rose-800 dark:text-rose-300',
  wait: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  neutral: 'bg-muted text-foreground/80',
}

const HOW_TO_FULL =
  'Công máy tính theo chấm công: ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công, quên một mốc vẫn được tính. Làm online, lễ, bù, phép và tăng ca do quản lý nhập.'
const HOW_TO_PART = 'Chỉ tính phần giờ nằm trong ca. Giờ online được cập nhật khi chốt công.'

/**
 * Biểu tượng (i) kèm chú thích. Rê chuột để xem; trên màn cảm ứng không có rê chuột nên chạm để mở, chạm ra ngoài để đóng.
 * Vùng bấm nới rộng bằng ::after để đủ lớn cho ngón tay mà biểu tượng vẫn nhỏ.
 */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="relative shrink-0 rounded-full text-muted-foreground after:absolute after:-inset-3 hover:text-foreground"
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          <Info className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{children}</TooltipContent>
    </Tooltip>
  )
}

interface Part {
  label: string
  value: number
  color: string
}

/** Số công chuẩn tính tới hôm nay (ngày đã qua trừ Chủ nhật), chỉ có ở tháng đang chạy. */
function standardSoFar(month: string): number | undefined {
  const today = todayYmd()
  if (month !== today.slice(0, 7)) return undefined
  return daysOfMonth(month).filter((d) => d <= today && !isSunday(d)).length
}

/**
 * Con số chính của trang: tổng công (hoặc tổng giờ với part-time), thanh chia theo phần và câu so với công chuẩn.
 * Tháng đang chạy có vạch "chuẩn đến hôm nay" trên thanh; câu bên dưới nói cùng điều đó bằng chữ.
 */
function Total({ total, target, soFar, unit, parts }: { total: number; target?: number; soFar?: number; unit: string; parts: Part[] }) {
  const scale = Math.max(target ?? 0, total)
  const marker = soFar != null && target && soFar < target ? (soFar / scale) * 100 : null
  const shown = parts.filter((p) => p.value > 0)
  const compareTo = soFar ?? target
  const gap = compareTo != null ? Math.round((compareTo - total) * 100) / 100 : null

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-4xl leading-none font-semibold tracking-tight">{num(total)}</span>
        <span className="text-sm text-muted-foreground">{target ? `/ ${num(target)} ${unit}` : unit}</span>
      </p>

      <div className="relative" aria-hidden="true">
        <div className="flex h-2 gap-px overflow-hidden rounded-full bg-foreground/10">
          {scale > 0 && shown.map((p) => <i key={p.label} className={p.color} style={{ width: `${(p.value / scale) * 100}%` }} />)}
        </div>
        {marker != null && <i className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground" style={{ left: `${marker}%` }} />}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {(shown.length ? shown : parts.slice(0, 1)).map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
            <i className={cn('size-2 rounded-[2px]', p.color)} aria-hidden="true" />
            {p.label}
            <b className="font-semibold text-foreground tabular-nums">{num(p.value)}</b>
          </span>
        ))}
      </div>

      {gap != null && (
        <p className="flex items-start gap-1.5 text-[13px] leading-5 text-muted-foreground">
          {marker != null && <i className="mt-1 h-3 w-0.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />}
          <span>
            {soFar != null ? (
              <>
                Chuẩn đến hôm nay là <b className="font-semibold text-foreground tabular-nums">{num(soFar)}</b> công
                {gap > 0 ? (
                  <>
                    , bạn còn cách <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công.
                  </>
                ) : (
                  ', bạn đã đủ.'
                )}
              </>
            ) : gap > 0 ? (
              <>
                Còn <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công so với {num(target!)} công chuẩn.
              </>
            ) : (
              `Đã đủ ${num(target!)} công chuẩn của tháng.`
            )}
          </span>
        </p>
      )}
    </div>
  )
}

/** Một chỉ số nhỏ dưới con số chính. Có `onShow` thì cả ô là nút, bấm để lọc danh sách ngày tương ứng. */
function Stat({
  label,
  value,
  unit,
  sub,
  tone,
  onShow,
  showLabel,
}: {
  label: string
  value: string
  unit?: string
  sub: string
  tone?: string
  onShow?: () => void
  /** Tên đầy đủ của nút cho trình đọc màn hình. */
  showLabel?: string
}) {
  const body = (
    <>
      <span className="flex w-full items-center justify-between gap-1 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        {onShow && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
      </span>
      <span className={cn('text-xl leading-7 font-semibold tabular-nums', tone)}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </span>
      <span className="text-xs leading-4 text-muted-foreground">{sub}</span>
    </>
  )
  const base = 'flex min-w-0 flex-col items-start gap-0.5 bg-card px-3 py-3 text-left @md:px-4'
  return onShow ? (
    <button
      type="button"
      onClick={onShow}
      aria-label={showLabel}
      className={cn(base, 'transition-colors hover:bg-muted/60 focus-visible:relative focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-muted')}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  )
}

/** Đếm các loại ngày cần chú ý, cùng nguồn với danh sách ngày để hai nơi luôn khớp số. */
function attentionOf(days: LedgerDay[]) {
  const sum = (pick: (d: LedgerDay) => number) => days.reduce((n, d) => n + pick(d), 0)
  const late = sum((d) => d.lateCount)
  const early = sum((d) => d.earlyCount)
  const missing = sum((d) => d.missingCount)
  const detail = [late > 0 && `${late} muộn`, early > 0 && `${early} sớm`, missing > 0 && `${missing} thiếu giờ`].filter(Boolean)
  return { days: days.filter(needsAttention).length, detail: detail.length ? detail.join(' · ') : 'Không có ngày nào' }
}

/**
 * Thẻ kết luận của tháng: tổng công và trạng thái ở trên, ba chỉ số (bấm để lọc ngày) ở giữa,
 * khối xác nhận / báo sai ở dưới. Thẻ dùng container query nên vừa đứng một mình vừa nằm được trong cột phải hẹp.
 */
export function TimesheetSummaryCard({
  data,
  days,
  onShowDays,
}: {
  data: MyTimesheet
  days: LedgerDay[]
  onShowDays: (filter: LedgerFilter) => void
}) {
  const { fullTime, partTime, leave, sheet } = data
  const status = planOf(data).badge
  const attention = attentionOf(days)
  const overtimeDays = fullTime?.overtimeDays ?? []

  return (
    <Card className="@container gap-0 overflow-hidden py-0">
      <section aria-labelledby="month-total" className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="month-total" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            {fullTime ? 'Tổng công tháng' : 'Tổng giờ làm tháng'}
            <InfoTip label="Cách tính">{fullTime ? HOW_TO_FULL : HOW_TO_PART}</InfoTip>
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {sheet && sheet.openFeedbackCount > 0 && (
              <Badge variant="secondary" className={BADGE_TONE.issue}>
                {sheet.openFeedbackCount} trao đổi đang mở
              </Badge>
            )}
            <Badge variant="secondary" className={BADGE_TONE[status.tone]}>
              {status.label}
            </Badge>
          </div>
        </div>

        {fullTime ? (
          <Total
            total={fullTime.totalWorkdays}
            target={fullTime.standardWorkdays}
            soFar={standardSoFar(data.month)}
            unit="công chuẩn"
            parts={[
              { label: 'Công máy', value: fullTime.machineWorkdays, color: 'bg-primary' },
              { label: 'Làm online', value: fullTime.onlineWorkdays, color: 'bg-sky-500' },
              { label: 'Lễ, bù', value: fullTime.holidayWorkdays, color: 'bg-zinc-400 dark:bg-zinc-500' },
              { label: 'Nghỉ phép', value: fullTime.leaveWorkdays, color: 'bg-emerald-500' },
            ]}
          />
        ) : (
          <Total
            total={partTime?.totalHours ?? 0}
            unit="giờ"
            parts={[
              { label: 'Offline', value: partTime?.offlineHours ?? 0, color: 'bg-primary' },
              { label: 'Online', value: partTime?.onlineHours ?? 0, color: 'bg-sky-500' },
            ]}
          />
        )}
      </section>

      <div className="grid grid-cols-3 gap-px border-t bg-border">
        {fullTime ? (
          <>
            <Stat
              label={leave ? `Phép năm ${leave.year}` : 'Phép năm'}
              value={leave ? num(leave.remainingDays) : '—'}
              unit={leave ? 'ngày còn' : undefined}
              sub={leave ? (leave.usedInMonth > 0 ? `Tháng này nghỉ ${num(leave.usedInMonth)}` : `Đã nghỉ ${num(leave.usedDays)}`) : 'Chưa có phép năm'}
              tone={!leave ? 'text-muted-foreground' : leave.remainingDays < 0 ? 'text-rose-700 dark:text-rose-400' : undefined}
            />
            <Stat
              label="Tăng ca"
              value={formatOvertime(fullTime.overtimeWorkdays)}
              unit="giờ"
              sub={overtimeDays.length ? `${overtimeDays.length} ngày, gần nhất ${formatDayMonth(overtimeDays[overtimeDays.length - 1].date)}` : 'Chưa có'}
              tone={fullTime.overtimeWorkdays > 0 ? 'text-violet-700 dark:text-violet-400' : undefined}
              onShow={overtimeDays.length ? () => onShowDays('overtime') : undefined}
              showLabel={`Xem ${overtimeDays.length} ngày tăng ca`}
            />
          </>
        ) : (
          <>
            <Stat
              label="Ngày đi làm"
              value={String(days.filter((d) => (d.workedMinutes ?? 0) > 0).length)}
              unit="ngày"
              sub={(() => {
                const worked = days.filter((d) => (d.workedMinutes ?? 0) > 0)
                const total = worked.reduce((n, d) => n + (d.workedMinutes ?? 0), 0)
                return worked.length ? `TB ${formatDuration(Math.round(total / worked.length))} mỗi ngày` : 'Chưa có'
              })()}
            />
            <Stat
              label="Online"
              value={num(partTime?.onlineHours ?? 0)}
              unit="giờ"
              sub={`${days.filter((d) => d.onlineMinutes > 0).length} ngày có ca online`}
              tone={(partTime?.onlineHours ?? 0) > 0 ? 'text-sky-700 dark:text-sky-400' : undefined}
              onShow={days.some((d) => d.onlineMinutes > 0) ? () => onShowDays('online') : undefined}
              showLabel="Xem các ngày có ca online"
            />
          </>
        )}
        <Stat
          label="Cần chú ý"
          value={String(attention.days)}
          unit="ngày"
          sub={fullTime?.excusedWorkdays ? `${attention.detail} · đã xin phép ${num(fullTime.excusedWorkdays)} công` : attention.detail}
          tone={attention.days > 0 ? 'text-amber-700 dark:text-amber-400' : undefined}
          onShow={attention.days > 0 ? () => onShowDays('attention') : undefined}
          showLabel={`Xem ${attention.days} ngày cần chú ý: ${attention.detail}`}
        />
      </div>

      <MonthActions data={data} attention={attention.days} onShowAttention={() => onShowDays('attention')} />
    </Card>
  )
}
