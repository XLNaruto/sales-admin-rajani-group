import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useDistributors } from '../api/use-distributors'
import type { Distributor } from '../types'

export function DistributorsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useDistributors()

  const columns = useMemo<ColumnDef<Distributor>[]>(
    () => [
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'name', header: 'Distributor' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline">Cat {row.original.category}</Badge>,
      },
      { accessorKey: 'zone', header: 'Zone' },
      { accessorKey: 'incharge', header: 'Sales Incharge' },
      {
        accessorKey: 'monthlySales',
        header: 'Monthly Sales',
        cell: ({ row }) => formatCurrency(row.original.monthlySales),
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: ({ row }) => (
          <span className={row.original.outstanding > 0 ? 'text-destructive' : ''}>
            {formatCurrency(row.original.outstanding)}
          </span>
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
        title="Distributor Management"
        description="Onboarding, approval, category mapping, performance & allocation."
        actions={
          <Button onClick={() => navigate({ to: '/distributors/onboard' })}>
            <Plus /> Onboard Distributor
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        searchPlaceholder="Search distributors…"
      />
    </div>
  )
}
