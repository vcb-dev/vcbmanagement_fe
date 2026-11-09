import type { EmploymentType, User, UserRole } from '@/features/auth/auth.types'

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  staff: 'Nhân viên',
}

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: 'Toàn thời gian',
  part_time: 'Part-time',
}

export function displayName(user: Pick<User, 'fullName' | 'email'>): string {
  return user.fullName?.trim() || user.email.split('@')[0]
}

export function initials(user: Pick<User, 'fullName' | 'email'>): string {
  const parts = displayName(user).split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}
