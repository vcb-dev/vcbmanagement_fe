export type UserRole = 'admin' | 'manager' | 'staff'

export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}
