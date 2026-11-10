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
import { getApiErrorMessage } from '@/lib/api-client'
import { useDisputeSheet } from './use-part-time'

export function DisputeDialog({
  sheetId,
  open,
  onOpenChange,
}: {
  sheetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dispute = useDisputeSheet()

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
      await dispute.mutateAsync({ id: sheetId, content: trimmed })
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
              disabled={dispute.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" variant="destructive" disabled={dispute.isPending}>
              {dispute.isPending ? 'Đang gửi...' : 'Gửi báo sai'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
