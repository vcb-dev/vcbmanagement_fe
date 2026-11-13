import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import type { FeedbackReplyView } from '@/features/part-time/part-time.types'
import type {
  FeedbackCounts,
  FeedbackDetail,
  FeedbackListItem,
  FeedbackListParams,
  FeedbackSheetOption,
  SheetType,
} from './feedbacks.types'

export function useFeedbacks(params: FeedbackListParams, enabled = true) {
  return useQuery({
    queryKey: ['feedbacks', 'list', params],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (params.status) search.set('status', params.status)
      if (params.sheetType) search.set('sheetType', params.sheetType)
      if (params.q?.trim()) search.set('q', params.q.trim())
      search.set('page', String(params.page))

      const res = await apiClient.get<{
        data: {
          items: FeedbackListItem[]
          total: number
          page: number
          pageSize: number
        }
      }>(`/feedbacks?${search.toString()}`)
      return res.data.data
    },
    enabled,
    placeholderData: (prev) => prev,
  })
}

export function useFeedbackCounts(enabled = true) {
  return useQuery({
    queryKey: ['feedbacks', 'counts'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FeedbackCounts }>('/feedbacks/counts')
      return res.data.data
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useFeedbackDetail(id: string | null) {
  return useQuery({
    queryKey: ['feedbacks', 'detail', id],
    queryFn: async () => {
      if (!id) return null
      const res = await apiClient.get<{ data: FeedbackDetail }>(`/feedbacks/${id}`)
      return res.data.data
    },
    enabled: Boolean(id),
  })
}

export function useFeedbackSheetOptions(enabled = true) {
  return useQuery({
    queryKey: ['feedbacks', 'sheet-options'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FeedbackSheetOption[] }>('/feedbacks/sheet-options')
      return res.data.data
    },
    enabled,
  })
}

export function useCreateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { sheetType: SheetType; sheetId: string; content: string }) => {
      const res = await apiClient.post<{ message: string; data: FeedbackDetail }>('/feedbacks', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      void queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] })
    },
  })
}

export function useReplyToFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiClient.post<{ message: string; data: FeedbackReplyView }>(
        `/feedbacks/${id}/replies`,
        { content },
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã gửi trả lời')
      void queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{
        message: string
        data: { id: string; sheetStatus: string }
      }>(`/feedbacks/${id}`)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã xoá feedback')
      void queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })
}

