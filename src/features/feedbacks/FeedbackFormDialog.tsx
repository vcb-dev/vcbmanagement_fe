import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMe } from '@/features/auth/use-auth'
import { getApiErrorMessage } from '@/lib/api-client'
import { sheetLabel } from './feedback-format'
import type { FeedbackDetail, SheetType } from './feedbacks.types'
import { useCreateFeedback, useFeedbackSheetOptions } from './use-feedbacks'

interface FeedbackFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (detail: FeedbackDetail) => void
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
  onCreated,
}: FeedbackFormDialogProps) {
  const { data: me } = useMe()
  const isStaff = me?.role === 'staff'

  const { data: options = [], isLoading } = useFeedbackSheetOptions(open)
  const createMutation = useCreateFeedback()

  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedSheetKey, setSelectedSheetKey] = useState<string>('')
  const [content, setContent] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Deduplicate users in available options
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; departmentName: string | null }>()
    for (const opt of options) {
      if (!map.has(opt.user.id)) {
        map.set(opt.user.id, {
          id: opt.user.id,
          name: opt.user.name,
          departmentName: opt.user.departmentName,
        })
      }
    }
    return Array.from(map.values())
  }, [options])

  // Determine effective user id
  const effectiveUserId = isStaff ? (me?.id ?? '') : selectedUserId || (uniqueUsers[0]?.id ?? '')

  // Filter sheets for effective user
  const userSheets = useMemo(() => {
    return options.filter((opt) => opt.user.id === effectiveUserId)
  }, [options, effectiveUserId])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setContent('')
      setErrorMessage(null)
      if (!isStaff && uniqueUsers.length > 0) {
        setSelectedUserId(uniqueUsers[0].id)
      }
    }
  }, [open, isStaff, uniqueUsers])

  // Auto-select first available sheet for effective user
  useEffect(() => {
    if (userSheets.length > 0) {
      const first = userSheets[0]
      setSelectedSheetKey(`${first.sheet.type}:${first.sheet.id}`)
    } else {
      setSelectedSheetKey('')
    }
  }, [userSheets])

  const hasNoSheets = !isLoading && options.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !selectedSheetKey) return

    const [type, sheetId] = selectedSheetKey.split(':')
    if (!type || !sheetId) return

    setErrorMessage(null)
    try {
      const res = await createMutation.mutateAsync({
        sheetType: type as SheetType,
        sheetId,
        content: content.trim(),
      })
      onCreated(res.data)
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isStaff ? 'Gửi feedback về công' : 'Ghi nhận feedback'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isStaff
                ? 'Feedback gửi tới quản lý nhân sự. Mục mới ở trạng thái Mới, quản lý sẽ trả lời ở đây.'
                : 'Nhập lại feedback nhân viên gửi qua tin nhắn hoặc trực tiếp. Mục mới ở trạng thái Mới.'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasNoSheets ? (
            <div className="rounded-lg bg-muted/60 p-4 text-center text-xs text-muted-foreground leading-relaxed">
              Chưa có bản chốt công nào chưa xác nhận. Feedback chỉ gửi được khi tháng đã chốt và chưa xác nhận.
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Sender field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Người gửi</Label>
                {isStaff ? (
                  <div className="h-9 flex items-center rounded-md border bg-muted/40 px-3 text-xs text-foreground font-medium">
                    {me?.fullName || me?.email}
                  </div>
                ) : (
                  <Select
                    value={effectiveUserId}
                    onValueChange={(val) => setSelectedUserId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Chọn nhân viên..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name} {u.departmentName ? `(${u.departmentName})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Sheet field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Bản chốt công được phản hồi
                </Label>
                {userSheets.length === 0 ? (
                  <div className="h-9 flex items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
                    Nhân viên này chưa có bản chốt nào chưa xác nhận
                  </div>
                ) : (
                  <Select
                    value={selectedSheetKey}
                    onValueChange={setSelectedSheetKey}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userSheets.map((opt) => (
                        <SelectItem
                          key={`${opt.sheet.type}:${opt.sheet.id}`}
                          value={`${opt.sheet.type}:${opt.sheet.id}`}
                          className="text-xs"
                        >
                          {sheetLabel(opt.sheet)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Content field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Nội dung</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {content.length}/2000
                  </span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: Ngày 24/09 máy chỉ ghi giờ vào, thiếu giờ ra…"
                  maxLength={2000}
                  rows={4}
                  className="resize-y text-xs leading-relaxed"
                />
              </div>

              {errorMessage && (
                <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                hasNoSheets ||
                !content.trim() ||
                !selectedSheetKey ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && (
                <Loader2 className="animate-spin mr-1" />
              )}
              {isStaff ? 'Gửi feedback' : 'Lưu feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

