import {
  AlarmClock,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  LogOut as EarlyIcon,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserAvatar } from '@/components/layout/nav-user'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendancePhotos } from '@/features/attendance/AttendancePhoto'
import { AttendanceStatus, ShiftTimes } from '@/features/attendance/AttendanceStatus'
import { ClockCard } from '@/features/attendance/ClockCard'
import { useAttendanceDaily, useAttendanceMonth, useAttendanceToday } from '@/features/attendance/use-attendance'
import { useMe } from '@/features/auth/use-auth'
import {
  formatDuration,
  formatMonth,
  formatWorkDate,
  shiftMonth,
  shiftYmd,
  todayYmd,
} from '@/lib/format'
import { ROLE_LABEL, displayName } from '@/lib/user-display'

export function AttendancePage() {
  const { data: user } = useMe()
  const { data: today } = useAttendanceToday()
  const [params, setParams] = useSearchParams()
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const tab = isManager && params.get('tab') === 'team' ? 'team' : 'me'

  const currentMonth = todayYmd().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const { data: monthData, isPending } = useAttendanceMonth(month)
  const s = monthData?.summary
  const shiftsIn = monthData?.records.reduce((n, r) => n + Number(!!r.morning.inAt) + Number(!!r.afternoon.inAt), 0) ?? 0
  const onTimeShifts = shiftsIn - (s?.lateCount ?? 0)
  const onTimeRate = shiftsIn > 0 ? Math.round((onTimeShifts / shiftsIn) * 100) : null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Chấm công"
        description={
          today
            ? `Ca sáng ${today.schedule.morningStart} – ${today.schedule.morningEnd}, ca chiều ${today.schedule.afternoonStart} – ${today.schedule.afternoonEnd} (giờ Việt Nam). Vào ca sau giờ bắt đầu tính đi muộn, ra trước giờ kết thúc tính về sớm.`
            : 'Theo dõi giờ vào, giờ ra và bảng công hàng tháng.'
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ClockCard />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tổng hợp {formatMonth(month).toLowerCase()}</CardTitle>
            <CardDescription>Số liệu chấm công của bạn trong tháng</CardDescription>
            <CardAction>
              <MonthNav month={month} max={currentMonth} onChange={setMonth} />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <StatCard icon={CalendarCheck2} label="Ngày công" value={`${s?.workDays ?? 0} ngày`} tone="indigo" loading={isPending} />
            <StatCard
              icon={Hourglass}
              label="Tổng giờ làm"
              value={formatDuration(s?.totalWorkedMinutes ?? 0)}
              tone="emerald"
              loading={isPending}
            />
            <StatCard
              icon={AlarmClock}
              label="Đi muộn"
              value={`${s?.lateCount ?? 0} lần`}
              hint={`Tổng ${formatDuration(s?.totalLateMinutes ?? 0)}`}
              tone="amber"
              loading={isPending}
            />
            <StatCard icon={EarlyIcon} label="Về sớm" value={`${s?.earlyLeaveCount ?? 0} lần`} tone="rose" loading={isPending} />
            <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Tỷ lệ đúng giờ</span>
                <span className="font-semibold tabular-nums">{onTimeRate === null ? '—' : `${onTimeRate}%`}</span>
              </div>
              <Progress value={onTimeRate ?? 0} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {shiftsIn > 0 ? `${onTimeShifts}/${shiftsIn} lượt vào ca đúng giờ` : 'Chưa có ngày công nào trong tháng'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setParams(v === 'team' ? { tab: 'team' } : {}, { replace: true })}
        className="gap-4"
      >
        {isManager && (
          <TabsList>
            <TabsTrigger value="me">
              <CalendarCheck2 />
              Lịch sử của tôi
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users />
              Bảng công nhân viên
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="me">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử chấm công</CardTitle>
              <CardDescription>{formatMonth(month)} · đổi tháng ở thẻ tổng hợp phía trên</CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <TableSkeleton />
              ) : monthData && monthData.records.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Ca sáng</TableHead>
                      <TableHead>Ca chiều</TableHead>
                      <TableHead>Số giờ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ảnh</TableHead>
                      <TableHead className="hidden md:table-cell">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthData.records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium capitalize">{formatWorkDate(r.workDate)}</TableCell>
                        <TableCell>
                          <ShiftTimes shift={r.morning} />
                        </TableCell>
                        <TableCell>
                          <ShiftTimes shift={r.afternoon} />
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDuration(r.workedMinutes)}</TableCell>
                        <TableCell>
                          <AttendanceStatus record={r} live={r.workDate === todayYmd()} />
                        </TableCell>
                        <TableCell>
                          <AttendancePhotos record={r} />
                        </TableCell>
                        <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                          {r.punches.map((p) => p.note).filter(Boolean).join(' · ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <Empty text={`Không có dữ liệu chấm công trong ${formatMonth(month).toLowerCase()}`} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team">
            <TeamBoard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function TeamBoard() {
  const today = todayYmd()
  const [date, setDate] = useState(today)
  const { data, isPending } = useAttendanceDaily(date)
  const s = data?.summary

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bảng công nhân viên</CardTitle>
        <CardDescription className="capitalize">{formatWorkDate(date, { long: true })}</CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setDate(shiftYmd(date, -1))} aria-label="Ngày trước">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(today)} disabled={date === today}>
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setDate(shiftYmd(date, 1))}
            disabled={date >= today}
            aria-label="Ngày sau"
          >
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <SummaryChip icon={Users} label="Tổng" value={s?.total} />
          <SummaryChip icon={UserCheck} label="Có mặt" value={s?.present} className="text-emerald-600 dark:text-emerald-400" />
          <SummaryChip icon={AlarmClock} label="Đi muộn" value={s?.late} className="text-amber-600 dark:text-amber-400" />
          <SummaryChip icon={UserX} label="Chưa chấm" value={s?.absent} className="text-muted-foreground" />
        </div>

        {isPending || !data ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead className="hidden sm:table-cell">Vai trò</TableHead>
                <TableHead>Ca sáng</TableHead>
                <TableHead>Ca chiều</TableHead>
                <TableHead>Số giờ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ảnh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map(({ user, record }) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} className="size-8 rounded-lg" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{displayName(user)}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>
                  </TableCell>
                  <TableCell>{record ? <ShiftTimes shift={record.morning} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{record ? <ShiftTimes shift={record.afternoon} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="tabular-nums">{formatDuration(record?.workedMinutes)}</TableCell>
                  <TableCell>
                    <AttendanceStatus record={record} live={date === today} />
                  </TableCell>
                  <TableCell>
                    <AttendancePhotos record={record} title={displayName(user)} />
                  </TableCell>
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

function MonthNav({ month, max, onChange }: { month: string; max: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Tháng trước">
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm font-medium">{formatMonth(month)}</span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= max}
        aria-label="Tháng sau"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Users
  label: string
  value?: number
  className?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm">
      <Icon className={`size-4 ${className ?? ''}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <CalendarCheck2 className="size-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
