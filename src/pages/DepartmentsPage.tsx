import { AlarmClock, Building2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMe } from '@/features/auth/use-auth'
import { DepartmentCard } from '@/features/departments/DepartmentCard'
import { DepartmentFormDialog } from '@/features/departments/DepartmentFormDialog'
import type { Department } from '@/features/departments/departments.types'
import { LateThresholdsPanel } from '@/features/departments/LateThresholdsPanel'
import { useDeleteDepartment, useDepartments } from '@/features/departments/use-departments'
import { getApiErrorMessage } from '@/lib/api-client'

export function DepartmentsPage() {
  const { data: user } = useMe()
  const canEdit = user?.role === 'admin'
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'late' ? 'late' : 'departments'

  const { data: departments, isPending, isError, error, refetch } = useDepartments()
  const remove = useDeleteDepartment()
  /** `undefined` = đóng, `null` = thêm mới. */
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Department | null>(null)

  return (
    <PageContainer>
      <PageHeader
        title="Bộ phận & giờ làm"
        description="Giờ ca của từng bộ phận và mốc đi muộn áp dụng cho từng đối tượng."
        actions={
          canEdit && tab === 'departments' ? (
            <Button onClick={() => setEditing(null)}>
              <Plus />
              Thêm bộ phận
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setParams(v === 'late' ? { tab: 'late' } : {}, { replace: true })}
        className="gap-3"
      >
        <TabsList>
          <TabsTrigger value="departments">
            <Building2 />
            Bộ phận
          </TabsTrigger>
          <TabsTrigger value="late">
            <AlarmClock />
            Mốc đi muộn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          {isPending ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {getApiErrorMessage(error)}{' '}
              <button type="button" className="underline" onClick={() => void refetch()}>
                Thử lại
              </button>
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {departments.map((d) => (
                <DepartmentCard
                  key={d.id}
                  department={d}
                  canEdit={canEdit}
                  onEdit={() => setEditing(d)}
                  onDelete={() => setDeleting(d)}
                />
              ))}
              {departments.length === 0 && !canEdit && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Chưa có bộ phận nào.</p>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <Plus className="size-4" />
                  Thêm bộ phận
                </button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="late">
          <LateThresholdsPanel departments={departments ?? []} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      {editing !== undefined && (
        <DepartmentFormDialog key={editing?.id ?? 'new'} department={editing} onClose={() => setEditing(undefined)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Xoá bộ phận ${deleting.name}?` : ''}
        description="Mốc đi muộn riêng của bộ phận này cũng bị xoá theo. Không xoá được nếu bộ phận còn nhân sự, kể cả tài khoản đã khoá."
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
      />
    </PageContainer>
  )
}
