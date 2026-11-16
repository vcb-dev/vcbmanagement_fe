import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ME_QUERY_KEY } from '@/features/auth/use-auth'
import { apiClient } from '@/lib/api-client'
import type { UserProfile, UserProfileInput } from './users.types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserProfile[] }>('/users')
      return res.data.data
    },
  })
}

/** Lỗi lưu hiện ngay trong form nên không cần toast. */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UserProfileInput }) => {
      const res = await apiClient.patch<{ data: UserProfile }>(`/users/${id}`, input)
      return res.data.data
    },
    onSuccess: () => {
      toast.success('Đã lưu hồ sơ nhân sự')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      // Số người theo bộ phận, và lịch ca nếu đang sửa chính mình.
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
    },
  })
}
