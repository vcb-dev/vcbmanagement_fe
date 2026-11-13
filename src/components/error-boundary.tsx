import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
        <p className="text-lg font-semibold">Không tải được giao diện</p>
        <p className="max-w-sm text-sm text-muted-foreground">Safari trên điện thoại đôi khi chặn lần tải đầu. Hãy tải lại trang.</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Tải lại
        </Button>
      </div>
    )
  }
}
