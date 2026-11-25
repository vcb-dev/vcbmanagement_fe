import type { EmploymentType, User, UserRole } from '@/features/auth/auth.types'

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  hr: 'HR',
  leader: 'Trưởng nhóm',
  staff: 'Nhân viên',
}

/** Thứ tự trong ô chọn vai trò. */
export const ROLE_OPTIONS: UserRole[] = ['admin', 'manager', 'hr', 'leader', 'staff']

/** Vào các màn quản lý; hr có quyền như quản lý. Khớp MANAGER_ROLES ở backend (src/common/utils/roles.ts). */
export const MANAGER_ROLES: UserRole[] = ['admin', 'manager', 'hr']

/** Dùng các màn của nhân viên: Công của tôi, Feedback của tôi, Đơn của tôi. */
export const STAFF_ROLES: UserRole[] = ['staff', 'leader']

export function isManagerRole(role: UserRole | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role)
}

/**
 * Duyệt đơn xin phép: leader cùng các vai trò quản lý. Khớp LEAVE_REVIEWER_ROLES ở backend.
 * Tạm thời leader nào cũng thấy và duyệt được mọi đơn, trừ đơn của chính mình.
 */
export const LEAVE_REVIEWER_ROLES: UserRole[] = [...MANAGER_ROLES, 'leader']

export function isLeaveReviewer(role: UserRole | undefined): boolean {
  return !!role && LEAVE_REVIEWER_ROLES.includes(role)
}

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: 'Full-time',
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
