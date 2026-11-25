import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarHeart,
  CalendarRange,
  ChartPie,
  ClipboardCheck,
  ClockPlus,
  FileCheck,
  FileClock,
  MessageSquare,
  ScanFace,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/features/auth/auth.types'
import { LEAVE_REVIEWER_ROLES, MANAGER_ROLES, STAFF_ROLES } from '@/lib/user-display'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  description?: string
  roles?: UserRole[]
  badge?: 'feedbackOpen' | 'leavePending'
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        title: 'Tổng quan',
        url: '/overview',
        icon: ChartPie,
        description: 'Đi làm, không đi làm, đi muộn, đơn xin đi muộn / về sớm theo ngày và theo tháng',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Công của tôi',
        url: '/my-timesheet',
        icon: CalendarDays,
        description: 'Lịch chấm công và công tháng của bạn',
        // Admin và quản lý chỉ dùng các màn quản lý.
        roles: STAFF_ROLES,
      },
      {
        title: 'Feedback của tôi',
        url: '/my-feedbacks',
        icon: MessageSquare,
        description: 'Trao đổi với quản lý về công các tháng của bạn',
        roles: STAFF_ROLES,
      },
      {
        title: 'Đơn xin phép',
        url: '/my-leave-requests',
        icon: FileClock,
        description: 'Xin nghỉ phép, đi muộn, về sớm, làm việc ngoài văn phòng',
        roles: STAFF_ROLES,
      },
    ],
  },
  {
    label: 'Nhân sự',
    items: [
      { title: 'Chấm công', url: '/attendance', icon: CalendarClock, description: 'Vào ca, ra ca & bảng công' },
      { title: 'Khuôn mặt', url: '/face', icon: ScanFace, description: 'Đăng ký khuôn mặt của bạn' },
      {
        title: 'Duyệt khuôn mặt',
        url: '/face/review',
        icon: ShieldCheck,
        description: 'Duyệt đăng ký khuôn mặt nhân viên',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Bảng chấm công',
        url: '/attendance-board',
        icon: CalendarRange,
        description: 'Giờ vào, giờ ra từng ngày của mọi nhân sự, bổ sung giờ cho ngày đã qua',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Chốt công tháng',
        url: '/monthly-timesheets',
        icon: CalendarCheck,
        description: 'Công tháng của nhân sự full-time, tự cập nhật theo chấm công',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Tăng ca',
        url: '/overtime',
        icon: ClockPlus,
        description: 'Tăng ca theo ngày của nhân sự full-time',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Đi muộn',
        url: '/late',
        icon: TriangleAlert,
        description: 'Đi muộn theo ngày và theo mốc của nhân sự',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Công part-time',
        url: '/part-time-timesheets',
        icon: ClipboardCheck,
        description: 'Chốt công và trao đổi với nhân viên part-time',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Duyệt đơn xin phép',
        url: '/leave-requests',
        icon: FileCheck,
        description: 'Duyệt đơn nghỉ phép, đi muộn, về sớm, làm việc ngoài văn phòng',
        roles: LEAVE_REVIEWER_ROLES,
        badge: 'leavePending',
      },
      {
        title: 'Phép năm',
        url: '/annual-leaves',
        icon: CalendarHeart,
        description: 'Phép năm và ngày nghỉ các tháng của nhân sự full-time',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Bộ phận & giờ làm',
        url: '/departments',
        icon: Building2,
        description: 'Giờ ca của bộ phận và mốc đi muộn',
        roles: MANAGER_ROLES,
      },
      {
        title: 'Danh sách nhân sự',
        url: '/users',
        icon: Users,
        description: 'Bộ phận, loại nhân sự và ngày ký hợp đồng',
        roles: MANAGER_ROLES,
      },
    ],
  },
  {
    label: 'Tiện ích',
    items: [
      {
        title: 'Feedback',
        url: '/feedbacks',
        icon: MessageSquare,
        description: 'Trao đổi về bản chốt công các tháng',
        roles: MANAGER_ROLES,
        badge: 'feedbackOpen',
      },
      { title: 'Trợ lý AI', url: '/assistant', icon: Sparkles, description: 'Hỏi đáp với AI nội bộ' },
    ],
  },
]
