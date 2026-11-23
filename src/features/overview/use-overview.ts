import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MonthOverview, Overview } from './overview.types'

/** Xem hôm nay thì tự tải lại mỗi phút để theo kịp người vừa chấm công. */
const LIVE_REFRESH_MS = 60_000

/**
 * Key nằm dưới `attendance`: chấm công, bổ sung giờ, duyệt đơn xin phép xong thì số liệu tự tải lại.
 * `enabled`: chỉ tải tab đang mở.
 */
export function useOverview(date: string, { isToday, enabled }: { isToday: boolean; enabled: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'overview', 'day', date],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Overview }>('/overview', { params: { date } })
      return res.data.data
    },
    placeholderData: keepPreviousData,
    refetchInterval: isToday ? LIVE_REFRESH_MS : false,
    staleTime: 30_000,
    enabled,
  })
}

/** Tháng tính tới hết hôm qua nên không cần tự tải lại. */
export function useOverviewMonth(month: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'overview', 'month', month],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MonthOverview }>('/overview/month', { params: { month } })
      return res.data.data
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}
