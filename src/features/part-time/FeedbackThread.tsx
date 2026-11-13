import { MessageSquarePlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatFeedbackTime, replyNextStatus } from '@/features/feedbacks/feedback-format'
import { useFeedbacks, useReplyToFeedback } from '@/features/feedbacks/use-feedbacks'
import { formatMonth } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { DisputeDialog } from './DisputeDialog'
import {
  FEEDBACK_STATUS_LABEL,
  type FeedbackStatus,
  type FeedbackView,
} from './part-time.types'
import { useSheetFeedbacks } from './use-part-time'

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  open: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  resolved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}


function FeedbackCard({
  feedback,
  mode,
  readOnly,
}: {
  feedback: FeedbackView
  mode: 'staff' | 'manager'
  readOnly: boolean
}) {
  const [content, setContent] = useState('')
  const reply = useReplyToFeedback()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    try {
      await reply.mutateAsync({ id: feedback.id, content: trimmed })
      setContent('')
    } catch {
      // Lỗi đã được báo bằng toast trong useReplyToFeedback.
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className={cn('font-medium', STATUS_STYLE[feedback.status])}>
          {FEEDBACK_STATUS_LABEL[feedback.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatFeedbackTime(feedback.createdAt)}</span>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-sm">
        <p className="whitespace-pre-wrap font-medium text-foreground">{feedback.content}</p>
      </div>

      {feedback.replies.length > 0 && (
        <div className="space-y-2 border-l-2 pl-3">
          {feedback.replies.map((r) => (
            <div key={r.id} className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{r.user.name}</span>
                  <span>({ROLE_LABEL[r.user.role]})</span>
                  <span>·</span>
                  <span>{formatFeedbackTime(r.createdAt)}</span>
                </div>
                <span>
                  Trạng thái sau trả lời:{' '}
                  <strong className="text-foreground">
                    {FEEDBACK_STATUS_LABEL[r.status]}
                  </strong>
                </span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {readOnly ? (
        <p className="pt-1 text-xs text-muted-foreground">
          Bản chốt công đã được xác nhận, không trả lời thêm được.
        </p>
      ) : (
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
            <span className="text-xs text-muted-foreground">
              Trạng thái sau khi gửi:{' '}
              <strong className="text-foreground">
                {FEEDBACK_STATUS_LABEL[replyNextStatus(mode === 'manager')]}
              </strong>
            </span>

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
  sheetType = 'part_time',
  mode,
  readOnly,
  currentMonth,
  onSelectMonth,
}: {
  sheetId: string | null
  sheetType?: 'part_time' | 'full_time'
  mode: 'staff' | 'manager'
  readOnly: boolean
  currentMonth?: string
  onSelectMonth?: (month: string) => void
}) {
  const [disputeOpen, setDisputeOpen] = useState(false)
  const { data: feedbacks, isLoading } = useSheetFeedbacks(sheetId, sheetType)
  const { data: allMyFeedbacks } = useFeedbacks({ page: 1 }, mode === 'staff')
  const myItems = allMyFeedbacks?.items

  const otherMonths = useMemo(() => {
    if (mode !== 'staff' || !myItems || !currentMonth) return []
    const map = new Map<string, { count: number; openCount: number }>()
    for (const item of myItems) {
      const m = item.sheet.month
      if (m === currentMonth) continue
      const cur = map.get(m) ?? { count: 0, openCount: 0 }
      cur.count += 1
      if (item.status !== 'resolved') cur.openCount += 1
      map.set(m, cur)
    }
    return Array.from(map.entries())
      .map(([month, info]) => ({ month, ...info }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }, [myItems, currentMonth, mode])

  if (mode === 'manager') {
    if (isLoading && sheetId) {
      return <p className="text-sm text-muted-foreground">Đang tải phản hồi...</p>
    }
    if (!sheetId || !feedbacks || feedbacks.length === 0) {
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
              mode={mode}
              readOnly={readOnly}
            />
          ))}
        </CardContent>
      </Card>
    )
  }

  const count = feedbacks?.length ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Feedback bản chốt công{count > 0 ? ` (${count})` : ''}
        </CardTitle>
        <CardDescription>
          Trao đổi và phản hồi với quản lý về số liệu bản chốt công tháng.
        </CardDescription>
        {sheetId && !readOnly && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDisputeOpen(true)}
            >
              <MessageSquarePlus className="size-4" />
              Gửi feedback
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!sheetId ? (
          <p className="text-sm text-muted-foreground">
            Tháng này chưa chốt công nên chưa có phản hồi. Khi quản lý chốt công tháng, bạn có thể xác nhận hoặc gửi feedback tại đây.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải phản hồi...</p>
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có phản hồi nào cho bản chốt công tháng này.
            {!readOnly && ' Nếu số liệu công cần kiểm tra lại, bấm "Gửi feedback" hoặc "Báo sai" để trao đổi với quản lý.'}
          </p>
        ) : (
          feedbacks!.map((fb) => (
            <FeedbackCard
              key={fb.id}
              feedback={fb}
              mode={mode}
              readOnly={readOnly}
            />
          ))
        )}

        {otherMonths.length > 0 && onSelectMonth && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>Feedback ở tháng khác:</span>
            {otherMonths.map((item) => (
              <Button
                key={item.month}
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => onSelectMonth(item.month)}
                className="h-7 gap-1.5 text-xs"
              >
                <span>{formatMonth(item.month)}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-4 px-1 text-[10px]',
                    item.openCount > 0 && 'border-rose-300 text-rose-600',
                  )}
                >
                  {item.count}
                </Badge>
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      {sheetId && (
        <DisputeDialog
          sheetId={sheetId}
          sheetType={sheetType}
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
        />
      )}
    </Card>
  )
}
