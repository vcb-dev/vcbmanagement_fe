import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { toast } from 'sonner'
import { homePath, markLoggedOut, useMe } from '@/features/auth/use-auth'
import { setSessionExpiredHandler } from '@/lib/api-client'
import { LEAVE_REVIEWER_ROLES, MANAGER_ROLES, STAFF_ROLES } from '@/lib/user-display'
import { MyTimesheetPage } from '@/pages/MyTimesheetPage'

const AttendancePage = lazy(() => import('@/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })))

const AttendanceBoardPage = lazy(() =>
  import('@/pages/AttendanceBoardPage').then((m) => ({ default: m.AttendanceBoardPage })),
)
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const FacePage = lazy(() => import('@/pages/FacePage').then((m) => ({ default: m.FacePage })))
const FaceReviewPage = lazy(() => import('@/pages/FaceReviewPage').then((m) => ({ default: m.FaceReviewPage })))
const MyFeedbacksPage = lazy(() => import('@/pages/MyFeedbacksPage').then((m) => ({ default: m.MyFeedbacksPage })))
const MyLeaveRequestsPage = lazy(() =>
  import('@/pages/MyLeaveRequestsPage').then((m) => ({ default: m.MyLeaveRequestsPage })),
)
const LeaveRequestsPage = lazy(() => import('@/pages/LeaveRequestsPage').then((m) => ({ default: m.LeaveRequestsPage })))
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const LatePage = lazy(() => import('@/pages/LatePage').then((m) => ({ default: m.LatePage })))
const PartTimeTimesheetsPage = lazy(() => import('@/pages/PartTimeTimesheetsPage').then((m) => ({ default: m.PartTimeTimesheetsPage })))
const AnnualLeavesPage = lazy(() => import('@/pages/AnnualLeavesPage').then((m) => ({ default: m.AnnualLeavesPage })))
const FeedbacksPage = lazy(() => import('@/pages/FeedbacksPage').then((m) => ({ default: m.FeedbacksPage })))
const OvertimePage = lazy(() => import('@/pages/OvertimePage').then((m) => ({ default: m.OvertimePage })))
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const MonthlyTimesheetsPage = lazy(() =>
  import('@/pages/MonthlyTimesheetsPage').then((m) => ({ default: m.MonthlyTimesheetsPage })),
)

function useSessionExpiredRedirect() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setSessionExpiredHandler(() => {
      toast.dismiss()
      markLoggedOut(queryClient)
      if (window.location.pathname !== '/login') navigate('/login', { replace: true })
    })
    return () => setSessionExpiredHandler(null)
  }, [navigate, queryClient])
}

/** Trang chủ `/`: admin / quản lý vào Tổng quan, nhân viên vào Công của tôi. */
function HomeRedirect() {
  const { data: user, isPending } = useMe()
  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-muted-foreground">
        Đang tải…
      </div>
    )
  }
  if (!user) return null
  return <Navigate to={homePath(user.role)} replace />
}

export default function App() {
  useSessionExpiredRedirect()

  return (
    <>
      <Toaster closeButton />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route element={<ProtectedRoute roles={STAFF_ROLES} />}>
              <Route path="/my-timesheet" element={<MyTimesheetPage />} />
              <Route path="/my-feedbacks" element={<MyFeedbacksPage />} />
              <Route path="/my-leave-requests" element={<MyLeaveRequestsPage />} />
            </Route>
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/face" element={<FacePage />} />
            <Route element={<ProtectedRoute roles={MANAGER_ROLES} />}>
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/feedbacks" element={<FeedbacksPage />} />
              <Route path="/face/review" element={<FaceReviewPage />} />
              <Route path="/attendance-board" element={<AttendanceBoardPage />} />
              <Route path="/monthly-timesheets" element={<MonthlyTimesheetsPage />} />
              <Route path="/overtime" element={<OvertimePage />} />
              <Route path="/late" element={<LatePage />} />
              <Route path="/part-time-timesheets" element={<PartTimeTimesheetsPage />} />
              <Route path="/annual-leaves" element={<AnnualLeavesPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={LEAVE_REVIEWER_ROLES} />}>
              <Route path="/leave-requests" element={<LeaveRequestsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
