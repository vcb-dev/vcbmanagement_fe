import { useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  FEEDBACK_STATUS_LABEL,
  type FeedbackStatus,
  type FeedbackView,
} from './part-time.types'
import { useReplyFeedback, useSheetFeedbacks } from './use-part-time'

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  open: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  manager: 'Quản lý',
  staff: 'Nhân sự',
}

function formatIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function FeedbackCard({
  feedback,
  sheetId,
  mode,
  readOnly,
}: {
  feedback: FeedbackView
  sheetId: string
  mode: 'staff' | 'manager'
  readOnly: boolean
}) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<FeedbackStatus>('in_progress')
  const reply = useReplyFeedback(sheetId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    await reply.mutateAsync({
      feedbackId: feedback.id,
      content: trimmed,
      status: mode === 'manager' ? status : undefined,
    })
    setContent('')
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className={cn('font-medium', STATUS_STYLE[feedback.status])}>
          {FEEDBACK_STATUS_LABEL[feedback.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatIso(feedback.createdAt)}</span>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-sm">
        <p className="font-medium text-foreground">{feedback.content}</p>
      </div>

      {feedback.replies.length > 0 && (
        <div className="space-y-2 border-l-2 pl-3">
          {feedback.replies.map((r) => (
            <div key={r.id} className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{r.user.name}</span>
                <span>({ROLE_LABEL[r.user.role] || r.user.role})</span>
                <span>·</span>
                <span>{formatIso(r.createdAt)}</span>
              </div>
              <p className="text-foreground">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="pt-2 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung trả lời..."
            rows={2}
            maxLength={2000}
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            {mode === 'manager' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trạng thái:</span>
                <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Mới gửi</SelectItem>
                    <SelectItem value="in_progress">Đang xử lý</SelectItem>
                    <SelectItem value="resolved">Đã xử lý</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div />
            )}

            <Button size="sm" type="submit" disabled={reply.isPending || !content.trim()}>
              {reply.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function FeedbackThread({
  sheetId,
  mode,
  readOnly,
}: {
  sheetId: string
  mode: 'staff' | 'manager'
  readOnly: boolean
}) {
  const { data: feedbacks, isLoading } = useSheetFeedbacks(sheetId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải phản hồi...</p>
  }

  if (!feedbacks || feedbacks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trao đổi phản hồi công ({feedbacks.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedbacks.map((fb) => (
          <FeedbackCard
            key={fb.id}
            feedback={fb}
            sheetId={sheetId}
            mode={mode}
            readOnly={readOnly}
          />
        ))}
      </CardContent>
    </Card>
  )
}
