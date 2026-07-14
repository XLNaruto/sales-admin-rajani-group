import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ComparisonBarChart, TrendLineChart } from '@/components/charts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useReportsAnalytics } from '../hooks/use-reports-analytics'
import type { ReportColumn, ReportRow, ReportType } from '../types'

const REPORT_TYPES: { type: ReportType; label: string }[] = [
  { type: 'sales', label: 'Sales' },
  { type: 'target', label: 'Target Achievement' },
  { type: 'attendance', label: 'Attendance' },
  { type: 'visit-history', label: 'Visit History' },
  { type: 'expense', label: 'Expense' },
  { type: 'performance', label: 'Performance' },
]

function renderCell(col: ReportColumn, value: string | number) {
  if (typeof value === 'number') {
    if (col.format === 'currency') return formatCurrency(value)
    if (col.format === 'percent') return formatPercent(value)
  }
  return String(value)
}

export function ReportsPage() {
  const { active, setActive, data, isLoading, exportReport } =
    useReportsAnalytics()

  const columns = useMemo<ColumnDef<ReportRow>[]>(() => {
    if (!data) return []
    return data.columns.map((col) => ({
      accessorKey: col.key,
      header: col.header,
      cell: ({ row }) => renderCell(col, row.original[col.key]),
    }))
  }, [data])

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Sales, target, attendance, visit, expense & performance reports."
        actions={
          <Button variant="outline" disabled={!data} onClick={exportReport}>
            <Download /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {REPORT_TYPES.map((r) => (
          <Button
            key={r.type}
            size="sm"
            variant={active === r.type ? 'default' : 'outline'}
            onClick={() => setActive(r.type)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            {REPORT_TYPES.find((r) => r.type === active)?.label} — Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data &&
            (data.chartKind === 'line' ? (
              <TrendLineChart
                data={data.rows}
                xKey={data.chartXKey}
                series={data.chartSeries}
              />
            ) : (
              <ComparisonBarChart
                data={data.rows}
                xKey={data.chartXKey}
                series={data.chartSeries}
              />
            ))}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search report…"
      />
    </div>
  )
}
