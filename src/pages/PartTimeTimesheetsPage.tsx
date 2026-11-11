import { useState } from 'react'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartTimeClosingTab } from '@/features/part-time/PartTimeClosingTab'
import { PartTimeGridTab } from '@/features/part-time/PartTimeGridTab'
import { todayYmd } from '@/lib/format'

export function PartTimeTimesheetsPage() {
  const currentMonth = todayYmd().slice(0, 7)
  const [activeTab, setActiveTab] = useState('grid')
  const [month, setMonth] = useState(currentMonth)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  return (
    <PageContainer>
      <PageHeader
        title="Công part-time"
        description="Bảng chấm công và chốt công nhân sự bán thời gian."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Bảng chấm công</TabsTrigger>
          <TabsTrigger value="closing">Chốt công tháng</TabsTrigger>
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
      </Tabs>
    </PageContainer>
  )
}
