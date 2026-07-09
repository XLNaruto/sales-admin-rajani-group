import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { MapPinned, Pencil, Plus, Route, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSalesmen } from '@/features/sales-incharge'
import { useBeats, useDeleteBeat } from '../api/use-beats'
import { BeatToolbar, INITIAL_FILTERS, type BeatFilters } from '../components/beat-toolbar'
import { cityName, distributorName, labelFor } from '../lib/beat-reference'
import type { Beat } from '../types'

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string) {
  try {
    return format(parseISO(value), 'dd-MM-yyyy')
  } catch {
    return value
  }
}

export function BeatsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useBeats()
  const { data: salesmen } = useSalesmen()
  const deleteBeat = useDeleteBeat()

  const salesmanName = useMemo(() => {
    const map = new Map((salesmen ?? []).map((s) => [s.id, s.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [salesmen])

  const [filters, setFilters] = useState<BeatFilters>(INITIAL_FILTERS)
  const patchFilters = (patch: Partial<BeatFilters>) => setFilters((f) => ({ ...f, ...patch }))

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return (data ?? []).filter((b) => {
      const matchesSearch =
        !q || b.beatName.toLowerCase().includes(q) || b.beatCode.toLowerCase().includes(q)
      const matchesMarket = filters.marketType === 'all' || b.marketType === filters.marketType
      const matchesStatus = filters.status === 'all' || b.status === filters.status
      return matchesSearch && matchesMarket && matchesStatus
    })
  }, [data, filters])

  const hasActiveFilters =
    filters.search !== '' || filters.marketType !== 'all' || filters.status !== 'all'

  const [pendingDelete, setPendingDelete] = useState<Beat | null>(null)

  const confirmDelete = () => {
    if (!pendingDelete) return
    const b = pendingDelete
    deleteBeat.mutate(b.id, {
      onSuccess: () => toast.success(`${b.beatName} removed`),
      onError: () => toast.error("Couldn't remove the beat."),
    })
  }

  const columns = useMemo<ColumnDef<Beat>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        cell: ({ row, table }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Edit"
              onClick={() => navigate({ to: '/beats/create' })}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setPendingDelete(row.original)}
              disabled={deleteBeat.isPending}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'beatName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Beat" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <MapPinned className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-medium text-foreground">{row.original.beatName}</p>
              <p className="text-xs text-muted-foreground">{row.original.beatCode}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'marketType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Market" />,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="font-medium">
              {labelFor(row.original.marketType)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {labelFor(row.original.marketSystem)}
            </span>
          </div>
        ),
      },
      {
        id: 'city',
        accessorFn: (b) => cityName(b.cityId),
        header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
      },
      {
        id: 'distributor',
        accessorFn: (b) => distributorName(b.distributorId),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Distributor" />,
      },
      {
        id: 'salesman',
        accessorFn: (b) => salesmanName(b.assignedSalesmanId),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Salesman" />,
      },
      {
        accessorKey: 'visitCycle',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cycle" />,
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="text-sm">{labelFor(row.original.visitCycle)}</p>
            <p className="text-xs text-muted-foreground">{row.original.visitDays.join(', ')}</p>
          </div>
        ),
      },
      {
        id: 'outlets',
        accessorFn: (b) => b.outlets.length,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Outlets" />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Route className="size-3.5 text-muted-foreground" />
            {row.original.outlets.length}
          </span>
        ),
      },
      {
        accessorKey: 'effectiveDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Effective" />,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDate(row.original.effectiveDate)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteBeat.isPending, salesmanName],
  )

  return (
    <div>
      <PageHeader
        title="Beat Creation"
        description="Create and manage beats — the ordered route a salesman covers."
        actions={
          <Button className="cursor-pointer" onClick={() => navigate({ to: '/beats/create' })}>
            <Plus /> Create Beat
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        itemName="beats"
        maxHeight="70vh"
        pageSizeOptions={[5, 10, 25, 50]}
        toolbar={
          <BeatToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={() => setFilters(INITIAL_FILTERS)}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <MapPinned className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">No beats found</p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : 'Create your first beat to get started.'}
              </p>
            </div>
            {!hasActiveFilters && (
              <Button className="cursor-pointer" onClick={() => navigate({ to: '/beats/create' })}>
                <Plus /> Create Beat
              </Button>
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this beat?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.beatName}</span> will be
              permanently removed. This action cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        loading={deleteBeat.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
