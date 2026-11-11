import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartTimeClosingTab } from '@/features/part-time/PartTimeClosingTab'
import { PartTimeGridTab } from '@/features/part-time/PartTimeGridTab'
import { PartTimeIssuesTab } from '@/features/part-time/PartTimeIssuesTab'
import { usePartTimeIssues } from '@/features/part-time/use-part-time-admin'
import { todayYmd } from '@/lib/format'

export function PartTimeTimesheetsPage() {
  const [searchParams] = useSearchParams()
  const currentMonth = todayYmd().slice(0, 7)
  const initialTab = searchParams.get('tab')
  const initialMonth = searchParams.get('month')

  const [activeTab, setActiveTab] = useState<'grid' | 'closing' | 'issues'>(() => {
    return initialTab === 'grid' || initialTab === 'closing' || initialTab === 'issues'
      ? initialTab
      : 'grid'
  })
  const [month, setMonth] = useState(() => {
    return initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth)
      ? initialMonth
      : currentMonth
  })
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: issues = [] } = usePartTimeIssues(month)
  const issueCount = issues.length

  const handleOpenUser = (userId: string) => {
    setSelectedUserId(userId)
    setActiveTab('closing')
  }

  return (
    <PageContainer>
      <PageHeader
        title="Công part-time"
        description="Bảng chấm công và chốt công nhân sự bán thời gian."
      />

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'grid' | 'closing' | 'issues')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Bảng chấm công</TabsTrigger>
          <TabsTrigger value="closing">Chốt công tháng</TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5">
            Cần đối soát
            {issueCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-semibold">
                {issueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <PartTimeGridTab />
        </TabsContent>

        <TabsContent value="closing" className="space-y-4">
          <PartTimeClosingTab
            month={month}
            onMonthChange={setMonth}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <PartTimeIssuesTab
            month={month}
            onMonthChange={setMonth}
            onOpenUser={handleOpenUser}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
