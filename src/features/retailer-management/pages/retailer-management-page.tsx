import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, Store, CheckCircle2, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { DonutChart, ComparisonBarChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { useRetailerManagement } from '../hooks/use-retailer-management'
import type { Retailer } from '../types'

export function RetailersPage() {
  const {
    retailers,
    isLoading,
    analytics,
    isImporting,
    importMessage,
    total,
    active,
    avgMonthlySales,
    handleImport,
  } = useRetailerManagement()

  const columns = useMemo<ColumnDef<Retailer>[]>(
    () => [
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'name', header: 'Retailer' },
      { accessorKey: 'distributor', header: 'Distributor' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">Cat {row.original.category}</Badge>,
      },
      { accessorKey: 'zone', header: 'Zone' },
      {
        accessorKey: 'monthlySales',
        header: 'Monthly Sales',
        cell: ({ row }) => formatCurrency(row.original.monthlySales),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Retailer Management"
        description="Onboarding, distributor mapping, performance & retailer-wise analytics."
        actions={
          <Button onClick={handleImport} disabled={isImporting}>
            <Download /> {isImporting ? 'Importing…' : 'Import from Field Assist'}
          </Button>
        }
      />

      {importMessage && (
        <p className="mb-4 rounded-lg border border-dashed bg-card/50 px-4 py-2 text-sm text-muted-foreground">
          {importMessage}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Retailers" value={total} icon={Store} hint="mapped outlets" />
        <StatCard label="Active Retailers" value={active} icon={CheckCircle2} hint="currently billing" />
        <StatCard
          label="Avg Monthly Sales"
          value={formatCurrency(avgMonthlySales)}
          icon={TrendingUp}
          hint="per retailer"
        />
      </div>

      <Tabs defaultValue="retailers">
        <TabsList>
          <TabsTrigger value="retailers">Retailers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="retailers">
          <DataTable
            columns={columns}
            data={retailers}
            isLoading={isLoading}
            searchPlaceholder="Search retailers…"
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Retailers by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart data={analytics.data?.byCategory ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Retailers &amp; Sales by Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonBarChart
                  data={analytics.data?.byZone ?? []}
                  xKey="zone"
                  series={[
                    { key: 'retailers', label: 'Retailers' },
                    { key: 'sales', label: 'Monthly Sales' },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
