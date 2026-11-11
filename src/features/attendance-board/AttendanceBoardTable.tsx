import { useMemo } from 'react'
import { UserAvatar } from '@/components/layout/nav-user'
import { formatDayMonth, formatDuration, weekdayShort } from '@/lib/format'
import { LINE_BOTTOM, LINE_RIGHT, SOFT_BOTTOM, SOFT_RIGHT } from '@/lib/table-lines'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { SLOT_NAMES, dayIndex, missingSlots, type BoardDay, type BoardPerson, type BoardRow } from './attendance-board.types'

// Tiêu đề canh giữa hai chiều, chữ đậm. Header dính nên mọi ô header phải có nền đặc.
const HEAD = 'border-b bg-muted px-2 py-1.5 text-center align-middle text-sm leading-5 font-semibold whitespace-nowrap text-foreground'
/** Hàng tiêu đề thứ hai: Vào / Ra dưới mỗi ngày. */
const SUB_HEAD = 'border-b bg-muted px-0 py-1 text-center text-[11px] leading-4 font-medium whitespace-nowrap text-muted-foreground'
export const SUNDAY = 'bg-muted/50'
/** Ô Chủ nhật trên header: nền đặc, đậm hơn bg-muted một chút. */
export const SUNDAY_HEAD = 'bg-[color-mix(in_oklab,var(--muted),var(--foreground)_5%)]'

/** Cột tên và bộ phận giữ cố định, phần rộng còn lại dành cho các ô giờ. */
export const PERSON_COL = 'w-40 max-w-40 min-w-40 sm:w-44 sm:max-w-44 sm:min-w-44'
export const DEPARTMENT_COL = 'w-28 max-w-28 min-w-28'
/** Cột Buổi dính ngay sau cột Nhân sự khi cuộn ngang (cột Bộ phận trượt xuống dưới). */
export const SHIFT_COL = 'sticky left-40 w-12 max-w-12 min-w-12 sm:left-44'
/** Ô giờ không đặt độ rộng cố định để giãn ra khi xem một tuần. */
const SLOT_COL = 'min-w-12'

const SHIFTS = [
  { label: 'Sáng', slots: [0, 1] },
  { label: 'Chiều', slots: [2, 3] },
] as const

export function PersonCell({
  person,
  rowSpan,
  className,
  onClick,
}: {
  person: BoardPerson
  rowSpan?: number
  className?: string
  onClick: () => void
}) {
  const { user } = person
  return (
    <td
      rowSpan={rowSpan}
      className={cn(PERSON_COL, 'sticky left-0 z-1 border-r border-b bg-card px-2.5 py-1 group-hover/row:bg-muted', className)}
    >
      <button type="button" onClick={onClick} className="group/name flex w-full items-center gap-2 text-left">
        <UserAvatar user={user} className="size-6 shrink-0 rounded-md text-[10px]" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-tight font-medium group-hover/name:underline">{displayName(user)}</span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {!user.isActive && 'Đã khoá · '}
            {person.employmentType === 'part_time' && `${EMPLOYMENT_LABEL.part_time} · `}
            {user.email}
          </span>
        </span>
      </button>
    </td>
  )
}

export function DepartmentCell({ person, rowSpan, className }: { person: BoardPerson; rowSpan?: number; className?: string }) {
  return (
    <td
      rowSpan={rowSpan}
      className={cn(
        DEPARTMENT_COL,
        'hidden truncate border-r border-b px-2 py-1 text-center text-[11px] whitespace-nowrap text-muted-foreground md:table-cell',
        className,
      )}
    >
      {person.department?.name ?? 'Chưa gán bộ phận'}
    </td>
  )
}

function deviationText(slot: number, minutes: number): string {
  return `${slot % 2 === 0 ? 'muộn' : 'về sớm'} ${formatDuration(minutes)}`
}

function slotTitle(name: string, ymd: string, slot: number, day: BoardDay | undefined, missing: boolean, isToday: boolean) {
  const parts = [`${name} · ${weekdayShort(ymd)} ${formatDayMonth(ymd)}`]
  const time = day?.times[slot]
  const deviation = day?.deviations[slot] ?? 0
  if (time) {
    parts.push(`${SLOT_NAMES[slot]} ${time}`)
    if (deviation > 0) parts.push(deviationText(slot, deviation))
    if (day?.adjustedSlots[slot]) parts.push('quản lý đã bổ sung')
  } else if (missing) {
    parts.push(`thiếu giờ ${SLOT_NAMES[slot].toLowerCase()}`)
  } else {
    parts.push(`${SLOT_NAMES[slot]}: ${isToday ? 'chưa chấm' : 'không có dữ liệu'}`)
  }
  parts.push('bấm để xem chi tiết')
  return parts.join(' · ')
}

/** Một ô giờ: giờ của một lượt (vào hoặc ra) của một buổi trong ngày. */
function SlotCell({
  name,
  ymd,
  slot,
  day,
  today,
  onClick,
}: {
  name: string
  ymd: string
  slot: number
  day: BoardDay | undefined
  today: string
  onClick: () => void
}) {
  const border = cn(slot % 2 === 0 ? SOFT_RIGHT : LINE_RIGHT, slot < 2 ? SOFT_BOTTOM : LINE_BOTTOM)
  const sunday = weekdayShort(ymd) === 'CN'
  if (ymd > today) return <td className={cn(SLOT_COL, 'h-7.5', border, sunday && SUNDAY)} />

  const time = day?.times[slot] ?? null
  const missing = !!day && missingSlots(day)[slot]
  const off = (day?.deviations[slot] ?? 0) > 0
  const title = slotTitle(name, ymd, slot, day, missing, ymd === today)
  return (
    <td className={cn(SLOT_COL, 'h-7.5 p-0', border, sunday && SUNDAY, missing && 'bg-amber-500/10')}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="relative flex size-full items-center justify-center px-1 text-[13px] leading-none tabular-nums outline-none hover:bg-primary/5 hover:ring-1 hover:ring-primary hover:ring-inset focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {time ? (
          <span className={cn(off && 'font-semibold text-amber-600 dark:text-amber-400')}>{time}</span>
        ) : missing ? (
          <span className="font-semibold text-amber-600 dark:text-amber-400">--:--</span>
        ) : (
          <span className="size-1 rounded-full bg-muted-foreground/30" />
        )}
        {day?.adjustedSlots[slot] && <i className="absolute top-1 right-1 size-1.5 rounded-full bg-sky-500" />}
      </button>
    </td>
  )
}

/**
 * Bảng theo ngày: mỗi nhân sự hai dòng (Sáng, Chiều), mỗi ngày hai cột (Vào, Ra), đủ 4 lượt chấm trong ngày.
 * Tổng công, đi muộn, thiếu chấm xem ở Chốt công tháng.
 */
export function AttendanceBoardTable({
  rows,
  days,
  today,
  onSelectDay,
  onSelectPerson,
}: {
  rows: BoardRow[]
  days: string[]
  today: string
  onSelectDay: (userId: string, date: string) => void
  onSelectPerson: (row: BoardRow) => void
}) {
  const indexed = useMemo(() => rows.map((row) => ({ row, byDate: dayIndex(row) })), [rows])

  return (
    <div className="max-h-[max(22rem,calc(100svh-17rem))] overflow-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th rowSpan={2} scope="col" className={cn(HEAD, PERSON_COL, LINE_BOTTOM, 'sticky left-0 z-20 border-r px-2.5')}>
              Nhân sự
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, DEPARTMENT_COL, LINE_BOTTOM, 'hidden border-r md:table-cell')}>
              Bộ phận
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, SHIFT_COL, LINE_BOTTOM, LINE_RIGHT, 'z-20 px-1')}>
              Buổi
            </th>
            {days.map((ymd) => (
              <th
                key={ymd}
                colSpan={2}
                scope="colgroup"
                className={cn(HEAD, LINE_RIGHT, weekdayShort(ymd) === 'CN' && SUNDAY_HEAD, ymd === today && 'text-primary')}
              >
                {ymd.slice(8)}
                <span className={cn('ml-1 text-[11px] font-normal text-muted-foreground', ymd === today && 'text-primary')}>
                  {weekdayShort(ymd)}
                </span>
              </th>
            ))}
          </tr>
          <tr>
            {days.flatMap((ymd) => {
              const sunday = weekdayShort(ymd) === 'CN' && SUNDAY_HEAD
              return [
                <th key={`${ymd}-in`} scope="col" className={cn(SUB_HEAD, SLOT_COL, LINE_BOTTOM, SOFT_RIGHT, sunday)}>
                  Vào
                </th>,
                <th key={`${ymd}-out`} scope="col" className={cn(SUB_HEAD, SLOT_COL, LINE_BOTTOM, LINE_RIGHT, sunday)}>
                  Ra
                </th>,
              ]
            })}
          </tr>
        </thead>
        {indexed.map(({ row, byDate }) => {
          const name = displayName(row.user)
          return (
            <tbody key={row.user.id} className="group/row">
              {SHIFTS.map((shift, s) => (
                <tr key={shift.label}>
                  {s === 0 && (
                    <>
                      <PersonCell person={row} rowSpan={2} className={LINE_BOTTOM} onClick={() => onSelectPerson(row)} />
                      <DepartmentCell person={row} rowSpan={2} className={LINE_BOTTOM} />
                    </>
                  )}
                  <th
                    scope="row"
                    className={cn(
                      SHIFT_COL,
                      LINE_RIGHT,
                      'z-1 bg-card px-1 text-center text-[11px] font-medium text-muted-foreground group-hover/row:bg-muted',
                      s === 0 ? SOFT_BOTTOM : LINE_BOTTOM,
                    )}
                  >
                    {shift.label}
                  </th>
                  {days.flatMap((ymd) =>
                    shift.slots.map((slot) => (
                      <SlotCell
                        key={`${ymd}-${slot}`}
                        name={name}
                        ymd={ymd}
                        slot={slot}
                        day={byDate.get(ymd)}
                        today={today}
                        onClick={() => onSelectDay(row.user.id, ymd)}
                      />
                    )),
                  )}
                </tr>
              ))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
