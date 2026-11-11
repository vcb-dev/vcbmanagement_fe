import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { withOvertimeDay, type OvertimeReport, type SetOvertimeDayResult } from './overtime.types'

/** Key nằm dưới `attendance` để chấm công xong số liệu tự tải lại. */
const reportKey = (month: string) => ['attendance', 'full-time-overtime-report', month] as const

export function useOvertimeReport(month: string) {
  return useQuery({
    queryKey: reportKey(month),
    queryFn: async () => {
      const res = await apiClient.get<{ data: OvertimeReport }>('/timesheets/full-time/overtimes', { params: { month } })
      return res.data.data
    },
    refetchInterval: 30_000,
  })
}

export function useSetOvertimeDay(month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, date, workdays }: { id: string; date: string; workdays: number }) => {
      const res = await apiClient.put<{ data: SetOvertimeDayResult }>(`/timesheets/full-time/${id}/overtimes/${date}`, {
        workdays,
      })
      return res.data.data
    },
    // Lượt tự tải lại đang chạy có thể mang số cũ về đè lên số vừa lưu.
    onMutate: () => queryClient.cancelQueries({ queryKey: reportKey(month) }),
    onSuccess: ({ date, workdays, row }) => {
      queryClient.setQueryData<OvertimeReport>(reportKey(month), (prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((r) => (r.id === row.id ? withOvertimeDay(r, date, workdays, row.overtimeWorkdays) : r)),
            }
          : prev,
      )
      // Cột tăng ca ở Chốt công tháng, drawer tăng ca của người đó và Công của tôi.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance', 'full-time-timesheets', month] }),
        queryClient.invalidateQueries({ queryKey: ['attendance', 'full-time-overtimes', row.id] }),
        queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] }),
      ])
    },
  })
}
