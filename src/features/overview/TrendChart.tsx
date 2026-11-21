import { Table2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDayMonth, formatWorkDate, weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { COLOR, WEEKDAY_LONG, attendanceRate, rateText, workSplit, type TrendPoint } from './overview.types'

type View = 'rate' | 'notWorking' | 'late'

interface Point extends TrendPoint {
  working: number
  notWorking: number
  rate: number | null
}

const VIEWS: Record<View, { label: string; unit: string; note: string }> = {
  rate: { label: 'Tỷ lệ đi làm', unit: '', note: 'Người đi làm (tại VP hoặc ngoài VP) trên số người có lịch làm.' },
  notWorking: { label: 'Không đi làm', unit: 'người/ngày', note: 'Số người nghỉ phép hoặc vắng không phép mỗi ngày.' },
  late: { label: 'Đi muộn', unit: 'người/ngày', note: 'Số người có ít nhất một ca vào muộn, đã trừ phần được phép.' },
}

/** Đoạn của cột Không đi làm, từ chân cột lên: vắng không phép sát trục để dễ so giữa các ngày. */
const NOT_WORKING_STACK = [
  { key: 'absent', label: 'Vắng không phép', fill: 'fill-rose-600' },
  { key: 'leave', label: 'Nghỉ phép', fill: 'fill-sky-600' },
] as const

const HEIGHT = 260
const M = { t: 22, r: 50, b: 30, l: 38 }

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const dayGap = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

/** Bước chia trục tròn: 1, 2, 5 × 10ⁿ. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag
}

/** Cột bo 4px ở đầu, vuông ở chân. */
function topRounded(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + h}Z`
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.floor(el.clientWidth))
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Từng ngày của tháng, ba góc nhìn chọn bằng thẻ có số trung bình: tỷ lệ đi làm, số người không đi làm, số người đi muộn.
 * Cột mảnh bo đầu, lưới nét liền mảnh, đường trung bình, chỉ ghi số ở ngày cao nhất và ngày cuối; các tuần cách nhau
 * một khe. Rê chuột (hoặc phím mũi tên) để xem mọi chỉ số của một ngày, bấm để mở ngày đó ở tab Ngày.
 */
export function TrendChart({
  points,
  onSelectDate,
  className,
}: {
  points: TrendPoint[]
  onSelectDate: (date: string) => void
  className?: string
}) {
  const [view, setView] = useState<View>('rate')
  const [showTable, setShowTable] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [plotRef, width] = useWidth<HTMLDivElement>()

  const all: Point[] = points.map((p) => ({ ...p, ...workSplit(p), rate: attendanceRate(p) }))
  const avg: Record<View, number | null> = {
    rate: mean(all.flatMap((p) => (p.rate === null ? [] : [p.rate]))),
    notWorking: mean(all.map((p) => p.notWorking)),
    late: mean(all.map((p) => p.late)),
  }
  const data = view === 'rate' ? all.filter((p) => p.rate !== null) : all

  function changeView(next: View) {
    setView(next)
    setActive(null)
  }

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>Từng ngày trong tháng</CardTitle>
        <CardDescription>Không tính Chủ nhật. Bấm một ngày để xem chi tiết.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
            <Table2 />
            {showTable ? 'Ẩn bảng' : 'Xem dạng bảng'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div role="tablist" aria-label="Chỉ số" className="grid grid-cols-3 border-b">
          {(Object.keys(VIEWS) as View[]).map((k) => {
            const value = avg[k]
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => changeView(k)}
                className={cn(
                  'relative flex flex-col rounded-t-lg px-2 pt-2 pb-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3',
                  view === k && 'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary',
                )}
              >
                <span className={cn('block text-[13px]', view === k ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {VIEWS[k].label}
                  <span className="hidden sm:inline"> · trung bình</span>
                </span>
                {/* mt-auto: tên chỉ số xuống dòng trên màn hẹp thì số của ba thẻ vẫn thẳng hàng. */}
                <span className="mt-auto block pt-1 text-lg leading-tight font-semibold tracking-tight sm:text-2xl">
                  {value === null ? '—' : k === 'rate' ? rateText(Math.round(value * 10) / 10) : Math.round(value)}
                  {value !== null && VIEWS[k].unit && (
                    <small className="ml-1 text-[13px] font-normal text-muted-foreground">{VIEWS[k].unit}</small>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-xs text-muted-foreground">{VIEWS[view].note}</p>
          {view === 'notWorking' && (
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
              {NOT_WORKING_STACK.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span className={cn('size-2.5 rounded-[3px]', COLOR[s.key])} aria-hidden />
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div ref={plotRef} className="relative">
          {data.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: HEIGHT }}>
              Chưa có dữ liệu
            </div>
          ) : width > 0 ? (
            <Plot
              data={data}
              view={view}
              width={width}
              average={avg[view]}
              active={active}
              onActive={setActive}
              onSelectDate={onSelectDate}
            />
          ) : (
            <div style={{ height: HEIGHT }} />
          )}
        </div>

        {showTable && (
          <div className="max-h-72 overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Có lịch</TableHead>
                  <TableHead className="text-right">Đi làm</TableHead>
                  <TableHead className="text-right">Tỷ lệ</TableHead>
                  <TableHead className="text-right">Nghỉ phép</TableHead>
                  <TableHead className="text-right">Vắng</TableHead>
                  <TableHead className="text-right">Đi muộn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...all].reverse().map((p) => (
                  <TableRow key={p.date} className="cursor-pointer" onClick={() => onSelectDate(p.date)}>
                    <TableCell>{formatWorkDate(p.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.working + p.notWorking}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.working}</TableCell>
                    <TableCell className="text-right tabular-nums">{rateText(p.rate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.leave}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.absent}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.late}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Plot({
  data,
  view,
  width,
  average,
  active,
  onActive,
  onSelectDate,
}: {
  data: Point[]
  view: View
  width: number
  average: number | null
  active: number | null
  onActive: (index: number | null) => void
  onSelectDate: (date: string) => void
}) {
  const W = Math.max(280, width)
  const n = data.length
  // Khe giữa hai tuần: hai ngày liền nhau trong dữ liệu cách nhau hơn một ngày (bỏ Chủ nhật).
  const breaks = data.map((p, i) => i > 0 && dayGap(data[i - 1].date, p.date) > 1)
  const before: number[] = []
  let acc = 0
  for (const b of breaks) {
    if (b) acc++
    before.push(acc)
  }
  const gap = W < 520 ? 4 : 8
  const slot = (W - M.l - M.r - acc * gap) / n
  const cx = (i: number) => M.l + i * slot + before[i] * gap + slot / 2
  const bw = Math.max(4, Math.min(18, slot - 6))
  const yT = M.t
  const yB = HEIGHT - M.b

  const value = (p: Point) => (view === 'late' ? p.late : view === 'notWorking' ? p.notWorking : (p.rate ?? 0))
  let yMin = 0
  let yMax: number
  let step: number
  if (view === 'rate') {
    const lo = Math.min(...data.map(value))
    step = Math.max(1, niceStep((101 - lo) / 3))
    yMin = Math.max(0, Math.floor((lo - 0.5) / step) * step)
    yMax = 100
  } else {
    const hi = Math.max(...data.map(value))
    step = Math.max(1, niceStep(hi / 5))
    yMax = Math.max(step, Math.ceil(hi / step) * step)
  }
  const y = (v: number) => yB - ((v - yMin) / (yMax - yMin)) * (yB - yT)
  const ticks: number[] = []
  for (let t = yMin; t <= yMax + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100)

  const maxIndex = data.reduce((best, p, i) => (value(p) > value(data[best]) ? i : best), 0)
  const minIndex = data.reduce((best, p, i) => (value(p) < value(data[best]) ? i : best), 0)
  const labelled = [...new Set([maxIndex, n - 1])]

  // Nhãn trục ngang: ngày đầu, ngày cuối và đầu tuần (thứ Hai); bỏ nhãn đè nhau, ưu tiên ngày cuối.
  const xLabels: number[] = []
  data
    .map((p, i) => (i === 0 || i === n - 1 || weekdayShort(p.date) === 'T2' ? i : -1))
    .filter((i) => i >= 0)
    .sort((a, b) => Number(b === n - 1) - Number(a === n - 1))
    .forEach((i) => {
      if (xLabels.every((k) => Math.abs(cx(k) - cx(i)) > 40)) xLabels.push(i)
    })

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const current = active ?? n - 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      onActive(Math.min(n - 1, Math.max(0, current + (e.key === 'ArrowRight' ? 1 : -1))))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectDate(data[current].date)
    } else if (e.key === 'Escape') {
      onActive(null)
    }
  }

  const hovered = active !== null ? data[active] : undefined
  const rateLine = view === 'rate' ? data.map((p, i) => `${cx(i)},${y(p.rate ?? 0)}`).join('L') : ''

  return (
    <>
      <svg
        width={W}
        height={HEIGHT}
        tabIndex={0}
        role="img"
        aria-label={`${VIEWS[view].label}, ${n} ngày từ ${formatDayMonth(data[0].date)} đến ${formatDayMonth(data[n - 1].date)}. Dùng phím mũi tên để xem từng ngày, Enter để mở ngày đó.`}
        className="block overflow-visible rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card focus-visible:outline-none"
        onPointerLeave={() => onActive(null)}
        onFocus={() => onActive(n - 1)}
        onBlur={() => onActive(null)}
        onKeyDown={onKeyDown}
      >
        {hovered && <rect className="fill-muted" x={cx(active!) - slot / 2} y={yT - 10} width={slot} height={yB - yT + 10} rx={4} />}

        {ticks.map((t) => (
          <g key={t}>
            <line
              className={t === yMin && view !== 'rate' ? 'stroke-border' : 'stroke-border/60'}
              x1={M.l}
              x2={W - M.r}
              y1={y(t)}
              y2={y(t)}
              shapeRendering="crispEdges"
            />
            <text className="fill-muted-foreground text-[11px] tabular-nums" x={M.l - 8} y={y(t) + 4} textAnchor="end">
              {view === 'rate' ? `${t}%` : t}
            </text>
          </g>
        ))}

        {average !== null && (
          <g>
            <line className="stroke-muted-foreground/50" x1={M.l} x2={W - M.r} y1={y(average)} y2={y(average)} shapeRendering="crispEdges" />
            <text className="fill-muted-foreground text-[11px]" x={W - M.r + 6} y={y(average) + 4}>
              TB {view === 'rate' ? rateText(Math.round(average * 10) / 10) : Math.round(average)}
            </text>
          </g>
        )}

        {view === 'late' &&
          data.map((p, i) => <path key={p.date} className="fill-amber-600" d={topRounded(cx(i) - bw / 2, y(p.late), bw, yB - y(p.late))} />)}

        {view === 'notWorking' &&
          data.map((p, i) => {
            const parts = NOT_WORKING_STACK.filter((s) => p[s.key] > 0)
            let base = 0
            return (
              <g key={p.date}>
                {parts.map((s, j) => {
                  const y0 = y(base)
                  const y1 = y(base + p[s.key])
                  // Khe 2px màu nền giữa các đoạn, thay cho viền.
                  const h = Math.max(1, y0 - y1 - (base > 0 ? 2 : 0))
                  base += p[s.key]
                  return j === parts.length - 1 ? (
                    <path key={s.key} className={s.fill} d={topRounded(cx(i) - bw / 2, y1, bw, h)} />
                  ) : (
                    <rect key={s.key} className={s.fill} x={cx(i) - bw / 2} y={y1} width={bw} height={h} />
                  )
                })}
              </g>
            )
          })}

        {view === 'rate' && (
          <>
            <path className="fill-primary/10" d={`M${cx(0)},${yB}L${rateLine}L${cx(n - 1)},${yB}Z`} />
            <line className="stroke-border" x1={M.l} x2={W - M.r} y1={yB} y2={yB} shapeRendering="crispEdges" />
            <path className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" d={`M${rateLine}`} />
            {[...new Set([minIndex, n - 1])].map((i) => (
              <g key={i}>
                <circle className="fill-primary stroke-card" strokeWidth={2} cx={cx(i)} cy={y(data[i].rate ?? 0)} r={4} />
                <text
                  className="fill-foreground text-[11px] font-semibold tabular-nums"
                  x={cx(i)}
                  y={y(data[i].rate ?? 0) + (i === minIndex && i !== n - 1 ? 18 : -10)}
                  textAnchor="middle"
                >
                  {rateText(data[i].rate)}
                </text>
              </g>
            ))}
            {hovered && (
              <>
                <line className="stroke-muted-foreground/70" x1={cx(active!)} x2={cx(active!)} y1={yT} y2={yB} shapeRendering="crispEdges" />
                <circle className="fill-primary stroke-card" strokeWidth={2} cx={cx(active!)} cy={y(hovered.rate ?? 0)} r={5} />
              </>
            )}
          </>
        )}

        {view !== 'rate' &&
          labelled.map((i) => (
            <text
              key={i}
              className="fill-foreground text-[11px] font-semibold tabular-nums"
              x={cx(i)}
              y={y(value(data[i])) - 6}
              textAnchor="middle"
            >
              {value(data[i])}
            </text>
          ))}

        {xLabels.map((i) => (
          <text key={i} className="fill-muted-foreground text-[11px] tabular-nums" x={cx(i)} y={HEIGHT - 8} textAnchor="middle">
            {formatDayMonth(data[i].date)}
          </text>
        ))}

        {data.map((p, i) => (
          <rect
            key={p.date}
            className="cursor-pointer fill-transparent"
            x={cx(i) - slot / 2}
            y={yT - 10}
            width={slot + (breaks[i + 1] ? gap : 0)}
            height={yB - yT + 10}
            onPointerMove={() => active !== i && onActive(i)}
            onClick={() => onSelectDate(p.date)}
          />
        ))}
      </svg>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute top-2 z-10 min-w-48 rounded-lg border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg transition-opacity duration-100',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
        style={
          hovered
            ? cx(active!) > W / 2
              ? { left: cx(active!) - 14, transform: 'translateX(-100%)' }
              : { left: cx(active!) + 14 }
            : { left: 0 }
        }
      >
        {hovered && <DayTooltip point={hovered} view={view} />}
      </div>
    </>
  )
}

/** Mọi chỉ số của một ngày, chỉ số của góc nhìn đang chọn lên đầu. */
function DayTooltip({ point: p, view }: { point: Point; view: View }) {
  const rows = {
    rate: { color: 'bg-primary', value: rateText(p.rate), label: `Tỷ lệ đi làm · ${p.working}/${p.working + p.notWorking}` },
    absent: { color: COLOR.absent, value: p.absent, label: 'Vắng không phép' },
    leave: { color: COLOR.leave, value: p.leave, label: 'Nghỉ phép' },
    late: { color: COLOR.late, value: p.late, label: 'Đi muộn' },
  }
  const order: (keyof typeof rows)[] =
    view === 'late' ? ['late', 'rate', 'absent', 'leave'] : view === 'notWorking' ? ['absent', 'leave', 'rate', 'late'] : ['rate', 'absent', 'leave', 'late']
  const lead: (keyof typeof rows)[] = view === 'notWorking' ? ['absent', 'leave'] : [order[0]]

  return (
    <>
      <p className="mb-1.5 font-medium">
        {WEEKDAY_LONG[weekdayShort(p.date)]}, {formatDayMonth(p.date)}/{p.date.slice(0, 4)}
      </p>
      {order.map((k) => (
        <p key={k} className="grid grid-cols-[0.75rem_auto_1fr] items-center gap-2 py-0.5">
          <span className={cn('h-0.5 w-3 rounded-full', rows[k].color)} aria-hidden />
          <b className={cn('min-w-8 text-right font-semibold tabular-nums', lead.includes(k) && 'text-[13px]')}>{rows[k].value}</b>
          <span className="text-muted-foreground">{rows[k].label}</span>
        </p>
      ))}
      <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">Bấm để xem ngày này</p>
    </>
  )
}
