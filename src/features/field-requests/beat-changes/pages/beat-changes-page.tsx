import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { ArrowRight, Check, Lock, Route, UserRound, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { useCan } from '@/features/permissions'
import { BeatChangeToolbar } from '../components/beat-change-toolbar'
import { useBeatChangesList } from '../hooks/use-beat-changes-list'
import type { BeatChange } from '../types'

/** A `yyyy-MM-dd` plan date as "Tue, 04 Aug" (falls back to the raw value). */
function planDateLabel(date: string): string {
  try {
    // Parsed date-only, so `parseISO` builds a local midnight — no UTC shift.
    return format(parseISO(date), 'EEE, dd MMM yyyy')
  } catch {
    return date
  }
}

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
 * Journey Management → Beat Changes.
 *
 * The work queue for what the reps have asked to swap on a planned day. Every
 * row carries the day, the beat coming off, the beat going on and the rep's own
 * reason, because that is the whole of what the decision needs — opening the
 * plan to answer one of these would be the screen failing at its job.
 *
 * Approving MOVES THE DAY: the replacement beat takes the outgoing one's place
 * in the walk. The API re-checks every precondition at that moment, so a request
 * that has gone stale is refused with its reason rather than quietly applied.
 */
export function BeatChangesPage() {
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
    pendingApprove,
    setPendingApprove,
    pendingReject,
    setPendingReject,
    rejectReason,
    setRejectReason,
    closeReject,
    confirmApprove,
    confirmReject,
    isReviewing,
  } = useBeatChangesList()

  const { can } = useCan()
  const canApprove = can('beat-change:approve')

  const columns = useMemo<ColumnDef<BeatChange>[]>(
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
      // Dropped outright for a read-only user rather than leaving an empty
      // "Actions" header on every row.
      ...(canApprove
        ? [
            {
              id: 'actions',
              header: 'Actions',
              enableSorting: false,
              meta: { className: 'w-px whitespace-nowrap' },
              cell: ({ row }) => {
                const request = row.original
                // Only an open request can be answered; a locked day can no
                // longer be changed at all, and the API would refuse it.
                if (request.status !== 'pending') {
                  return <span className="text-sm text-muted-foreground">—</span>
                }
                if (request.dayLocked) {
                  return (
                    <Hint label="A visit has landed on this day — it can no longer be changed.">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        <Lock className="size-3.5" />
                        Day locked
                      </span>
                    </Hint>
                  )
                }
                return (
                  <div className="flex items-center gap-2">
                    <Hint label="Approve">
                      <button
                        type="button"
                        onClick={() => setPendingApprove(request)}
                        disabled={isReviewing}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 transition-colors hover:bg-emerald-600/20 disabled:opacity-50 dark:text-emerald-400"
                      >
                        <Check className="size-4" />
                      </button>
                    </Hint>
                    <Hint label="Reject">
                      <button
                        type="button"
                        onClick={() => setPendingReject(request)}
                        disabled={isReviewing}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                      >
                        <X className="size-4" />
                      </button>
                    </Hint>
                  </div>
                )
              },
            } satisfies ColumnDef<BeatChange>,
          ]
        : []),
      {
        id: 'salesIncharge',
        header: 'Sales Incharge',
        enableSorting: false,
        // Headers here are multi-word; without a floor the browser hands each
        // column its content width and breaks the label over two lines.
        meta: { className: 'min-w-56 whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <UserRound className="size-4.5" />
            </span>
            <p className="font-medium text-foreground">
              {/* Null once the rep has been removed — the request outlives him. */}
              {row.original.salesInchargeName ?? 'Removed sales incharge'}
            </p>
          </div>
        ),
      },
      {
        id: 'planDate',
        header: 'Day being changed',
        enableSorting: false,
        meta: { className: 'min-w-48 whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground tabular-nums">
              {planDateLabel(row.original.planDate)}
            </span>
            {row.original.dayLocked ? (
              <Hint label="A visit has landed on this day — it can no longer be changed.">
                <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Lock className="size-3.5" />
                </span>
              </Hint>
            ) : null}
          </div>
        ),
      },
      {
        id: 'change',
        header: 'Beat change',
        enableSorting: false,
        // Two beat chips and an arrow — the widest thing on the row.
        meta: { className: 'min-w-96 whitespace-nowrap' },
        cell: ({ row }) => {
          const { fromBeatName, fromBeatId, toBeatName, toBeatId } = row.original
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 font-medium text-rose-600 dark:text-rose-400">
                <Route className="size-3.5 shrink-0" />
                <span className="max-w-48 truncate">
                  {fromBeatName ?? `Beat #${fromBeatId}`}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">
                <Route className="size-3.5 shrink-0" />
                <span className="max-w-48 truncate">
                  {toBeatName ?? `Beat #${toBeatId}`}
                </span>
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'reason',
        header: "Rep's reason",
        enableSorting: false,
        meta: { className: 'min-w-72 whitespace-nowrap' },
        cell: ({ row }) => (
          <Hint label={row.original.reason}>
            <p className="max-w-80 truncate text-sm text-muted-foreground">
              {row.original.reason}
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
          const { status, rejectionReason, reviewedAt } = row.original
          const badge = <StatusBadge status={status} />
          // The refusal note is the whole point of a rejection — surface it on
          // the badge rather than making the admin remember what they wrote.
          if (status === 'rejected' && rejectionReason) {
            return <Hint label={rejectionReason}>{badge}</Hint>
          }
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
        title="Beat Changes"
        description="What the reps have asked to swap on a planned day. Approving moves the day — the new beat takes the old one's place in the walk."
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        itemName="beat change requests"
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
          <BeatChangeToolbar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            refresh={refresh}
          />
        }
        emptyState={
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Route className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                {isError ? "Couldn't load beat change requests" : 'Nothing to answer'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'Something went wrong. Please try again.'
                  : hasActiveFilters
                    ? 'Try adjusting your filters.'
                    : 'No beat change requests are waiting on you.'}
              </p>
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={pendingApprove !== null}
        onOpenChange={(open) => !open && setPendingApprove(null)}
        icon={Check}
        title="Approve this beat change?"
        description={
          pendingApprove ? (
            <>
              <span className="font-medium text-foreground">
                {pendingApprove.toBeatName ?? `Beat #${pendingApprove.toBeatId}`}
              </span>{' '}
              will take the place of{' '}
              <span className="font-medium text-foreground">
                {pendingApprove.fromBeatName ?? `Beat #${pendingApprove.fromBeatId}`}
              </span>{' '}
              on {planDateLabel(pendingApprove.planDate)}. The old beat's planned stops
              go with it.
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
        title="Reject this beat change?"
        description={
          pendingReject ? (
            <>
              The day stays on{' '}
              <span className="font-medium text-foreground">
                {pendingReject.fromBeatName ?? `Beat #${pendingReject.fromBeatId}`}
              </span>
              . Your reason is what the rep reads back in the app.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={isReviewing}
        confirmDisabled={rejectReason.trim() === ''}
        keepOpenOnConfirm
        onConfirm={confirmReject}
      >
        <div className="text-left">
          <label
            htmlFor="beat-change-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="beat-change-reject-reason"
            autoFocus
            maxLength={1000}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why can't this beat be swapped?"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
