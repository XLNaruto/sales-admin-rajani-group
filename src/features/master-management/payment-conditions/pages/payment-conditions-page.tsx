import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { HandCoins, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { PaymentConditionFormDialog } from '../components/payment-condition-form-dialog'
import { PaymentConditionToolbar } from '../components/payment-condition-toolbar'
import { usePaymentConditionsList } from '../hooks/use-payment-conditions-list'
import type { PaymentCondition } from '../types'

/** Payment Condition master — the list screen under Master Management. */
export function PaymentConditionsPage() {
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
  } = usePaymentConditionsList()

  // The API grants `payment-condition:create|update|delete` but no `:list`
  // key — reading the master is open to any authenticated user, so only the
  // write actions are gated.
  const { can } = useCan()
  const canUpdate = can('payment-condition:update')
  const canDelete = can('payment-condition:delete')
  const canCreate = can('payment-condition:create')

  const columns = useMemo<ColumnDef<PaymentCondition>[]>(
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
            } satisfies ColumnDef<PaymentCondition>,
          ]
        : []),
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Payment Condition" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <HandCoins className="size-4.5" />
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
        title="Payment Conditions"
        description="The payment-condition master — the terms distributors are onboarded with."
        actions={
          canCreate ? (
            <Button className="cursor-pointer" onClick={openCreate}>
              <Plus /> Add Payment Condition
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="payment conditions"
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
          <PaymentConditionToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <HandCoins className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError
                  ? "Couldn't load payment conditions"
                  : 'No payment conditions found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : canCreate
                      ? 'Add your first payment condition to get started.'
                      : 'The payment-condition master is empty.'}
              </p>
            </div>
            {!hasActiveFilters && !isError && canCreate && (
              <Button className="cursor-pointer" onClick={openCreate}>
                <Plus /> Add Payment Condition
              </Button>
            )}
          </div>
        }
      />

      {modalOpen && (
        <PaymentConditionFormDialog open editRow={editRow} onClose={closeModal} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Trash2}
        title="Delete this payment condition?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.name}</span>{' '}
              will be permanently removed. It can't be deleted while a distributor still
              trades on it. This action cannot be undone.
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
