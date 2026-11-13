import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useCreateFeedback } from '@/features/feedbacks/use-feedbacks'
import { getApiErrorMessage } from '@/lib/api-client'
import { useDisputeSheet } from './use-part-time'

export function DisputeDialog({
  sheetId,
  sheetType = 'part_time',
  open,
  onOpenChange,
}: {
  sheetId: string
  sheetType?: 'part_time' | 'full_time'
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dispute = useDisputeSheet()
  const createFeedback = useCreateFeedback()
  const isPending = dispute.isPending || createFeedback.isPending

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError('Nhập nội dung báo sai')
      return
    }
    if (trimmed.length > 2000) {
      setError('Nội dung báo sai tối đa 2000 ký tự')
      return
    }

    try {
      setError(null)
      if (sheetType === 'part_time') {
        await dispute.mutateAsync({ id: sheetId, content: trimmed })
      } else {
        await createFeedback.mutateAsync({
          sheetType: 'full_time',
          sheetId,
          content: trimmed,
        })
      }
      setContent('')
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Báo sai bản chốt công</DialogTitle>
            <DialogDescription>
              Nhập nội dung cần phản hồi hoặc thắc mắc về số liệu công trong tháng. Quản lý sẽ nhận được và phản hồi lại bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Ví dụ: Ngày 05/09 em có làm online 2 giờ buổi chiều nhưng chưa thấy tính..."
              rows={4}
              maxLength={2000}
              required
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {error ? (
                <span className="text-destructive font-medium">{error}</span>
              ) : (
                <span />
              )}
              <span>{content.length}/2000</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Đang gửi...' : 'Gửi báo sai'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
