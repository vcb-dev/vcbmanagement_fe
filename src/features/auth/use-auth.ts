import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { authApi } from './auth.api'
import type { User } from './auth.types'

export const ME_QUERY_KEY = ['auth', 'me'] as const

/** `null` = đã xác định là chưa đăng nhập. Giữ trong cache để trang /login không gọi lại /auth/me liên tục. */
export function markLoggedOut(queryClient: QueryClient) {
  queryClient.clear()
  queryClient.setQueryData<User | null>(ME_QUERY_KEY, null)
}

export function useMe() {
  return useQuery<User | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) return null
        throw err
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
    retryDelay: 800,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => queryClient.setQueryData<User | null>(ME_QUERY_KEY, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      markLoggedOut(queryClient)
      navigate('/login', { replace: true })
    },
  })
}
