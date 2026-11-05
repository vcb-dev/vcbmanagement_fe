import { apiClient, clearCsrfMemory } from '@/lib/api-client'
import type { ApiResponse, LoginPayload, User } from './auth.types'

export const authApi = {
  async me(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me')
    return res.data.data
  },

  async login(payload: LoginPayload): Promise<User> {
    const res = await apiClient.post<ApiResponse<{ user: User }>>('/auth/login', payload)
    return res.data.data.user
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearCsrfMemory()
    }
  },
}
