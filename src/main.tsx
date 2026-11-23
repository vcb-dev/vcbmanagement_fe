import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/error-boundary'
import { TooltipProvider } from '@/components/ui/tooltip'
import { fetchMe, ME_QUERY_KEY } from '@/features/auth/use-auth'
import { todayYmd } from '@/lib/format'
import { apiClient } from '@/lib/api-client'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: { retry: 0 },
  },
})

void queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 5 * 60_000 }).then((user) => {
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) return
  const day = todayYmd()
  void queryClient
    .prefetchQuery({
      queryKey: ['attendance', 'overview', 'day', day],
      staleTime: 30_000,
      queryFn: async () => {
        const res = await apiClient.get<{ data: unknown }>('/overview', { params: { date: day } })
        return res.data.data
      },
    })
    .catch(() => queryClient.removeQueries({ queryKey: ['attendance', 'overview', 'day', day] }))
})

const bootMonth = todayYmd().slice(0, 7)
// Chạy song song với /auth/me. 401 (chưa đăng nhập) thì bỏ cache để lần đăng nhập sau không dính lỗi cũ.
void queryClient
  .prefetchQuery({
    queryKey: ['attendance', 'my-timesheet', bootMonth],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiClient.get<{ data: unknown }>('/timesheets/me', { params: { month: bootMonth } })
      return res.data.data
    },
  })
  .catch(() => queryClient.removeQueries({ queryKey: ['attendance', 'my-timesheet', bootMonth] }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
