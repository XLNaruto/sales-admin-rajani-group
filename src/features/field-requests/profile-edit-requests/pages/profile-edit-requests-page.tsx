import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Check, Eye, IdCard, Phone, UserPen, UserRound, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { ProfileEditRequestDetailDialog } from '../components/profile-edit-request-detail-dialog'
import { ProfileEditRequestToolbar } from '../components/profile-edit-request-toolbar'
import { useProfileEditRequestsList } from '../hooks/use-profile-edit-requests-list'
import type { ProfileEditRequest } from '../types'

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
 * Field Requests → Profile Edit Requests.
 *
 * What the reps want changed on their own records, and why. A row names the
 * rep, his phone and employee code, and his message, which is enough to answer
 * without opening the Sales Incharge Master.
 *
 * Approving does NOT rewrite the profile — the ask is prose, so there is
 * nothing to apply. It records that the change will be made; the correction
 * itself goes through the Sales Incharge Master, which is what leaves it in the
 * change log under the row that actually changed. Either answer also frees the
 * rep to raise his next request: he may hold only one open at a time.
 */
export function ProfileEditRequestsPage() {
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
    reviewNote,
    setReviewNote,
    closeApprove,
    closeReject,
    confirmApprove,
    confirmReject,
    isReviewing,
  } = useProfileEditRequestsList()

  const { can } = useCan()
  const canApprove = can('profile-edit-request:approve')

  const columns = useMemo<ColumnDef<ProfileEditRequest>[]>(
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
              <Hint label="View request">
                <button
                  type="button"
                  onClick={() => setDetailRow(request)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-blue-600/10 text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400"
                >
                  <Eye className="size-4" />
                </button>
              </Hint>
              {/* Only an open request can be answered — the API refuses a
                  second answer with a 409. */}
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
        id: 'salesIncharge',
        header: 'Sales Incharge',
        enableSorting: false,
        // Headers here are multi-word; without a floor the browser hands each
        // column its content width and breaks the label over two lines.
        meta: { className: 'min-w-64 whitespace-nowrap' },
        cell: ({ row }) => {
          const { salesInchargeName, employeeCode, salesInchargePhone } = row.original
          return (
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <UserRound className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {/* Null once the rep has been removed — the request outlives him. */}
                  {salesInchargeName ?? 'Removed sales incharge'}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  {employeeCode ? (
                    <span className="inline-flex items-center gap-1">
                      <IdCard className="size-3.5" />#{employeeCode}
                    </span>
                  ) : null}
                  {salesInchargePhone ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Phone className="size-3.5" />
                      {salesInchargePhone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'message',
        header: 'What he asked for',
        enableSorting: false,
        // The widest thing on the row — the ask is the point of the screen.
        meta: { className: 'min-w-96 whitespace-nowrap' },
        cell: ({ row }) => (
          <Hint label={row.original.message}>
            <p className="max-w-120 truncate text-sm text-muted-foreground">
              {row.original.message}
            </p>
          </Hint>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const { status, reviewReason, reviewedAt } = row.original
          const badge = <StatusBadge status={status} />
          // The note is the whole point of a rejection — surface it on the
          // badge rather than making the admin remember what they wrote.
          if (reviewReason) return <Hint label={reviewReason}>{badge}</Hint>
          if (reviewedAt) {
            return <Hint label={`Answered ${stampLabel(reviewedAt)}`}>{badge}</Hint>
          }
          return badge
        },
      },
      {
        accessorKey: 'requestedAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Requested" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {stampLabel(row.original.requestedAt)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApprove, isReviewing],
  )

  // A forbidden list load means no access to this queue — show the dedicated
  // Access-denied screen instead of the table.
  if (isForbiddenError(error)) return <Forbidden />

  return (
    <div>
      <PageHeader
        title="Profile Edit Requests"
        description="What the reps want changed on their own records. Approving records the intent — make the correction on the sales incharge itself."
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="profile edit requests"
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
          <ProfileEditRequestToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <UserPen className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load profile edit requests" : 'Nothing to answer'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'No profile edit requests are waiting on you.'}
              </p>
            </div>
          </div>
        }
      />

      <ProfileEditRequestDetailDialog
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
        title="Approve this request?"
        description={
          pendingApprove ? (
            <>
              This records that you'll make the change —{' '}
              <span className="font-medium text-foreground">
                {pendingApprove.salesInchargeName ?? 'the rep'}
              </span>
              's record is not edited for you. It also frees him to raise his next
              request.
            </>
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={isReviewing}
        keepOpenOnConfirm
        onConfirm={confirmApprove}
      >
        <div className="text-left">
          <label
            htmlFor="profile-edit-approve-note"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Note back to the rep{' '}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="profile-edit-approve-note"
            autoFocus
            maxLength={1000}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="e.g. Done — corrected on the 3rd."
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingReject !== null}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this request?"
        description="Your reason is what the rep reads back in the app, so a bare refusal leaves him nothing to act on."
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isReviewing}
        confirmDisabled={reviewNote.trim() === ''}
        keepOpenOnConfirm
        onConfirm={confirmReject}
      >
        <div className="text-left">
          <label
            htmlFor="profile-edit-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="profile-edit-reject-reason"
            autoFocus
            maxLength={1000}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Why are you refusing this change?"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
