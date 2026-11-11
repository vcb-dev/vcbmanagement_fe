import { AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-client'
import type { LeaveCandidate } from './annual-leaves.types'
import { useCreateLeaveRow, useLeaveCandidates } from './use-annual-leaves'

/** Số điền sẵn: theo gợi ý; chưa có ngày ký HĐ thì chưa có phép nên là 0. */
function defaultEntitledDays(candidate: LeaveCandidate): number {
  return candidate.suggestion?.days ?? 0
}

interface AddLeaveRowDialogProps {
  year: number
  open: boolean
  onOpenChange(open: boolean): void
}

export function AddLeaveRowDialog({
  year,
  open,
  onOpenChange,
}: AddLeaveRowDialogProps) {
  const { data: candidates = [], isLoading } = useLeaveCandidates(year, open)
  const createMutation = useCreateLeaveRow()

  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [entitledDays, setEntitledDays] = useState<number>(12)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Chỉ điền mặc định một lần mỗi lần mở, để refetch không ghi đè lựa chọn đang nhập.
  const initializedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current || isLoading) return
    initializedRef.current = true
    setErrorMessage(null)
    if (candidates.length > 0) {
      const first = candidates[0]
      setSelectedUserId(first.id)
      setEntitledDays(defaultEntitledDays(first))
    } else {
      setSelectedUserId('')
      setEntitledDays(12)
    }
  }, [open, isLoading, candidates])

  const selectedCandidate = candidates.find((c) => c.id === selectedUserId)
  const noContract = selectedCandidate?.contractStartDate === null

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    const cand = candidates.find((c) => c.id === userId)
    if (cand) {
      setEntitledDays(defaultEntitledDays(cand))
    }
  }

  const handleCreate = async () => {
    if (!selectedUserId) return
    setErrorMessage(null)
    try {
      await createMutation.mutateAsync({
        userId: selectedUserId,
        year,
        entitledDays,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm dòng phép</DialogTitle>
          <DialogDescription>
            Tạo dòng phép năm {year} cho nhân sự toàn thời gian.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách nhân sự...</p>
          ) : candidates.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Mọi nhân sự toàn thời gian đã có dòng phép năm {year}.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="candidate-select">Nhân sự toàn thời gian</Label>
                <Select value={selectedUserId} onValueChange={handleSelectUser}>
                  <SelectTrigger id="candidate-select" className="w-full">
                    <SelectValue placeholder="Chọn nhân sự" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((cand) => (
                      <SelectItem key={cand.id} value={cand.id}>
                        {cand.name}
                        {cand.departmentName ? ` · ${cand.departmentName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-entitled-days">Số ngày phép được hưởng</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="create-entitled-days"
                    type="number"
                    min={0}
                    max={60}
                    step={1}
                    disabled={noContract}
                    value={isNaN(entitledDays) ? '' : entitledDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      setEntitledDays(isNaN(v) ? 0 : v)
                    }}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">ngày</span>
                </div>

                {selectedCandidate?.suggestion ? (
                  <p className="text-xs text-muted-foreground pt-1">
                    Gợi ý: {selectedCandidate.suggestion.note}
                  </p>
                ) : selectedCandidate ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                    Chưa có ngày ký HĐ của {selectedCandidate.name} nên chưa có phép. Nhập ngày ký ở Danh sách nhân sự.
                  </p>
                ) : null}
              </div>
            </>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={candidates.length === 0 || !selectedUserId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Đang thêm...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
