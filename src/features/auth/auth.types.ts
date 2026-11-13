export type UserRole = 'admin' | 'manager' | 'staff'
export type EmploymentType = 'full_time' | 'part_time'

export interface User {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  employmentType: EmploymentType
  departmentId: string | null
  contractStartDate: string | null
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
