import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatWorkDate } from '@/lib/format'
import type { AttendanceRecord } from './attendance.types'

const chartConfig = {
  hours: { label: 'Giờ làm', color: 'var(--chart-1)' },
} satisfies ChartConfig

const STANDARD_HOURS = 8

export function WorkHoursChart({ records }: { records: AttendanceRecord[] }) {
  const data = [...records]
    .filter((r) => r.workedMinutes !== null)
    .sort((a, b) => a.workDate.localeCompare(b.workDate))
    .slice(-14)
    .map((r) => ({
      day: `${r.workDate.slice(8, 10)}/${r.workDate.slice(5, 7)}`,
      label: formatWorkDate(r.workDate),
      hours: Math.round(((r.workedMinutes ?? 0) / 60) * 10) / 10,
      late: r.lateMinutes > 0,
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Chưa có dữ liệu chấm công
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-full min-h-56 w-full">
      <BarChart data={data} margin={{ left: -20, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 11]} />
        <ReferenceLine y={STANDARD_HOURS} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
              formatter={(v) => `${v} giờ`}
            />
          }
        />
        <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.late ? 'var(--chart-3)' : 'var(--color-hours)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
