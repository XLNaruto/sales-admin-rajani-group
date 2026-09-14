import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Check, Lock, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isConflictError } from '@/lib/api-error'
import { toastApiError } from '@/lib/api-toast'
import { useCan } from '@/features/permissions'
import { useMarkReadOnArrival } from '@/features/notifications'
import { RequestDetailError } from '../../components/request-detail-error'
import { DayDiff } from '../components/day-change-diff'
import { useDayChange, useReviewDayChange } from '../api/use-day-changes'

/** A `yyyy-MM-dd` plan date as "Tue, 04 Aug 2026". */
function planDateLabel(date: string): string {
  try {
    // Parsed date-only, so `parseISO` builds a local midnight — no UTC shift.
    return format(parseISO(date), 'EEE, dd MMM yyyy')
  } catch {
    return date
  }
}

/** An ISO-8601 timestamp as "25 Jun 2026, 03:10 AM". */
function stampLabel(iso: string | null): string {
  if (!iso) return 'N/A'
  try {
    return format(parseISO(iso), 'd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

interface Props {
  id: number
  /** Set when a push brought the admin straight here — see `useMarkReadOnArrival`. */
  notificationId?: number
}

/**
 * One day change request, opened by id — the deep-link target behind a
 * notification.
 *
 * The by-id read carries `current_entries` as well as `entries`, and both are
 * rendered: a screen showing only the proposal asks the admin to approve a
 * replacement without showing what is being replaced.
 */
export function DayChangeDetailPage({ id, notificationId }: Props) {
  useMarkReadOnArrival(notificationId)

  const { data: request, isLoading, isError, error, refetch } = useDayChange(id)
  const { can } = useCan()
  const canApprove = can('day-change:approve')
  const review = useReviewDayChange()

  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const closeReject = () => {
    setConfirmReject(false)
    setRejectReason('')
  }

  /** A stale proposal is refused, not applied — say so and re-read the record. */
  const onReviewError = (e: unknown, fallback: string) => {
    toastApiError(e, fallback)
    if (isConflictError(e)) void refetch()
  }

  const approve = () => {
    if (!request) return
    review.mutate(
      { id: request.id, review: { status: 'approved' } },
      {
        onSuccess: (result) => {
          const applied = result.applied
          toast.success(
            applied
              ? `Day change approved — ${applied.entriesAdded} written, ${applied.entriesRemoved} dropped, ${applied.entriesKept} kept.`
              : 'Day change approved.',
          )
          setConfirmApprove(false)
        },
        onError: (e) => onReviewError(e, "Couldn't approve the day change."),
      },
    )
  }

  const reject = () => {
    if (!request || rejectReason.trim() === '') return
    review.mutate(
      { id: request.id, review: { status: 'rejected', rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast.success('Day change rejected — the rep can read your reason in the app.')
          closeReject()
        },
        onError: (e) => onReviewError(e, "Couldn't reject the day change."),
      },
    )
  }

  const back = (
    <Link to="/requests/day-changes" className={buttonVariants({ variant: 'outline' })}>
      <ArrowLeft /> All day changes
    </Link>
  )

  if (isError) {
    return (
      <div>
        <PageHeader title="Day change request" actions={back} />
        <RequestDetailError
          error={error}
          entityType="day_change"
          entityId={id}
          label="day change request"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const replaces = request?.operation === 'update'
  const isPending = request?.status === 'pending'

  return (
    <div>
      <PageHeader
        title="Day change request"
        description={
          replaces
            ? "What the rep wants to do INSTEAD of the day he was given. Nothing has been written yet — approving is the only thing that changes it."
            : "What the rep wants to do IN ADDITION to the day he was given. Nothing already on the date is touched."
        }
        actions={back}
      />

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {isLoading || !request ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {/* Null once the rep has been removed — the request outlives him. */}
                    {request.salesInchargeName ?? 'Removed sales incharge'}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{planDateLabel(request.date)}</span>
                    {request.dayLocked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3" /> a visit has landed
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why he is asking
              </p>
              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {request.reason}
              </p>
            </div>

            <DayDiff request={request} replaces={replaces} />

            {request.dayLocked ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                A visit has already landed on this day. That is not a refusal — the
                entries he has visited against are kept whichever way you answer, and
                only the un-worked part of the day can move.
              </p>
            ) : null}

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requested
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {stampLabel(request.requestedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answered
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {stampLabel(request.reviewedAt)}
                </dd>
              </div>
              {request.rejectionReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your reason
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-foreground">
                    {request.rejectionReason}
                  </dd>
                </div>
              ) : null}
            </dl>

            {canApprove && isPending ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setConfirmReject(true)}
                  disabled={review.isPending}
                >
                  <X /> Reject
                </Button>
                <Button
                  className="cursor-pointer"
                  onClick={() => setConfirmApprove(true)}
                  disabled={review.isPending}
                >
                  <Check /> Approve
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        icon={Check}
        title="Approve this day change?"
        description={
          request ? (
            replaces ? (
              <>
                The un-worked part of {planDateLabel(request.date)} is replaced by the{' '}
                {request.entries.length}{' '}
                {request.entries.length === 1 ? 'entry' : 'entries'} he proposed.
                Anything already visited against is kept.
              </>
            ) : (
              <>
                {request.entries.length}{' '}
                {request.entries.length === 1 ? 'entry is' : 'entries are'} added to{' '}
                {planDateLabel(request.date)}. Nothing already on the date is touched.
              </>
            )
          ) : undefined
        }
        confirmLabel="Yes, approve"
        cancelLabel="Cancel"
        loading={review.isPending}
        keepOpenOnConfirm
        onConfirm={approve}
      />

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => !open && closeReject()}
        variant="destructive"
        icon={X}
        title="Reject this day change?"
        description={
          request ? (
            <>
              {planDateLabel(request.date)} stays exactly as you allocated it. Your
              reason is what the rep reads back in the app.
            </>
          ) : undefined
        }
        confirmLabel="Yes, reject"
        cancelLabel="Cancel"
        loading={review.isPending}
        confirmDisabled={rejectReason.trim() === ''}
        keepOpenOnConfirm
        onConfirm={reject}
      >
        <div className="text-left">
          <label
            htmlFor="day-change-detail-reject-reason"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="day-change-detail-reject-reason"
            autoFocus
            maxLength={1000}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why can't he re-plan this day?"
            className="h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
