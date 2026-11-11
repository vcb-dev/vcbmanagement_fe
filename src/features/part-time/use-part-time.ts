import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import type { FeedbackView, PartTimeDayView } from './part-time.types'

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params })
  return res.data.data
}

/** Tải chi tiết các ca làm việc part-time của người dùng trong tháng. */
export function useMyPartTimeDays(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ['attendance', 'my-timesheet', month, 'days'],
    queryFn: () => get<PartTimeDayView[]>('/timesheets/me/days', { month }),
    enabled,
    placeholderData: (prev) => prev,
  })
}

/** Tải danh sách feedback cùng các phản hồi của một bản chốt. */
export function useSheetFeedbacks(
  sheetId: string | null,
  sheetType: 'part_time' | 'full_time' = 'part_time',
) {
  return useQuery({
    queryKey: ['part-time', 'feedbacks', sheetId, sheetType],
    queryFn: () =>
      get<FeedbackView[]>(
        `/timesheets/${sheetType === 'part_time' ? 'part-time' : 'full-time'}/${sheetId}/feedbacks`,
      ),
    enabled: Boolean(sheetId),
  })
}

/** Nhân viên xác nhận bản chốt công part-time. */
export function useConfirmSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message?: string; data: unknown }>(
        `/timesheets/part-time/${id}/confirm`,
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã xác nhận công tháng')
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] })
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Nhân viên báo sai bản chốt công part-time. */
export function useDisputeSheet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiClient.post<{ message?: string; data: unknown }>(
        `/timesheets/part-time/${id}/dispute`,
        { content },
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã gửi báo sai')
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] })
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
