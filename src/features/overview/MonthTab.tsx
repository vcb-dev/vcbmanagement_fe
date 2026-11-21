import { CalendarClock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MonthDepartments } from './MonthDepartments'
import { EmptyState, RequestNote, StatGrid, type Stat } from './overview-parts'
import { approvalLink, minutesText, rateText, workSplit, type MonthOverview } from './overview.types'
import { TopLateCard } from './TopLateCard'
import { TrendChart } from './TrendChart'

/**
 * Tab Tháng: 5 thẻ số cộng dồn các ngày đã xong của tháng (tỷ lệ đi làm, không đi làm, đi muộn, xin đi muộn,
 * xin về sớm), biểu đồ từng ngày, bảng theo bộ phận và người đi muộn nhiều nhất. Bấm một ngày để mở tab Ngày.
 */
export function MonthTab({ data, onSelectDate }: { data: MonthOverview; onSelectDate: (date: string) => void }) {
  if (data.to === null) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="Tháng này chưa có ngày nào kết thúc"
          note="Số liệu tháng tính tới hết hôm qua. Xem tình hình hôm nay ở tab Ngày."
        />
      </Card>
    )
  }

  const { working, notWorking } = workSplit(data.statuses)
  const stats: Stat[] = [
    {
      key: 'rate',
      label: 'Tỷ lệ đi làm',
      color: 'working',
      value: rateText(data.attendanceRate),
      note: `${working} lượt đi làm trong ${data.days} ngày`,
      hint: 'Lượt đi làm (có chấm công hoặc làm ngoài văn phòng) trên lượt có lịch làm. Một lượt là một người trong một ngày.',
    },
    {
      key: 'not-working',
      label: 'Không đi làm',
      color: 'notWorking',
      value: notWorking,
      unit: 'lượt',
      note: (
        <>
          {data.statuses.leave} nghỉ phép ·{' '}
          <span className={data.statuses.absent > 0 ? 'font-medium text-rose-700 dark:text-rose-400' : undefined}>
            {data.statuses.absent} vắng
          </span>
        </>
      ),
      hint: 'Nghỉ phép (đơn đã duyệt hoặc chờ duyệt) và không chấm công mà không có đơn, cộng qua các ngày.',
    },
    {
      key: 'late',
      label: 'Đi muộn',
      color: 'late',
      value: data.lateShifts,
      unit: 'lần',
      note: data.lateShifts > 0 ? `${data.latePeople} người · tổng ${minutesText(data.lateMinutes)}` : 'Không ai đi muộn',
      hint: 'Mỗi ca vào muộn tính một lần, như màn Đi muộn; đã trừ phần được phép của đơn xin đi muộn.',
    },
    {
      key: 'late-requests',
      label: 'Xin đi muộn',
      color: 'request',
      value: data.lateRequests.total,
      unit: 'đơn',
      note: <RequestNote {...data.lateRequests} to={approvalLink({ type: 'late_arrival' })} />,
      hint: 'Đơn xin đi muộn trong tháng, đã duyệt hoặc đang chờ duyệt.',
    },
    {
      key: 'early-requests',
      label: 'Xin về sớm',
      color: 'request',
      value: data.earlyRequests.total,
      unit: 'đơn',
      note: <RequestNote {...data.earlyRequests} to={approvalLink({ type: 'early_leave' })} />,
      hint: 'Đơn xin về sớm trong tháng, đã duyệt hoặc đang chờ duyệt.',
    },
  ]

  return (
    <div className="space-y-4">
      <StatGrid stats={stats} />
      <TrendChart points={data.trend} onSelectDate={onSelectDate} />
      <div className="grid gap-4 xl:grid-cols-3">
        <MonthDepartments className="xl:col-span-2" rows={data.departments} />
        <TopLateCard items={data.topLate} />
      </div>
    </div>
  )
}
