import { useState } from 'react'
import { BarChart3, ListTree, Tags } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsToolbar } from '../components/analytics-toolbar'
import { RetailerListPanel } from '../components/retailer-list-panel'
import { SalesPanel } from '../components/sales-panel'
import { TagsPanel } from '../components/tags-panel'
import { useAnalyticsFilters } from '../hooks/use-analytics-filters'

const TABS = [
  { value: 'sales', label: 'Sales', icon: BarChart3 },
  { value: 'tags', label: 'Retailer Tags', icon: Tags },
  { value: 'list', label: 'Retailer List', icon: ListTree },
]

/**
 * Retailer Analytics — the three reports share one filter bar and one dataset,
 * so the tabs change what is being asked of the same selection rather than
 * navigating somewhere else.
 */
export function RetailerAnalyticsPage() {
  const { filters, patchFilters, resetFilters, refresh } = useAnalyticsFilters()
  const [tab, setTab] = useState('sales')

  return (
    <div>
      <PageHeader
        title="Retailer Analytics"
        description="Sales by territory and product, retailer lifecycle tags, and beat/city-wise outlet lists."
        actions={
          // Removed once the reporting endpoints are wired — until then the
          // numbers on screen are generated, and the screen should say so.
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400"
          >
            Demo data
          </Badge>
        }
      />

      <div className="space-y-4">
        <AnalyticsToolbar
          filters={filters}
          onChange={patchFilters}
          onReset={resetFilters}
          refresh={refresh}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="size-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Each panel owns its own grouping state; the filters come from above. */}
          <TabsContent value="sales">
            <SalesPanel filters={filters} />
          </TabsContent>
          <TabsContent value="tags">
            <TagsPanel filters={filters} />
          </TabsContent>
          <TabsContent value="list">
            <RetailerListPanel filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
