import type { EmploymentType, UserRole } from '@/features/auth/auth.types'

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  employmentType: EmploymentType
  department: { id: string; name: string } | null
  /** "YYYY-MM-DD" */
  contractStartDate: string | null
  isActive: boolean
}

export interface UserProfileInput {
  departmentId: string | null
  employmentType: EmploymentType
  contractStartDate: string | null
}
