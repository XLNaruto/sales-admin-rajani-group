import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Check, Eye, ScanFace, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { FaceRequestDetailDialog } from '../components/face-request-detail-dialog'
import {
  FaceRequestRequester,
  FaceRequestTypeBadge,
} from '../components/face-request-requester'
import { FaceRequestToolbar } from '../components/face-request-toolbar'
import { useFaceRequestsList } from '../hooks/use-face-requests-list'
import { rejectReasonError } from '../lib/review-error'
import { REJECT_REASON_MAX } from '../schemas'
import type { FaceRequest } from '../types'

/** An ISO-8601 timestamp as "25 Jun, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM, hh:mm a')
  } catch {
    return iso
  }
}

/** How many images a bucket carries, with the edit-specific null / [] meanings. */
function bucketLabel(keys: string[] | null, type: FaceRequest['type']): string {
  if (keys === null) return type === 'edit' ? 'unchanged' : '0'
  if (keys.length === 0) return type === 'edit' ? 'cleared' : '0'
  return String(keys.length)
}

/**
 * Field Requests → Face Requests.
 *
 * A rep can no longer change his own face: adding or re-capturing one queues a
 * request here. Approving makes it live for attendance matching; rejecting
 * leaves the live face untouched and sends the reason back to the app.
 */
export function FaceRequestsPage() {
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
    rejectReason,
    setRejectReason,
    rejectServerError,
    confirmApprove,
    confirmReject,
    isReviewing,
    pendingDeleteFace,
    openDeleteFace,
    closeDeleteFace,
    confirmDeleteFace,
    isDeletingFace,
  } = useFaceRequestsList()

  const { can } = useCan()
  const canApprove = can('sales-incharge-face-request:approve')
  const canDeleteFace = can('sales-incharge-face:delete')

  const columns = useMemo<ColumnDef<FaceRequest>[]>(
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
              <Hint label="Compare faces">
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
        id: 'requester',
        header: 'Sales Incharge',
        enableSorting: false,
        meta: { className: 'min-w-64 whitespace-nowrap' },
        cell: ({ row }) => <FaceRequestRequester request={row.original} />,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => <FaceRequestTypeBadge type={row.original.type} />,
      },
      {
        id: 'images',
        header: 'Images',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { images, secondaryImages, type } = row.original
          return (
            <span className="text-sm text-muted-foreground">
              Primary {bucketLabel(images, type)} · Secondary{' '}
              {bucketLabel(secondaryImages, type)}
            </span>
          )
        },
      },
      {
        id: 'device',
        header: 'Device',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { device, model, os, appVersion } = row.original
          const name = [device, model].filter(Boolean).join(' ')
          return (
            <div className="text-sm">
              <p className="text-foreground">{name || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {[os, appVersion ? `app ${appVersion}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { status, rejectReason, reviewedAt } = row.original
          const badge = <StatusBadge status={status} />
          if (rejectReason) return <Hint label={rejectReason}>{badge}</Hint>
          if (reviewedAt) {
            return <Hint label={`Answered ${stampLabel(reviewedAt)}`}>{badge}</Hint>
          }
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
  const reasonError =
    rejectServerError ?? (rejectReason.length > 0 ? clientReasonError : null)

  return (
    <div>
      <PageHeader
        title="Face Requests"
        description="Face registrations and re-captures sent from the sales incharge app. Approving makes the face live for attendance."
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="face requests"
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
          <FaceRequestToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ScanFace className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load face requests" : 'Nothing to answer'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'No face requests are waiting on you.'}
              </p>
            </div>
          </div>
        }
      />

      <FaceRequestDetailDialog
        request={detailRow}
        onClose={() => setDetailRow(null)}
        onApprove={openApprove}
        onReject={openReject}
        canApprove={canApprove}
        onDeleteFace={openDeleteFace}
        canDeleteFace={canDeleteFace}
      />

      <ConfirmDialog
        open={pendingDeleteFace !== null}
        onOpenChange={(open) => !open && closeDeleteFace()}
        variant="destructive"
        icon={Trash2}
        title="Delete this rep's face?"
        description={
          pendingDeleteFace ? (
            <>
              The live face of{' '}
              <span className="font-medium text-foreground">
                {pendingDeleteFace.salesInchargeName ?? 'this rep'}
              </span>{' '}
              is removed, so attendance can't be matched until they register a new
              face from the app and it is approved. Past face requests are kept.
            </>
          ) : undefined
        }
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        loading={isDeletingFace}
        keepOpenOnConfirm
        onConfirm={confirmDeleteFace}
      />

      <ConfirmDialog
        open={pendingApprove !== null}
        onOpenChange={(open) => !open && closeApprove()}
        icon={Check}
        title="Approve this face?"
        description={
          pendingApprove ? (
            <>
              {pendingApprove.type === 'add'
                ? 'This registers the face for '
                : 'This replaces the live face of '}
              <span className="font-medium text-foreground">
                {pendingApprove.salesInchargeName ?? 'this rep'}
              </span>
              . Attendance punches will be matched against it from now on.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isReviewing}
        keepOpenOnConfirm
        onConfirm={confirmApprove}
      />

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this face?"
        description="The current face stays as it is. Your reason is shown to the rep in the app so they know how to re-capture."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isReviewing}
        confirmDisabled={clientReasonError !== null}
        keepOpenOnConfirm
        onConfirm={confirmReject}
      >
        <div className="text-left">
          <label
            htmlFor="face-request-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="face-request-reject-reason"
            autoFocus
            maxLength={REJECT_REASON_MAX}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Face not clearly visible, please re-capture in good light."
            aria-invalid={reasonError ? true : undefined}
            aria-describedby="face-request-reject-reason-hint"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring aria-invalid:border-destructive"
          />
          <div
            id="face-request-reject-reason-hint"
            className="mt-1 flex justify-between gap-3 text-xs"
          >
            <span className="text-destructive">{reasonError}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {rejectReason.trim().length}/{REJECT_REASON_MAX}
            </span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
