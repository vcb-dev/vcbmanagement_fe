import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_BASE_URL, apiClient, getApiErrorMessage } from '@/lib/api-client'
import type {
  ApproverOption,
  CreateLeaveRequestInput,
  LeaveRequestDetail,
  LeaveRequestListParams,
  LeaveRequestPage,
} from './leave-requests.types'

const KEY = ['leave-requests'] as const

function searchOf(params: LeaveRequestListParams): string {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.approver) search.set('approver', params.approver)
  search.set('page', String(params.page))
  return search.toString()
}

/** Đơn của chính mình. */
export function useMyLeaveRequests(params: LeaveRequestListParams) {
  return useQuery({
    queryKey: [...KEY, 'mine', params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeaveRequestPage }>(`/leave-requests/me?${searchOf(params)}`)
      return res.data.data
    },
    placeholderData: keepPreviousData,
  })
}

/** Mọi đơn, cho admin / quản lý duyệt. */
export function useLeaveRequests(params: LeaveRequestListParams) {
  return useQuery({
    queryKey: [...KEY, 'all', params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeaveRequestPage }>(`/leave-requests?${searchOf(params)}`)
      return res.data.data
    },
    placeholderData: keepPreviousData,
  })
}

export function useLeaveRequestDetail(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeaveRequestDetail }>(`/leave-requests/${id}`)
      return res.data.data
    },
    enabled: Boolean(id),
  })
}

/** Số đơn chờ duyệt, cho huy hiệu trên menu của admin / quản lý. */
export function useLeavePendingCount(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'pending-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { pending: number; pendingForMe: number } }>('/leave-requests/pending-count')
      return res.data.data
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useApprovers(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'approvers'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ApproverOption[] }>('/leave-requests/approvers')
      return res.data.data
    },
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Link mở file đính kèm: BE chuyển hướng sang link R2 ký sẵn. */
export function attachmentUrl(requestId: string, attachmentId: string): string {
  return `${API_BASE_URL}/leave-requests/${requestId}/attachments/${attachmentId}`
}

/** Duyệt đơn làm đổi đi muộn, phép năm, công tháng: làm mới các màn đó. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: KEY })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    void queryClient.invalidateQueries({ queryKey: ['annual-leaves'] })
  }
}

export function useCreateLeaveRequest() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async (input: CreateLeaveRequestInput) => {
      const form = new FormData()
      const { attachments, ...fields } = input
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) form.append(key, String(value))
      }
      for (const file of attachments) form.append('attachments', file)
      const res = await apiClient.post<{ message: string; data: LeaveRequestDetail }>('/leave-requests', form)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      invalidate()
    },
  })
}

type Action = 'cancel' | 'approve' | 'reject'

export function useLeaveRequestAction() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: Action; note?: string }) => {
      const res = await apiClient.post<{ message: string; data: LeaveRequestDetail }>(
        `/leave-requests/${id}/${action}`,
        action === 'cancel' ? undefined : { note: note?.trim() || undefined },
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
