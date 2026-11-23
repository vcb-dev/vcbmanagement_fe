import { useMemo } from 'react'
import { formatDayMonth, weekdayShort } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { SLOT_NAMES, dayIndex, missingSlots, type BoardDay, type BoardRow } from './attendance-board.types'

/** Cột tên co giãn, 4 cột giờ mỗi cột 52px: vừa "08:05" ở 13px và còn đủ chỗ cho tên ở khổ 360px. */
const GRID = 'grid grid-cols-[minmax(0,1fr)_repeat(4,3.25rem)]'
const HEAD = 'flex items-center justify-center border-l text-center'

/** Một mốc giờ: muộn / về sớm tô cam, thiếu mốc thì "--:--" nền cam, không chấm thì chấm xám. */
function Slot({ day, slot, missing }: { day: BoardDay | undefined; slot: number; missing: boolean }) {
  const time = day?.times[slot] ?? null
  const off = (day?.deviations[slot] ?? 0) > 0
  return (
    <span
      className={cn(
        'relative flex items-center justify-center border-l text-[13px] tabular-nums',
        slot === 2 && 'border-l-foreground/20',
        missing && 'bg-amber-500/10',
      )}
    >
      {time ? (
        <span className={cn(off && 'font-semibold text-amber-600 dark:text-amber-400')}>{time}</span>
      ) : missing ? (
        <span className="font-semibold text-amber-600 dark:text-amber-400">--:--</span>
      ) : (
        <span className="size-1 rounded-full bg-muted-foreground/30" />
      )}
      {day?.adjustedSlots[slot] && <i className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-sky-500" />}
    </span>
  )
}

function rowLabel(name: string, ymd: string, day: BoardDay | undefined, missing: boolean[]): string {
  const slots = SLOT_NAMES.map((slotName, i) => {
    const time = day?.times[i]
    if (time) return `${slotName} ${time}${(day?.deviations[i] ?? 0) > 0 ? (i % 2 === 0 ? ' (muộn)' : ' (về sớm)') : ''}`
    return missing[i] ? `${slotName}: thiếu` : null
  }).filter(Boolean)
  return [`${name} · ${weekdayShort(ymd)} ${formatDayMonth(ymd)}`, slots.length ? slots.join(', ') : 'không chấm công', 'bấm để xem chi tiết'].join(' · ')
}

/**
 * Bảng chấm công trên điện thoại: một ngày, mỗi nhân sự một dòng với đủ 4 mốc (vào / ra ca sáng, vào / ra ca chiều),
 * không phải vuốt ngang. Bấm cả dòng để xem chi tiết ngày đó hoặc bổ sung giờ.
 */
export function BoardDayList({
  rows,
  date,
  today,
  onSelect,
}: {
  rows: BoardRow[]
  date: string
  today: string
  onSelect: (userId: string) => void
}) {
  const items = useMemo(() => rows.map((row) => ({ row, day: dayIndex(row).get(date) })), [rows, date])
  const future = date > today

  return (
    <div>
      <div className={cn(GRID, 'grid-rows-[auto_auto] border-b border-b-foreground/20 bg-muted text-foreground')}>
        <div className="row-span-2 flex items-center px-3 text-sm font-semibold">Nhân sự</div>
        <div className={cn(HEAD, 'col-span-2 border-b py-1 text-xs font-semibold')}>Ca sáng</div>
        <div className={cn(HEAD, 'col-span-2 border-b border-l-foreground/20 py-1 text-xs font-semibold')}>Ca chiều</div>
        {['Vào', 'Ra', 'Vào', 'Ra'].map((label, i) => (
          <div key={i} className={cn(HEAD, 'py-0.5 text-[11px] font-medium text-muted-foreground', i === 2 && 'border-l-foreground/20')}>
            {label}
          </div>
        ))}
      </div>
      {future ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Chưa tới ngày này.</p>
      ) : (
        <ul>
          {items.map(({ row, day }) => {
            const name = displayName(row.user)
            const missing = day ? missingSlots(day) : [false, false, false, false]
            return (
              <li key={row.user.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.user.id)}
                  aria-label={rowLabel(name, date, day, missing)}
                  className={cn(
                    GRID,
                    'min-h-13 w-full border-b text-left transition-colors outline-none active:bg-muted',
                    'focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  )}
                >
                  <span className="min-w-0 px-3 py-2">
                    <span className="block text-[13px] leading-tight font-medium break-words">{name}</span>
                    <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                      {!row.user.isActive && 'Đã khoá · '}
                      {row.employmentType === 'part_time' && `${EMPLOYMENT_LABEL.part_time} · `}
                      {row.department?.name ?? 'Chưa gán bộ phận'}
                    </span>
                  </span>
                  {[0, 1, 2, 3].map((slot) => (
                    <Slot key={slot} day={day} slot={slot} missing={missing[slot]} />
                  ))}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Tóm tắt một ngày của những người đang lọc: bao nhiêu người đã chấm, thiếu mốc, vào muộn. */
export function BoardDaySummary({ rows, date, today }: { rows: BoardRow[]; date: string; today: string }) {
  const stats = useMemo(() => {
    let punched = 0
    let missing = 0
    let late = 0
    for (const row of rows) {
      const day = row.days.find((d) => d.date === date)
      if (!day) continue
      if (day.times.some(Boolean)) punched += 1
      if (day.missingCount > 0) missing += 1
      if (day.lateCount > 0) late += 1
    }
    return { punched, missing, late }
  }, [rows, date])

  if (date > today) return null
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      <b className="font-semibold text-foreground">{stats.punched}</b>/{rows.length} người có chấm công
      {stats.late > 0 && (
        <>
          {' · '}
          <b className="font-semibold text-amber-600 dark:text-amber-400">{stats.late}</b> vào muộn
        </>
      )}
      {stats.missing > 0 && (
        <>
          {' · '}
          <b className="font-semibold text-amber-600 dark:text-amber-400">{stats.missing}</b> thiếu mốc
        </>
      )}
    </p>
  )
}
