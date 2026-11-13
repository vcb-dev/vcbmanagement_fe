import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ConfirmationStatus, MyTimesheet } from './my-timesheet.types'

/** Key nằm dưới `attendance` để chấm công xong số liệu tháng tự tải lại. */
export function useMyTimesheet(month: string) {
  return useQuery({
    queryKey: ['attendance', 'my-timesheet', month],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MyTimesheet }>('/timesheets/me', { params: { month } })
      return res.data.data
    },
    placeholderData: (prev) => prev,
  })
}

/** Xác nhận công tháng của chính mình. Lỗi (vd số vừa đổi) cũng tải lại để thấy số mới nhất. */
export function useConfirmMyTimesheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { month: string; version: string }) => {
      const res = await apiClient.post<{ data: { status: ConfirmationStatus; confirmedAt: string } }>(
        '/timesheets/me/confirm',
        input,
      )
      return res.data.data
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance', 'full-time-timesheets'] }),
      ]),
  })
}
