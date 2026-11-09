import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import type { Department, DepartmentInput, LateThreshold, LateThresholdInput } from './departments.types'

const DEPARTMENTS = ['departments'] as const
const THRESHOLDS = ['late-thresholds'] as const

async function get<T>(url: string): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url)
  return res.data.data
}

/** Giờ ca và mốc đổi thì lịch ca của chính người dùng và danh sách nhân sự cũng đổi theo. */
function refreshDependents(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: DEPARTMENTS })
  void queryClient.invalidateQueries({ queryKey: THRESHOLDS })
  void queryClient.invalidateQueries({ queryKey: ['users'] })
  void queryClient.invalidateQueries({ queryKey: ['attendance'] })
}

export function useDepartments() {
  return useQuery({ queryKey: DEPARTMENTS, queryFn: () => get<Department[]>('/departments') })
}

/** Lỗi lưu hiện ngay trong form nên không cần toast. */
export function useSaveDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DepartmentInput }) => {
      const res = id
        ? await apiClient.patch<{ data: Department }>(`/departments/${id}`, input)
        : await apiClient.post<{ data: Department }>('/departments', input)
      return res.data.data
    },
    onSuccess: (department, { id }) => {
      toast.success(id ? `Đã lưu bộ phận ${department.name}` : `Đã thêm bộ phận ${department.name}`)
      refreshDependents(queryClient)
    },
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/departments/${id}`),
    onSuccess: () => {
      toast.success('Đã xoá bộ phận')
      refreshDependents(queryClient)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useLateThresholds() {
  return useQuery({ queryKey: THRESHOLDS, queryFn: () => get<LateThreshold[]>('/late-thresholds') })
}

export function useSaveLateThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LateThresholdInput }) =>
      id ? apiClient.patch(`/late-thresholds/${id}`, input) : apiClient.post('/late-thresholds', input),
    onSuccess: (_res, { id }) => {
      toast.success(id ? 'Đã lưu mốc đi muộn' : 'Đã thêm mốc đi muộn')
      refreshDependents(queryClient)
    },
  })
}

export function useDeleteLateThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/late-thresholds/${id}`),
    onSuccess: () => {
      toast.success('Đã xoá mốc đi muộn')
      refreshDependents(queryClient)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
