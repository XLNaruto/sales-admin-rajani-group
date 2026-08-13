import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Globe2, Map, MapPin, Package, Route, TrendingUp } from 'lucide-react'
import { ComparisonBarChart } from '@/components/charts'
import { StatCard } from '@/components/common/stat-card'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCompact, formatCurrency, formatPercent } from '@/lib/utils'
import { useAnalyticsSummary, useDimensionSales } from '../api/use-retailer-analytics'
import { GrowthPill, ShareBar } from './growth-pill'
import type { AnalyticsFilters, DimensionSalesRow, SalesDimension } from '../types'

const DIMENSIONS: { value: SalesDimension; label: string; icon: typeof Globe2 }[] = [
  { value: 'zone', label: 'Zone', icon: Globe2 },
  { value: 'district', label: 'District', icon: Map },
  { value: 'city', label: 'City', icon: MapPin },
  { value: 'beat', label: 'Beat', icon: Route },
  { value: 'product', label: 'Product', icon: Package },
]

/** How many bars the chart shows before it stops being readable. */
const CHART_LIMIT = 10

/**
 * Report 1 — retailer sales sliced by zone / district / city / beat / product.
 *
 * One dataset, five groupings: the switcher only changes which bucket the same
 * filtered retailer base is rolled up into, so the KPI strip above stays put
 * while the chart and table below re-group.
 */
export function SalesPanel({ filters }: { filters: AnalyticsFilters }) {
  const [dimension, setDimension] = useState<SalesDimension>('zone')

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(filters)
  const { data: rows = [], isLoading } = useDimensionSales(dimension, filters)

  const totalSales = rows.reduce((sum, r) => sum + r.sales, 0)

  const chartData = useMemo(
    () =>
      rows.slice(0, CHART_LIMIT).map((r) => ({
        name: r.name,
        sales: r.sales,
        previous: r.prevSales,
      })),
    [rows],
  )

  const columns = useMemo<ColumnDef<DimensionSalesRow>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={labelFor(dimension)} />
        ),
        meta: { className: 'min-w-52' },
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium text-foreground">{row.original.name}</p>
            {row.original.parent && (
              <p className="text-xs text-muted-foreground">{row.original.parent}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'retailers',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={dimension === 'product' ? 'Buying Outlets' : 'Retailers'}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.retailers}</span>
        ),
      },
      {
        id: 'billed',
        accessorFn: (r) => (r.retailers ? r.billedRetailers / r.retailers : 0),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Billed" />,
        cell: ({ row }) => {
          const { billedRetailers, retailers } = row.original
          const pct = retailers ? (billedRetailers / retailers) * 100 : 0
          return (
            <div className="leading-tight">
              <p className="text-sm tabular-nums">
                {billedRetailers}
                <span className="text-muted-foreground"> / {retailers}</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatPercent(pct, 0)} coverage
              </p>
            </div>
          )
        },
      },
      {
        id: 'productivity',
        accessorFn: (r) => (r.visits ? r.productiveVisits / r.visits : 0),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Productive Visits" />
        ),
        cell: ({ row }) => {
          const { visits, productiveVisits } = row.original
          const pct = visits ? (productiveVisits / visits) * 100 : 0
          return (
            <div className="leading-tight">
              <p className="text-sm tabular-nums">
                {productiveVisits}
                <span className="text-muted-foreground"> / {visits}</span>
              </p>
              <p
                className={cn(
                  'text-xs tabular-nums',
                  pct >= 60
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : pct >= 35
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {formatPercent(pct, 0)} productive
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'sales',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(row.original.sales)}
          </span>
        ),
      },
      {
        id: 'growth',
        accessorFn: (r) => (r.prevSales ? (r.sales - r.prevSales) / r.prevSales : 0),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Growth" />,
        cell: ({ row }) => (
          <GrowthPill current={row.original.sales} previous={row.original.prevSales} />
        ),
      },
      {
        id: 'contribution',
        accessorFn: (r) => r.sales,
        header: 'Contribution',
        enableSorting: false,
        meta: { className: 'min-w-36' },
        cell: ({ row }) => (
          <ShareBar value={totalSales ? (row.original.sales / totalSales) * 100 : 0} />
        ),
      },
    ],
    [dimension, totalSales],
  )

  const coverage = summary?.totalRetailers
    ? (summary.billedRetailers / summary.totalRetailers) * 100
    : 0
  const productivity = summary?.visits
    ? (summary.productiveVisits / summary.visits) * 100
    : 0
  const avgPerBilled = summary?.billedRetailers
    ? summary.totalSales / summary.billedRetailers
    : 0
  const growth = summary?.prevTotalSales
    ? ((summary.totalSales - summary.prevTotalSales) / summary.prevTotalSales) * 100
    : undefined

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Sales"
          value={summaryLoading ? '—' : formatCurrency(summary?.totalSales ?? 0)}
          delta={growth !== undefined ? Number(growth.toFixed(1)) : undefined}
          icon={TrendingUp}
          hint="vs previous period"
        />
        <StatCard
          label="Billed Retailers"
          value={
            summaryLoading
              ? '—'
              : `${summary?.billedRetailers ?? 0} / ${summary?.totalRetailers ?? 0}`
          }
          icon={Route}
          hint={`${formatPercent(coverage, 0)} of the base billed`}
        />
        <StatCard
          label="Productive Visits"
          value={summaryLoading ? '—' : formatPercent(productivity, 0)}
          icon={MapPin}
          hint={`${formatCompact(summary?.productiveVisits ?? 0)} of ${formatCompact(
            summary?.visits ?? 0,
          )} visits`}
        />
        <StatCard
          label="Avg / Billed Retailer"
          value={summaryLoading ? '—' : formatCurrency(Math.round(avgPerBilled))}
          icon={Package}
          hint="Average order value per outlet"
        />
      </div>

      {/* Dimension switcher — the only control that changes the grouping. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Sales by</span>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          {DIMENSIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDimension(value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                dimension === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Top {Math.min(CHART_LIMIT, rows.length)} by {labelFor(dimension).toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length ? (
            <ComparisonBarChart
              data={chartData}
              xKey="name"
              series={[
                { key: 'sales', label: 'Current' },
                { key: 'previous', label: 'Previous' },
              ]}
              height={300}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No sales in this selection.
            </p>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName={`${labelFor(dimension).toLowerCase()} rows`}
        maxHeight="60vh"
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyMessage="No data for the selected filters."
      />
    </div>
  )
}

function labelFor(dimension: SalesDimension): string {
  return DIMENSIONS.find((d) => d.value === dimension)?.label ?? 'Group'
}
