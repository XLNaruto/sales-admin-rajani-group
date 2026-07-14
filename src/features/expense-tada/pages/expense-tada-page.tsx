import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Receipt, Wallet, Clock } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { TadaCalculator } from '../components/tada-calculator'
import { useExpenseTada } from '../hooks/use-expense-tada'
import type { TadaClaim, TadaMaster } from '../types'

export function ExpenseTadaPage() {
  const { master, claims, claimRows, claimsThisMonth, totalPayable, pendingClaims } =
    useExpenseTada()

  const masterColumns = useMemo<ColumnDef<TadaMaster>[]>(
    () => [
      { accessorKey: 'grade', header: 'Grade' },
      {
        accessorKey: 'hqType',
        header: 'HQ Type',
        cell: ({ row }) => <Badge variant="outline">{row.original.hqType}</Badge>,
      },
      {
        accessorKey: 'dailyAllowance',
        header: 'Daily Allowance',
        cell: ({ row }) => formatCurrency(row.original.dailyAllowance),
      },
      {
        accessorKey: 'perKmRate',
        header: 'Per-Km Rate',
        cell: ({ row }) => formatCurrency(row.original.perKmRate),
      },
      { accessorKey: 'effectiveFrom', header: 'Effective From' },
    ],
    [],
  )

  const claimColumns = useMemo<ColumnDef<TadaClaim>[]>(
    () => [
      { accessorKey: 'employee', header: 'Employee' },
      { accessorKey: 'grade', header: 'Grade' },
      {
        accessorKey: 'hqType',
        header: 'HQ',
        cell: ({ row }) => <Badge variant="outline">{row.original.hqType}</Badge>,
      },
      { accessorKey: 'date', header: 'Date' },
      {
        accessorKey: 'distanceKm',
        header: 'Distance',
        cell: ({ row }) => `${row.original.distanceKm} km`,
      },
      {
        accessorKey: 'days',
        header: 'Days',
        cell: ({ row }) => `${row.original.days}d`,
      },
      {
        accessorKey: 'additional',
        header: 'Additional',
        cell: ({ row }) => formatCurrency(row.original.additional),
      },
      {
        accessorKey: 'computedTotal',
        header: 'Total',
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.computedTotal)}</span>
        ),
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
        title="Expense &amp; TA/DA"
        description="TA/DA master, effective-date & HQ-based calculation, and additional expenses."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Claims This Month" value={claimsThisMonth} icon={Receipt} hint="submitted" />
        <StatCard
          label="Total Payable"
          value={formatCurrency(totalPayable)}
          icon={Wallet}
          hint="across all claims"
        />
        <StatCard label="Pending Claims" value={pendingClaims} icon={Clock} hint="awaiting review" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="master">
            <TabsList>
              <TabsTrigger value="master">TA/DA Master</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
            </TabsList>

            <TabsContent value="master">
              <DataTable
                columns={masterColumns}
                data={master.data ?? []}
                isLoading={master.isLoading}
                searchPlaceholder="Search rate table…"
              />
            </TabsContent>

            <TabsContent value="claims">
              <DataTable
                columns={claimColumns}
                data={claimRows}
                isLoading={claims.isLoading}
                searchPlaceholder="Search claims…"
              />
            </TabsContent>
          </Tabs>
        </div>

        <TadaCalculator master={master.data ?? []} />
      </div>
    </div>
  )
}
