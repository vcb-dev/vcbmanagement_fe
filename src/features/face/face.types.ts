import type { User } from '@/features/auth/auth.types'

export type FaceProfileStatus = 'pending' | 'approved' | 'rejected'
export type LivenessStep = 'center' | 'left' | 'right'

export interface FaceProfileSummary {
  status: FaceProfileStatus
  submittedAt: string
  reviewedAt: string | null
  rejectReason: string | null
  photoCount: number
  photoLabels: string[]
}

export interface FaceMe {
  required: boolean
  userId: string
  profile: FaceProfileSummary | null
  livenessExpiresAt: string | null
}

export interface FaceAdminRow {
  userId: string
  status: FaceProfileStatus
  submittedAt: string
  reviewedAt: string | null
  rejectReason: string | null
  photoCount: number
  photoLabels: string[]
  photoUrls: string[]
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'>
}

export type ScanKind = 'enroll' | 'liveness'

export const FACE_STATUS_LABEL: Record<FaceProfileStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

export const STEP_LABEL: Record<LivenessStep, string> = {
  center: 'Nhìn thẳng vào camera',
  left: 'Quay mặt sang trái của bạn',
  right: 'Quay mặt sang phải của bạn',
}

export const ENROLL_STEPS = 3
