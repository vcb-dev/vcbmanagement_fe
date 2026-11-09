import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { LateReport } from './late.types'

/** Key nằm dưới `attendance` để chấm công hoặc đổi mốc xong số liệu tự tải lại. */
export function useLateReport(month: string) {
  return useQuery({
    queryKey: ['attendance', 'late-report', month],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LateReport }>('/attendance/late', { params: { month } })
      return res.data.data
    },
  })
}
