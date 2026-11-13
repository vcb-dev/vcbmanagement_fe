import { useState } from 'react'
import { ExternalLink, Loader2, MessageSquare, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMe } from '@/features/auth/use-auth'
import { getApiErrorMessage } from '@/lib/api-client'
import { FEEDBACK_STATUS_LABEL } from '@/features/part-time/part-time.types'
import { EMPLOYMENT_LABEL, ROLE_LABEL, initials } from '@/lib/user-display'
import {
  formatFeedbackTime,
  replyNextStatus,
  sheetLabel,
  sheetLink,
} from './feedback-format'
import { FeedbackStatusBadge } from './FeedbackListPanel'
import { useDeleteFeedback, useFeedbackDetail, useReplyToFeedback } from './use-feedbacks'

interface FeedbackDetailPanelProps {
  id: string | null
  onDeleted?: () => void
}

export function FeedbackDetailPanel({ id, onDeleted }: FeedbackDetailPanelProps) {
  const { data: me } = useMe()
  const { data: detail, isLoading, isError, error } = useFeedbackDetail(id)
  const replyMutation = useReplyToFeedback()
  const deleteMutation = useDeleteFeedback()

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const isManagerOrAdmin = me?.role === 'admin' || me?.role === 'manager'
  const isAdmin = me?.role === 'admin'

  if (!id) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-8 text-center">
        <MessageSquare className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">Chưa chọn feedback</p>
        <p className="text-xs text-muted-foreground mt-1">
          Chọn một mục ở danh sách bên trái để xem chi tiết và trả lời.
        </p>
      </div>
    )
  }

  if (isError && !detail) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border bg-card p-8 text-center text-sm text-destructive">
        {getApiErrorMessage(error)}
      </div>
    )
  }

  if (isLoading || !detail) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border bg-card p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const dept = detail.user.departmentName ?? 'Chưa có bộ phận'
  const emp = detail.user.employmentType
    ? EMPLOYMENT_LABEL[detail.user.employmentType]
    : 'Chưa phân loại'
  const avatarLetters = initials({ fullName: detail.user.name, email: detail.user.name })

  const link = me ? sheetLink(detail.sheet, me.role) : null
  const isSheetConfirmed = detail.sheet.confirmationStatus === 'confirmed'

  // Format month MM/YYYY for delete confirm dialog
  const [sheetY, sheetM] = detail.sheet.month.split('-')
  const formattedMonth = `${sheetM ?? '01'}/${sheetY ?? ''}`

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(detail.id)
    setConfirmDeleteOpen(false)
    onDeleted?.()
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-5 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {avatarLetters}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              {detail.user.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {dept} · {emp} · gửi {formatFeedbackTime(detail.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FeedbackStatusBadge status={detail.status} />
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80"
            >
              <Trash2 className="size-3.5 mr-1" />
              Xóa feedback
            </Button>
          )}
        </div>
      </div>

      {/* Sheet Info Box */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3.5 py-2.5 text-xs border border-border/50">
        <span className="font-medium text-foreground/80">
          {sheetLabel(detail.sheet)}
        </span>
        {link && (
          <Link
            to={link}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Xem chốt công tháng
            <ExternalLink className="size-3" />
          </Link>
        )}
      </div>

      {/* Feedback Content */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nội dung feedback
        </h4>
        <div className="whitespace-pre-wrap rounded-lg bg-background p-4 text-sm leading-relaxed text-foreground border border-border/60">
          {detail.content}
        </div>
      </div>

      {/* Replies Thread */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trả lời ({detail.replies.length})
        </h4>

        {detail.replies.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-2">
            Chưa có trả lời nào.
          </p>
        ) : (
          <div className="space-y-3">
            {detail.replies.map((reply) => (
              <div
                key={reply.id}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {reply.user.name}
                    </span>
                    <span className="text-muted-foreground">
                      ({ROLE_LABEL[reply.user.role]})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{formatFeedbackTime(reply.createdAt)}</span>
                    <span>·</span>
                    <span>
                      Trạng thái sau trả lời:{' '}
                      <strong className="text-foreground">
                        {FEEDBACK_STATUS_LABEL[reply.status]}
                      </strong>
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed pt-1">
                  {reply.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Box */}
      <div className="border-t pt-4">
        {isSheetConfirmed ? (
          <div className="rounded-lg bg-muted/50 p-3.5 text-xs text-muted-foreground text-center">
            Bản chốt công đã được xác nhận, không trả lời thêm được.
          </div>
        ) : (
          <ReplyForm
            key={detail.id}
            isManagerOrAdmin={isManagerOrAdmin}
            authorName={me?.fullName || me?.email || ''}
            onSubmit={async (content) => {
              await replyMutation.mutateAsync({ id: detail.id, content })
            }}
            isPending={replyMutation.isPending}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Xóa feedback này?"
        description={`Feedback của ${detail.user.name} về công tháng ${formattedMonth} và các câu trả lời sẽ bị xóa.`}
        confirmLabel="Xoá feedback"
        pending={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}

function ReplyForm({
  isManagerOrAdmin,
  authorName,
  onSubmit,
  isPending,
}: {
  isManagerOrAdmin: boolean
  authorName: string
  onSubmit: (content: string) => Promise<void>
  isPending: boolean
}) {
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    if (!content.trim()) return
    await onSubmit(content.trim())
    setContent('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">
          Trả lời với tư cách <strong>{authorName}</strong>
        </span>

        <span className="text-xs text-muted-foreground">
          Trạng thái sau khi gửi:{' '}
          <strong className="text-foreground">
            {FEEDBACK_STATUS_LABEL[replyNextStatus(isManagerOrAdmin)]}
          </strong>
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập nội dung trả lời..."
        maxLength={2000}
        rows={3}
        className="resize-y text-xs leading-relaxed"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {isManagerOrAdmin
            ? 'Gửi trả lời là feedback được đánh dấu đã xử lý.'
            : 'Quản lý nhân sự trả lời là feedback được đánh dấu đã xử lý. Trả lời vào feedback đã xử lý sẽ mở lại feedback.'}
        </p>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
        >
          {isPending && <Loader2 className="animate-spin mr-1" />}
          Gửi trả lời
        </Button>
      </div>
    </div>
  )
}
