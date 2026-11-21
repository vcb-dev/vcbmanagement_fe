import { useState } from 'react'
import { DepartmentList } from './DepartmentList'
import { RequestNote, StatGrid, type Stat } from './overview-parts'
import { ALL_DEPARTMENTS, approvalLink, minutesText, pct, workSplit, type ListKey, type Overview } from './overview.types'
import { PeoplePanel } from './PeoplePanel'

/**
 * Tab Ngày: 5 thẻ số (đi làm, không đi làm, đi muộn, xin đi muộn, xin về sớm), danh sách người theo nhóm và tình hình
 * từng bộ phận. Bấm thẻ số hoặc bộ phận để mở danh sách tương ứng.
 */
export function DayTab({ data, isToday }: { data: Overview; isToday: boolean }) {
  const [list, setList] = useState<ListKey | null>(null)
  const [department, setDepartment] = useState(ALL_DEPARTMENTS)
  const s = data.summary
  const { working, notWorking, scheduled } = workSplit(s.statuses)

  function showPeople() {
    document.getElementById('overview-people')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function selectList(next: ListKey) {
    setList(next)
    showPeople()
  }

  function selectDepartment(next: string) {
    setDepartment(next)
    if (next !== ALL_DEPARTMENTS) showPeople()
  }

  const stats: Stat[] = [
    {
      key: 'working',
      label: 'Đi làm',
      color: 'working',
      value: working,
      unit: `/ ${scheduled} người`,
      note:
        scheduled === 0
          ? data.isSunday
            ? 'Chủ nhật, không ai có lịch làm'
            : 'Không ai có lịch làm'
          : `${pct(working, scheduled)} người có lịch${s.statuses.offsite ? ` · ${s.statuses.offsite} làm ngoài VP` : ''}`,
      hint: `Có chấm công hoặc làm ngoài văn phòng, trên số người có lịch làm. Không tính ${s.statuses.off} người không có lịch (part-time không có ca, Chủ nhật).`,
    },
    {
      key: 'not-working',
      label: 'Không đi làm',
      color: 'notWorking',
      value: notWorking,
      unit: 'người',
      note: (
        <>
          {s.statuses.leave} nghỉ phép ·{' '}
          <span className={s.statuses.absent > 0 ? 'font-medium text-rose-700 dark:text-rose-400' : undefined}>
            {s.statuses.absent} {isToday ? 'chưa chấm công' : 'vắng'}
          </span>
        </>
      ),
      hint: 'Nghỉ phép (đơn đã duyệt hoặc chờ duyệt) và không chấm công mà không có đơn.',
      onClick: () => selectList(s.statuses.absent > 0 || s.statuses.leave === 0 ? 'absent' : 'leave'),
    },
    {
      key: 'late',
      label: 'Đi muộn',
      color: 'late',
      value: s.late,
      unit: 'người',
      note: s.late > 0 ? `Tổng ${minutesText(s.lateMinutes)}` : 'Không ai đi muộn',
      hint: 'Có ít nhất một ca vào muộn, đã trừ phần được phép của đơn xin đi muộn.',
      onClick: () => selectList('late'),
    },
    {
      key: 'late-requests',
      label: 'Xin đi muộn',
      color: 'request',
      value: s.lateRequests.total,
      unit: 'đơn',
      note: <RequestNote {...s.lateRequests} to={approvalLink({ type: 'late_arrival' })} />,
      hint: 'Đơn xin đi muộn cho ngày này, đã duyệt hoặc đang chờ duyệt.',
      onClick: () => selectList('lateRequests'),
    },
    {
      key: 'early-requests',
      label: 'Xin về sớm',
      color: 'request',
      value: s.earlyRequests.total,
      unit: 'đơn',
      note: <RequestNote {...s.earlyRequests} to={approvalLink({ type: 'early_leave' })} />,
      hint: 'Đơn xin về sớm cho ngày này, đã duyệt hoặc đang chờ duyệt.',
      onClick: () => selectList('earlyRequests'),
    },
  ]

  return (
    <div className="space-y-4">
      <StatGrid stats={stats} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <PeoplePanel
          data={data}
          isToday={isToday}
          tab={list}
          onTabChange={setList}
          department={department}
          onDepartmentChange={setDepartment}
        />
        <DepartmentList rows={data.departments} isToday={isToday} selected={department} onSelect={selectDepartment} />
      </div>
    </div>
  )
}
