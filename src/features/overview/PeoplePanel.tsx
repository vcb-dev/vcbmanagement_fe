import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CircleCheck,
  FileCheck,
  Search,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LeaveStatusBadge } from '@/features/leave-requests/LeaveRequestBadges'
import type { LeaveRequestStatus, LeaveRequestType } from '@/features/leave-requests/leave-requests.types'
import { formatDayMonth, normalizeSearch } from '@/lib/format'
import { NO_SCROLLBAR } from '@/lib/scroll'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { EmptyState, PendingBadgeLink, PendingLink, PersonCell } from './overview-parts'
import {
  ALL_DEPARTMENTS,
  NO_DEPARTMENT,
  OFFSITE_NAME,
  PART_LABEL,
  SHIFT_NAME,
  absentLabel,
  approvalLink,
  departmentKey,
  minutesText,
  viNumber,
  type ListKey,
  type Overview,
  type OverviewPerson,
} from './overview.types'

/** Cùng thứ tự với các thẻ số: không đi làm (vắng, nghỉ phép), đi muộn, các loại đơn, rồi ngoài VP. */
const LIST_KEYS: ListKey[] = ['absent', 'leave', 'late', 'lateRequests', 'earlyRequests', 'offsite']

/** Nhóm mở sẵn: nhóm đầu tiên có người, để trang không mở ra một danh sách trống. */
function firstNonEmpty(lists: Overview['lists']): ListKey {
  return LIST_KEYS.find((k) => lists[k].length > 0) ?? 'absent'
}

/** Hình thức đơn của các nhóm là đơn xin phép. */
const LIST_TYPE: Partial<Record<ListKey, LeaveRequestType>> = {
  leave: 'leave',
  lateRequests: 'late_arrival',
  earlyRequests: 'early_leave',
  offsite: 'offsite',
}

/** Màn để xử lý tiếp của từng nhóm; nhóm là đơn xin phép thì mở trang duyệt ở đúng hình thức, tab Chờ duyệt. */
function listLink(list: ListKey): { to: string; label: string } {
  const type = LIST_TYPE[list]
  if (type) return { to: approvalLink({ type }), label: 'Mở Duyệt đơn xin phép' }
  return list === 'late' ? { to: '/late', label: 'Mở màn Đi muộn' } : { to: '/attendance-board', label: 'Mở Bảng chấm công' }
}

/** Đơn chờ duyệt: nhãn bấm được, mở đúng đơn đó ở trang duyệt. Đơn đã duyệt: nhãn thường. */
function requestBadge(
  request: { id: string; status: LeaveRequestStatus },
  type: LeaveRequestType,
  person: OverviewPerson,
): ReactNode {
  if (request.status !== 'pending') return <LeaveStatusBadge status={request.status} />
  return <PendingBadgeLink to={approvalLink({ type, email: person.email, id: request.id })} />
}

interface Row {
  key: string
  person: OverviewPerson
  detail: ReactNode
  aside?: ReactNode
}

function dateRange(from: string, to: string): string {
  return from === to ? `ngày ${formatDayMonth(from)}` : `${formatDayMonth(from)} – ${formatDayMonth(to)}`
}

/** "thực tế đến muộn 30 phút", "thực tế đến đúng giờ", "chưa chấm công ca này". */
function actualText(minutes: number | null, kind: 'late' | 'early'): string {
  if (minutes === null) return 'chưa chấm công ca này'
  if (minutes > 0) return `thực tế ${kind === 'late' ? 'đến muộn' : 'về sớm'} ${minutes} phút`
  return kind === 'late' ? 'thực tế đến đúng giờ' : 'thực tế về đúng giờ'
}

function rowsOf(list: ListKey, lists: Overview['lists'], isToday: boolean): Row[] {
  switch (list) {
    case 'leave':
      return lists.leave.map((i) => ({
        key: i.request.id,
        person: i.person,
        detail: (
          <>
            {PART_LABEL[i.request.part]}, {i.request.deductAnnualLeave ? 'có lương' : 'không lương'}. Đơn{' '}
            {viNumber(i.request.leaveDays)} ngày ({dateRange(i.request.startDate, i.request.endDate)})
            {i.status === 'present' && '. Có đến làm nửa ngày còn lại'}
          </>
        ),
        aside: requestBadge(i.request, 'leave', i.person),
      }))
    case 'lateRequests':
    case 'earlyRequests':
      return lists[list].map((i) => ({
        key: i.request.id,
        person: i.person,
        detail: (
          <>
            {SHIFT_NAME[i.request.shift]}
            {i.request.hours !== null && `, xin ${viNumber(i.request.hours)} giờ`},{' '}
            {actualText(i.actualMinutes, list === 'lateRequests' ? 'late' : 'early')}
          </>
        ),
        aside: requestBadge(i.request, list === 'lateRequests' ? 'late_arrival' : 'early_leave', i.person),
      }))
    case 'late':
      return [...lists.late]
        .sort((a, b) => b.minutes - a.minutes)
        .map((i) => ({
          key: i.person.id,
          person: i.person,
          detail: (
            <>
              {i.shifts.map((s) => `${SHIFT_NAME[s.shift]} muộn ${s.minutes} phút`).join(', ')}
              {i.excused && '. Có đơn xin đi muộn, đã trừ phần được phép'}
            </>
          ),
          aside: <span className="text-sm font-semibold tabular-nums">{minutesText(i.minutes)}</span>,
        }))
    case 'absent':
      return lists.absent.map((i) => ({
        key: i.person.id,
        person: i.person,
        detail: isToday ? 'Chưa chấm công, chưa có đơn xin phép' : 'Không chấm công và không có đơn xin phép',
      }))
    case 'offsite':
      return lists.offsite.map((i) => ({
        key: i.request?.id ?? `online-${i.person.id}`,
        person: i.person,
        detail: (
          <>
            {i.request?.offsiteKind ? OFFSITE_NAME[i.request.offsiteKind] : 'Ca online do quản lý ghi'}
            {i.request && i.online && ', có thêm ca online'}
            {i.status === 'present' && '. Có chấm công tại văn phòng'}
          </>
        ),
        aside: i.request ? requestBadge(i.request, 'offsite', i.person) : <Badge variant="outline">Ca online</Badge>,
      }))
  }
}

function countWaiting(items: { request: { status: string } | null }[]): number {
  return items.filter((i) => i.request?.status === 'pending').length
}

function listLabel(list: ListKey, isToday: boolean): string {
  const labels: Record<ListKey, string> = {
    absent: absentLabel(isToday),
    late: 'Đi muộn',
    leave: 'Nghỉ phép',
    offsite: 'Ngoài VP',
    lateRequests: 'Xin đi muộn',
    earlyRequests: 'Xin về sớm',
  }
  return labels[list]
}

/** Một dòng tóm tắt của nhóm đang mở, tính trên các dòng đã lọc theo bộ phận; "N đơn chờ duyệt" mở trang duyệt. */
function listNote(list: ListKey, lists: Overview['lists'], isToday: boolean, isSunday: boolean): ReactNode {
  const waiting = (type: LeaveRequestType, n: number, none: ReactNode) =>
    n > 0 ? <PendingLink count={n} to={approvalLink({ type })} /> : none
  switch (list) {
    case 'absent':
      return isSunday ? 'Chủ nhật không tính' : isToday ? 'Có thể chưa tới giờ vào ca' : 'Không có đơn xin phép'
    case 'late': {
      if (!lists.late.length) return ''
      const excused = lists.late.filter((i) => i.excused).length
      return `Tổng ${minutesText(lists.late.reduce((n, i) => n + i.minutes, 0))}${excused ? ` · ${excused} người có đơn xin muộn` : ''}`
    }
    case 'leave': {
      if (!lists.leave.length) return ''
      const paid = lists.leave.filter((i) => i.request.deductAnnualLeave).length
      const pending = countWaiting(lists.leave)
      return (
        <>
          {paid} có lương, {lists.leave.length - paid} không lương
          {pending > 0 && <> · {waiting('leave', pending, null)}</>}
        </>
      )
    }
    case 'offsite':
      return lists.offsite.length ? waiting('offsite', countWaiting(lists.offsite), 'Cửa hàng, online, bên ngoài') : ''
    case 'lateRequests':
    case 'earlyRequests':
      return lists[list].length ? waiting(LIST_TYPE[list]!, countWaiting(lists[list]), 'Đã duyệt hết') : ''
  }
}

function emptyState(list: ListKey, isToday: boolean): { icon: LucideIcon; title: string; note?: string } {
  switch (list) {
    case 'absent':
      return { icon: CircleCheck, title: isToday ? 'Ai cũng đã chấm công hoặc có đơn' : 'Không ai vắng mà không xin phép' }
    case 'late':
      return { icon: CircleCheck, title: 'Không ai đi muộn' }
    case 'leave':
      return { icon: CalendarCheck, title: 'Không ai nghỉ phép ngày này' }
    case 'offsite':
      return { icon: Building2, title: 'Không ai làm ngoài văn phòng' }
    case 'lateRequests':
      return { icon: FileCheck, title: 'Không có đơn xin đi muộn cho ngày này' }
    case 'earlyRequests':
      return { icon: FileCheck, title: 'Không có đơn xin về sớm cho ngày này' }
  }
}

/**
 * Các nhóm (chưa chấm công, đi muộn, nghỉ phép…) với số người, bấm một nhóm để xem từng người bên dưới. Lọc bộ phận
 * (ở đây hoặc bấm ở thẻ Theo bộ phận) áp cho cả số và danh sách; ô tìm kiếm chỉ lọc danh sách.
 */
export function PeoplePanel({
  data,
  isToday,
  tab,
  onTabChange,
  department,
  onDepartmentChange,
  className,
}: {
  data: Overview
  isToday: boolean
  /** null = chưa chọn, mở nhóm đầu tiên có người. */
  tab: ListKey | null
  onTabChange: (tab: ListKey) => void
  /** `ALL_DEPARTMENTS`, `NO_DEPARTMENT` hoặc id bộ phận. */
  department: string
  onDepartmentChange: (department: string) => void
  className?: string
}) {
  const [query, setQuery] = useState('')
  const active = tab ?? firstNonEmpty(data.lists)
  const departmentName = data.departments.find((d) => departmentKey(d) === department)?.name

  const lists = useMemo(() => {
    if (department === ALL_DEPARTMENTS) return data.lists
    const inDept = <T extends { person: OverviewPerson }>(items: T[]) => items.filter((i) => departmentKey(i.person.department) === department)
    return Object.fromEntries(LIST_KEYS.map((k) => [k, inDept(data.lists[k])])) as Overview['lists']
  }, [data.lists, department])

  const rows = useMemo(() => {
    const q = normalizeSearch(query.trim())
    const all = rowsOf(active, lists, isToday)
    return q ? all.filter((r) => normalizeSearch(`${displayName(r.person)} ${r.person.email}`).includes(q)) : all
  }, [lists, active, query, isToday])

  const link = listLink(active)
  const empty = emptyState(active, isToday)

  // Điện thoại: hàng nhóm cuộn ngang. Mở nhóm từ thẻ số phía trên thì kéo tab đó vào tầm nhìn.
  const tabsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = tabsRef.current
    const tab = box?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!box || !tab || box.scrollWidth <= box.clientWidth) return
    if (tab.offsetLeft < box.scrollLeft || tab.offsetLeft + tab.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: tab.offsetLeft - 8, behavior: 'smooth' })
    }
  }, [active])

  return (
    <Card id="overview-people" className={cn('min-w-0 scroll-mt-20', className)}>
      <CardHeader>
        <CardTitle>Danh sách theo nhóm</CardTitle>
        <CardDescription>{departmentName ? `Đang xem bộ phận ${departmentName}.` : 'Chọn một nhóm để xem từng người.'}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
            <Link to={link.to}>
              {link.label}
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Màn rộng xuống dòng khi hẹp; điện thoại giữ một dòng, vuốt ngang (gạch chân nằm trong khung cuộn). */}
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Nhóm nhân sự"
          className={cn('relative flex gap-x-0.5 overflow-x-auto border-b sm:flex-wrap sm:overflow-visible', NO_SCROLLBAR)}
        >
          {LIST_KEYS.map((k) => {
            const selected = k === active
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="overview-people-list"
                onClick={() => onTabChange(k)}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-1.5 rounded-t-md px-2 pt-1.5 pb-2.5 text-[13px] whitespace-nowrap transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  selected
                    ? 'font-medium text-foreground after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary sm:after:-bottom-px'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {listLabel(k, isToday)}
                <span
                  className={cn(
                    'min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-medium tabular-nums',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {lists[k].length}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs sm:min-w-48">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, email…"
              className="pl-8"
              aria-label="Tìm nhân sự"
            />
          </div>
          <Select value={department === ALL_DEPARTMENTS ? 'all' : department} onValueChange={(v) => onDepartmentChange(v === 'all' ? ALL_DEPARTMENTS : v)}>
            <SelectTrigger className="w-36 shrink-0 sm:w-48" aria-label="Lọc theo bộ phận">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bộ phận</SelectItem>
              {data.departments.map((d) => (
                <SelectItem key={d.id ?? NO_DEPARTMENT} value={departmentKey(d)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="w-full text-[13px] text-muted-foreground sm:ml-auto sm:w-auto">{listNote(active, lists, isToday, data.isSunday)}</span>
        </div>

        {/* Khung cuộn lấn sang lề phải của thẻ (-mr-3) rồi đệm lại (pr-3): chữ vẫn thẳng hàng với phần trên, thanh cuộn
            nằm ở lề thay vì đè sát số phút. */}
        <div className="border-t">
          <div id="overview-people-list" role="tabpanel" className="-mr-3 max-h-[28rem] overflow-y-auto pr-3 xl:h-[28rem]">
            {rows.length === 0 ? (
              query.trim() ? (
                <EmptyState icon={SearchX} title={`Không tìm thấy ai khớp với “${query.trim()}”`} note="Thử tên không dấu hoặc một phần email." />
              ) : (
                <EmptyState {...empty} />
              )
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)_auto]">
                    <PersonCell person={r.person} />
                    <p className="col-span-2 row-start-2 pl-11 text-[13px] text-muted-foreground sm:col-span-1 sm:row-start-auto sm:pl-0">{r.detail}</p>
                    <div className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">{r.aside}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
