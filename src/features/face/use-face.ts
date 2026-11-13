import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import type { FaceAdminRow, FaceMe, FaceProfileStatus, LivenessStep, ScanKind } from './face.types'

export interface ScanStartResult {
  sessionId: string
  kind: ScanKind
  steps: LivenessStep[]
  stepIndex: number
  hint: string
}

export interface ScanFrameResult {
  done: boolean
  kind: ScanKind
  sessionId?: string
  stepIndex: number
  steps: LivenessStep[]
  hint: string
  poseOk?: boolean
  streak?: number
  saving?: boolean
  livenessExpiresAt?: string
  me?: FaceMe
}

const KEY = ['face'] as const

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params })
  return res.data.data
}

export function useFaceMe() {
  return useQuery({
    queryKey: [...KEY, 'me'],
    queryFn: () => get<FaceMe>('/face/me'),
  })
}

export function useStartScan() {
  return useMutation({
    mutationFn: async (kind: ScanKind) => {
      const res = await apiClient.post<{ data: ScanStartResult }>('/face/scan/start', { kind })
      return res.data.data
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useScanFrame() {
  return useMutation({
    mutationFn: async ({ sessionId, frame }: { sessionId: string; frame: Blob }) => {
      const form = new FormData()
      form.append('sessionId', sessionId)
      form.append('frame', frame, 'frame.jpg')
      const res = await apiClient.post<{ data: ScanFrameResult }>('/face/scan/frame', form)
      return res.data.data
    },
  })
}

export function useFaceAdmin(status?: FaceProfileStatus) {
  return useQuery({
    queryKey: [...KEY, 'admin', status ?? 'all'],
    queryFn: () => get<FaceAdminRow[]>('/face/admin', status ? { status } : undefined),
    staleTime: 15_000,
    retry: 1,
    placeholderData: (prev) => prev,
  })
}

export function useReviewFace() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: KEY })
    void queryClient.invalidateQueries({ queryKey: ['attendance'] })
  }
  const approve = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/face/admin/${userId}/approve`),
    onSuccess: () => {
      toast.success('Đã duyệt khuôn mặt')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const reject = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiClient.post(`/face/admin/${userId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Đã từ chối đăng ký')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  const remove = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/face/admin/${userId}`),
    onSuccess: () => {
      toast.success('Đã xoá đăng ký khuôn mặt')
      invalidate()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
  return { approve, reject, remove }
}
