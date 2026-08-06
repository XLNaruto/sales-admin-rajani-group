import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { OutletTypeFormDialog } from '../components/outlet-type-form-dialog'
import { OutletTypeToolbar } from '../components/outlet-type-toolbar'
import { useOutletTypesList } from '../hooks/use-outlet-types-list'
import type { OutletType } from '../types'

/** Outlet Type master — the list screen under Master Management. */
export function OutletTypesPage() {
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
    refresh,
    isLoading,
    isError,
    error,
    onLoadMore,
    hasMore,
    isFetchingMore,
    hasActiveFilters,
    modalOpen,
    editRow,
    openCreate,
    openEdit,
    closeModal,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useOutletTypesList()

  // The API grants `outlet-type:create|update|delete` but no `:list` key —
  // reading the master is open to any authenticated user, so only the write
  // actions are gated.
  const { can } = useCan()
  const canUpdate = can('outlet-type:update')
  const canDelete = can('outlet-type:delete')
  const canCreate = can('outlet-type:create')

  const columns = useMemo<ColumnDef<OutletType>[]>(
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
      // Drop the column outright for a read-only user rather than leaving an
      // empty "Actions" header on every row.
      ...(canUpdate || canDelete
        ? [
            {
              id: 'actions',
              header: 'Actions',
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Hint label="Edit">
                      <button
                        type="button"
                        onClick={() => openEdit(row.original)}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </Hint>
                  )}
                  {canDelete && (
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
                  )}
                </div>
              ),
            } satisfies ColumnDef<OutletType>,
          ]
        : []),
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Outlet Type" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Store className="size-4.5" />
            </span>
            <p className="font-medium text-foreground">{row.original.name}</p>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDeleting, canUpdate, canDelete],
  )

  // A forbidden list load means no access to this master — show the dedicated
  // Access-denied screen instead of the table.
  if (isForbiddenError(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Outlet Types"
        description="The outlet-type master — how retailers are classified on the visit form."
        actions={
          canCreate ? (
            <Button className="cursor-pointer" onClick={openCreate}>
              <Plus /> Add Outlet Type
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="outlet types"
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
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        toolbar={
          <OutletTypeToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Store className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load outlet types" : 'No outlet types found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : canCreate
                      ? 'Add your first outlet type to get started.'
                      : 'The outlet-type master is empty.'}
              </p>
            </div>
            {!hasActiveFilters && !isError && canCreate && (
              <Button className="cursor-pointer" onClick={openCreate}>
                <Plus /> Add Outlet Type
              </Button>
            )}
          </div>
        }
      />

      {modalOpen && <OutletTypeFormDialog open editRow={editRow} onClose={closeModal} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this outlet type?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.name}</span>{' '}
              will be permanently removed. Retailers already classified under it keep
              the reference. This action cannot be undone.
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
