import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Check, Eye, SquarePen, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { RetailerEditOutlet, RetailerEditRequester } from '../components/retailer-edit-cells'
import { RetailerEditRequestDetailDialog } from '../components/retailer-edit-request-detail-dialog'
import { RetailerEditRequestToolbar } from '../components/retailer-edit-request-toolbar'
import { ReasonBox } from '../../components/reason-box'
import { REVIEW_REASON_MAX } from '../schemas'
import { useRetailerEditRequestsList } from '../hooks/use-retailer-edit-requests-list'
import { rejectReasonError } from '../lib/review-error'
import type { RetailerEditRequest } from '../types'

/** An ISO-8601 timestamp as "25 Jun, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM, hh:mm a')
  } catch {
    return iso
  }
}

/**
 * Field Requests → Retailer Edit Requests.
 *
 * A rep can no longer edit an APPROVED outlet directly: the change is queued
 * here. Approving applies it to the outlet; rejecting leaves the outlet as it
 * is and sends the reason back to the app.
 */
export function RetailerEditRequestsPage() {
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
    detailRow,
    setDetailRow,
    pendingApprove,
    pendingReject,
    openApprove,
    openReject,
    closeApprove,
    closeReject,
    approveNote,
    setApproveNote,
    rejectReason,
    setRejectReason,
    reasonServerError,
    confirmApprove,
    confirmReject,
    isReviewing,
  } = useRetailerEditRequestsList()

  const { can } = useCan()
  const canApprove = can('retailer-edit-request:approve')

  const columns = useMemo<ColumnDef<RetailerEditRequest>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
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
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => {
          const request = row.original
          return (
            <div className="flex items-center gap-2">
              <Hint label="Compare changes">
                <button
                  type="button"
                  onClick={() => setDetailRow(request)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
                >
                  <Eye className="size-4" />
                </button>
              </Hint>
              {canApprove && request.status === 'pending' ? (
                <>
                  <Hint label="Approve">
                    <button
                      type="button"
                      onClick={() => openApprove(request)}
                      disabled={isReviewing}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 transition-colors hover:bg-emerald-600/20 disabled:opacity-50 dark:text-emerald-400"
                    >
                      <Check className="size-4" />
                    </button>
                  </Hint>
                  <Hint label="Reject">
                    <button
                      type="button"
                      onClick={() => openReject(request)}
                      disabled={isReviewing}
                      className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                    >
                      <X className="size-4" />
                    </button>
                  </Hint>
                </>
              ) : null}
            </div>
          )
        },
      },
      {
        id: 'outlet',
        header: 'Outlet',
        enableSorting: false,
        meta: { className: 'min-w-56 whitespace-nowrap' },
        cell: ({ row }) => {
          const r = row.original
          const renamed =
            r.payload.shopName != null && r.payload.shopName.trim() !== (r.shopName ?? '').trim()
          return (
            <div>
              <RetailerEditOutlet request={r} />
              {renamed ? (
                <p className="mt-1 pl-12 text-xs text-amber-700 dark:text-amber-300">
                  → {r.payload.shopName}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: 'requester',
        header: 'Sales Incharge',
        enableSorting: false,
        meta: { className: 'min-w-64 whitespace-nowrap' },
        cell: ({ row }) => <RetailerEditRequester request={row.original} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { status, reviewReason, reviewedAt } = row.original
          const badge = <StatusBadge status={status} />
          if (reviewReason) return <Hint label={reviewReason}>{badge}</Hint>
          if (reviewedAt) return <Hint label={`Answered ${stampLabel(reviewedAt)}`}>{badge}</Hint>
          return badge
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Requested" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {stampLabel(row.original.createdAt)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApprove, isReviewing],
  )

  if (isForbiddenError(error)) return <Forbidden />

  const clientReasonError = rejectReasonError(rejectReason)
  // Only nag once the admin has typed something; the button is disabled anyway.
  const rejectError =
    reasonServerError ?? (rejectReason.length > 0 ? clientReasonError : null)

  return (
    <div>
      <PageHeader
        title="Retailer Edit Requests"
        description="Changes the sales incharge app asks to make to approved outlets. Approving applies the change to the outlet."
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="edit requests"
        maxHeight="70vh"
        pageSize={pagination.pageSize}
        pageSizeOptions={[10, 25, 50]}
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
          <RetailerEditRequestToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <SquarePen className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load edit requests" : 'Nothing to answer'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'No retailer edit requests are waiting on you.'}
              </p>
            </div>
          </div>
        }
      />

      <RetailerEditRequestDetailDialog
        request={detailRow}
        onClose={() => setDetailRow(null)}
        onApprove={openApprove}
        onReject={openReject}
        canApprove={canApprove}
      />

      <ConfirmDialog
        open={pendingApprove !== null}
        onOpenChange={(open) => !open && closeApprove()}
        icon={Check}
        title="Approve this edit?"
        description={
          pendingApprove ? (
            <>
              The requested details replace the current ones on{' '}
              <span className="font-medium text-foreground">
                {pendingApprove.shopName ?? 'this outlet'}
              </span>
              , including the full owner list. Fields the rep left empty are cleared.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isReviewing}
        keepOpenOnConfirm
        onConfirm={confirmApprove}
      >
        <ReasonBox
          id="retailer-edit-approve-note"
          label="Note (optional)"
          value={approveNote}
          onChange={setApproveNote}
          error={reasonServerError}
          placeholder="e.g. Verified on call"
          maxLength={REVIEW_REASON_MAX}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this edit?"
        description="The outlet stays as it is. Your reason is shown to the rep in the app."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isReviewing}
        confirmDisabled={clientReasonError !== null}
        keepOpenOnConfirm
        onConfirm={confirmReject}
      >
        <ReasonBox
          id="retailer-edit-reject-reason"
          label="Reason"
          required
          value={rejectReason}
          onChange={setRejectReason}
          error={rejectError}
          placeholder="e.g. Pincode does not match the shop location"
          maxLength={REVIEW_REASON_MAX}
        />
      </ConfirmDialog>
    </div>
  )
}
