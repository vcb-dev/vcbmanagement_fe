import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MyTimesheet } from './my-timesheet.types'

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
