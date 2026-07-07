import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Activity, Gauge, MapPin, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { ComparisonBarChart } from '@/components/charts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useProductivity, useSalesmen } from '../api/use-team'
import type { Salesman } from '../types'

export function TeamPage() {
  const { data: salesmen, isLoading } = useSalesmen()
  const { data: productivity } = useProductivity()

  const list = salesmen ?? []
  const totalSalesmen = list.length
  const avgProductivity = totalSalesmen
    ? list.reduce((sum, s) => sum + s.productivity, 0) / totalSalesmen
    : 0
  const visitsToday = list.reduce((sum, s) => sum + s.visitsToday, 0)

  const columns = useMemo<ColumnDef<Salesman>[]>(
    () => [
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'name', header: 'Salesman' },
      { accessorKey: 'incharge', header: 'Sales Incharge' },
      { accessorKey: 'beat', header: 'Beat' },
      {
        accessorKey: 'visitsToday',
        header: 'Visits Today',
      },
      {
        accessorKey: 'achieved',
        header: 'Achieved',
        cell: ({ row }) => formatCurrency(row.original.achieved),
      },
      {
        accessorKey: 'productivity',
        header: 'Productivity',
        cell: ({ row }) => {
          const p = row.original.productivity
          const tone =
            p >= 80 ? 'text-success' : p >= 60 ? 'text-warning' : 'text-destructive'
          return <span className={`font-medium ${tone}`}>{formatPercent(p, 0)}</span>
        },
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
        title="Team Management"
        description="Salesman hierarchy, monitoring, performance & productivity."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Salesmen" value={totalSalesmen} icon={Users} hint="across all beats" />
        <StatCard label="Avg Productivity" value={formatPercent(avgProductivity, 0)} icon={Gauge} delta={4} />
        <StatCard label="Visits Today" value={visitsToday} icon={MapPin} hint="field check-ins" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Target vs Achieved</CardTitle>
          <CardDescription>Per beat (₹ in thousands)</CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonBarChart
            data={productivity ?? []}
            xKey="beat"
            series={[
              { key: 'target', label: 'Target' },
              { key: 'achieved', label: 'Achieved' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Salesman Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={list}
            isLoading={isLoading}
            searchPlaceholder="Search salesmen…"
          />
        </CardContent>
      </Card>
    </div>
  )
}
