import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPinned, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BeatFormDialog } from '../components/beat-form-dialog'
import { BeatToolbar } from '../components/beat-toolbar'
import { gradeLabel } from '../lib/beat-reference'
import { useBeatsList } from '../hooks/use-beats-list'
import type { Beat } from '../types'

export function BeatsPage() {
  const {
    filters,
    patchFilters,
    resetFilters,
    rows,
    rowCount,
    pagination,
    setPagination,
    sorting,
    onSortingChange,
    isLoading,
    isError,
    hasActiveFilters,
    modalOpen,
    editId,
    openCreate,
    openEdit,
    closeModal,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useBeatsList()

  const columns = useMemo<ColumnDef<Beat>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {pageIndex * pageSize + row.index + 1}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Hint label="Edit">
              <button
                type="button"
                onClick={() => openEdit(row.original.id)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
              >
                <Pencil className="size-4" />
              </button>
            </Hint>
            <Hint label="Delete">
              <button
                type="button"
                onClick={() => setPendingDelete(row.original)}
                disabled={isDeleting}
                className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
              >
                <Trash2 className="size-4" />
              </button>
            </Hint>
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
            <p className="font-medium text-foreground">{row.original.beatName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'beatGrade',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Grade" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-medium">
            {gradeLabel(row.original.beatGrade)}
          </Badge>
        ),
      },
      {
        id: 'distributor',
        accessorFn: (b) => b.distributorName ?? b.distributorId,
        enableSorting: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Distributor" />,
        cell: ({ row }) =>
          row.original.distributorName ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Store className="size-3.5 text-muted-foreground" />
              {row.original.distributorName}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting],
  )

  return (
    <div>
      <PageHeader
        title="Beat Creation"
        description="Create and manage beats — name, grade and distributor."
        actions={
          <Button className="cursor-pointer" onClick={openCreate}>
            <Plus /> Add Beat
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="beats"
        maxHeight="70vh"
        pageSize={pagination.pageSize}
        pageSizeOptions={[5, 10, 25, 50]}
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        rowCount={rowCount}
        manualSorting
        sorting={sorting}
        onSortingChange={onSortingChange}
        toolbar={
          <BeatToolbar filters={filters} onChange={patchFilters} onReset={resetFilters} />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <MapPinned className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load beats" : 'No beats found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'Create your first beat to get started.'}
              </p>
            </div>
            {!hasActiveFilters && !isError && (
              <Button className="cursor-pointer" onClick={openCreate}>
                <Plus /> Add Beat
              </Button>
            )}
          </div>
        }
      />

      {modalOpen && <BeatFormDialog open editId={editId} onClose={closeModal} />}

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
        loading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
