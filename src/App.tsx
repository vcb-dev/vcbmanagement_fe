import { useQueryClient } from '@tanstack/react-query'
import { lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { markLoggedOut } from '@/features/auth/use-auth'
import { setSessionExpiredHandler } from '@/lib/api-client'

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const AttendancePage = lazy(() => import('@/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })))
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const FacePage = lazy(() => import('@/pages/FacePage').then((m) => ({ default: m.FacePage })))
const FaceReviewPage = lazy(() => import('@/pages/FaceReviewPage').then((m) => ({ default: m.FaceReviewPage })))
const MyTimesheetPage = lazy(() => import('@/pages/MyTimesheetPage').then((m) => ({ default: m.MyTimesheetPage })))
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const LatePage = lazy(() => import('@/pages/LatePage').then((m) => ({ default: m.LatePage })))
const PartTimeTimesheetsPage = lazy(() => import('@/pages/PartTimeTimesheetsPage').then((m) => ({ default: m.PartTimeTimesheetsPage })))
const AnnualLeavesPage = lazy(() => import('@/pages/AnnualLeavesPage').then((m) => ({ default: m.AnnualLeavesPage })))
const FeedbacksPage = lazy(() => import('@/pages/FeedbacksPage').then((m) => ({ default: m.FeedbacksPage })))

function useSessionExpiredRedirect() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setSessionExpiredHandler(() => {
      markLoggedOut(queryClient)
      if (window.location.pathname !== '/login') navigate('/login', { replace: true })
    })
    return () => setSessionExpiredHandler(null)
  }, [navigate, queryClient])
}

export default function App() {
  useSessionExpiredRedirect()

  return (
    <>
      <Toaster richColors position="top-center" closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/my-timesheet" element={<MyTimesheetPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/face" element={<FacePage />} />
            <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
              <Route path="/feedbacks" element={<FeedbacksPage />} />
              <Route path="/face/review" element={<FaceReviewPage />} />
              <Route path="/late" element={<LatePage />} />
              <Route path="/part-time-timesheets" element={<PartTimeTimesheetsPage />} />
              <Route path="/annual-leaves" element={<AnnualLeavesPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
