import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartTimeClosingTab } from '@/features/part-time/PartTimeClosingTab'
import { PartTimeGridTab } from '@/features/part-time/PartTimeGridTab'
import { todayYmd } from '@/lib/format'

export function PartTimeTimesheetsPage() {
  const [searchParams] = useSearchParams()
  const currentMonth = todayYmd().slice(0, 7)
  const initialTab = searchParams.get('tab')
  const initialMonth = searchParams.get('month')

  const [activeTab, setActiveTab] = useState<'grid' | 'closing'>(() => {
    return initialTab === 'grid' || initialTab === 'closing'
      ? initialTab
      : 'grid'
  })
  const [month, setMonth] = useState(() => {
    return initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth)
      ? initialMonth
      : currentMonth
  })

  return (
    <PageContainer>
      <PageHeader
        title="Công part-time"
        description="Bảng chấm công và chốt công nhân sự bán thời gian."
      />

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'grid' | 'closing')} className="space-y-4">
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
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
