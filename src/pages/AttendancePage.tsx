import {
  AlarmClock,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserAvatar } from '@/components/layout/nav-user'
import { MonthNav } from '@/components/month-nav'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendancePhotos } from '@/features/attendance/AttendancePhoto'
import { AttendanceStatus, ShiftTimes } from '@/features/attendance/AttendanceStatus'
import { ClockCard } from '@/features/attendance/ClockCard'
import { useAttendanceDaily, useAttendanceMonth } from '@/features/attendance/use-attendance'
import { useMe } from '@/features/auth/use-auth'
import {
  formatDuration,
  formatMonth,
  formatTime,
  formatWorkDate,
  shiftYmd,
  todayYmd,
} from '@/lib/format'
import { ROLE_LABEL, displayName, isManagerRole } from '@/lib/user-display'

export function AttendancePage() {
  const { data: user } = useMe()
  const [params, setParams] = useSearchParams()
  const isManager = isManagerRole(user?.role)
  const tab = isManager && params.get('tab') === 'team' ? 'team' : 'me'

  const currentMonth = todayYmd().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const { data: monthData, isPending } = useAttendanceMonth(month)

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 overflow-x-clip p-3 pb-8 sm:space-y-6 sm:p-4 md:p-6 lg:p-8">
      <PageHeader hideTitleOnPhone title="Chấm công" />

      <ClockCard />

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
            <CardHeader className="max-sm:grid-cols-1">
              <CardTitle>Lịch sử chấm công</CardTitle>
              <CardDescription>Các lượt vào ca, ra ca trong tháng</CardDescription>
              <CardAction className="max-sm:col-start-1 max-sm:row-auto max-sm:justify-self-start">
                <MonthNav month={month} max={currentMonth} onChange={setMonth} />
              </CardAction>
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
                      <TableHead>Tăng ca</TableHead>
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
                        <TableCell className="tabular-nums text-sm">
                          {r.overtime?.inAt ? `${formatTime(r.overtime.inAt)}–${formatTime(r.overtime.outAt)}` : '—'}
                        </TableCell>
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
      <CardHeader className="max-sm:grid-cols-1">
        <CardTitle>Bảng công nhân viên</CardTitle>
        <CardDescription className="capitalize">{formatWorkDate(date, { long: true })}</CardDescription>
        <CardAction className="flex items-center gap-1 max-sm:col-start-1 max-sm:row-auto max-sm:justify-self-start">
          <Button variant="outline" size="icon" className="size-11 md:size-8" onClick={() => setDate(shiftYmd(date, -1))} aria-label="Ngày trước">
            <ChevronLeft />
          </Button>
          <Button variant="outline" className="h-11 min-h-11 md:h-8" onClick={() => setDate(today)} disabled={date === today}>
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11 md:size-8"
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
